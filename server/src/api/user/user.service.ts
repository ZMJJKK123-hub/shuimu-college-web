/**
 * ============================================================================
 * 模块：API 板块 / 用户服务（server/src/api/user/user.service.ts）
 * 职责：普通用户的注册/登录/登出/会话解析业务——密码加盐哈希（Node 内置
 *       crypto scrypt，零第三方依赖）、令牌签发与校验（"u." 前缀，7 天有效）。
 *       注意：与 administrator 板块的核心类完全独立实现、会话分文件存储，
 *       用户令牌在管理员接口上永远无效（从结构上杜绝提权）。
 * 依赖：@nestjs/common（异常与日志）；node:crypto；USER_REPOSITORY 仓储令牌。
 * ============================================================================
 */
import {
  BadRequestException, ConflictException, Inject, Injectable, Logger,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { AccountRecord, SessionRecord, UserProfile, USER_REPOSITORY } from './user.repository';

/** SESSION_TTL_MS —— 会话有效期（7 天） */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** TOKEN_PREFIX —— 用户令牌前缀（管理员令牌为 "a."；前缀不符的令牌直接判无效） */
const TOKEN_PREFIX = 'u.';

/** AVATAR_MAX_BYTES —— 头像解码后大小上限（1MB；裁剪输出 256×256 PNG 通常远小于此） */
const AVATAR_MAX_BYTES = 1024 * 1024;

/** EMAIL_PATTERN —— 资料邮箱格式（空串放行=清空，非空须合法） */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UserService —— 普通用户业务服务
 * 类职责：注册查重与落盘、口令常数时间比对、会话签发/解析/注销；
 * 类属性：logger（模块级统一日志）、repository（仓储抽象）。
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: {
      readAccounts(): AccountRecord[];
      writeAccounts(accounts: AccountRecord[]): void;
      readSessions(): SessionRecord[];
      writeSessions(sessions: SessionRecord[]): void;
      readAvatar(account: string): { data: Buffer; mime: string } | null;
      writeAvatar(account: string, data: Buffer, ext: 'png' | 'jpg'): void;
      ensureUserDir(account: string): string;
      readProfile(account: string): UserProfile | null;
      writeProfile(account: string, profile: UserProfile): void;
    },
  ) {}

  /**
   * signup —— 注册
   * 流程：查重 → 加盐哈希落盘 → 创建用户专属目录 → 自动登录（签发令牌）
   * @throws ConflictException 账号已被注册（重名拦截）
   */
  signup(account: string, password: string): { saved: boolean; token: string; account: string } {
    const accounts = this.repository.readAccounts();
    if (accounts.some((a) => a.account === account)) {
      throw new ConflictException(`账号已被注册: ${account}`);
    }
    const salt = this._newSalt();
    this.repository.writeAccounts([
      ...accounts,
      { account, salt, hash: this._hashPassword(password, salt), createdAt: new Date().toISOString() },
    ]);
    this.repository.ensureUserDir(account);
    this.logger.log(`新用户注册: ${account}`);
    return { saved: true, token: this._openSession(account), account };
  }

  /**
   * signin —— 登录
   * 说明：账号不存在与密码错误返回同一提示（不泄露注册情况）
   * @throws UnauthorizedException 账号或密码错误
   */
  signin(account: string, password: string): { success: boolean; token: string; account: string } {
    const record = this.repository.readAccounts().find((a) => a.account === account);
    if (!record || !this._verifyPassword(password, record.salt, record.hash)) {
      throw new UnauthorizedException('账号或密码错误');
    }
    this.logger.log(`用户登录: ${account}`);
    return { success: true, token: this._openSession(account), account };
  }

  /** signout —— 登出（删除对应会话，令牌即刻失效） */
  signout(token: string): { success: boolean } {
    this.repository.writeSessions(
      this.repository.readSessions().filter((s) => s.token !== token),
    );
    return { success: true };
  }

  /**
   * requireSession —— 解析令牌得到当前账号
   * @throws UnauthorizedException 令牌缺失/前缀不符/未登记/已过期（供 GET /api/user/me）
   */
  requireSession(token: string): { account: string } {
    const account = this._accountOfValidToken(token);
    if (!account) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    return { account };
  }

  /**
   * getAvatar —— 读取当前用户头像（仅本人，凭令牌）
   * @throws UnauthorizedException 令牌无效；NotFoundException 尚未设置头像
   */
  getAvatar(token: string): { data: Buffer; mime: string } {
    const { account } = this.requireSession(token);
    const avatar = this.repository.readAvatar(account);
    if (!avatar) {
      throw new NotFoundException('尚未设置头像');
    }
    return avatar;
  }

  /**
   * saveAvatar —— 保存当前用户头像（base64 → 格式/大小校验 → 落盘）
   * 格式契约：仅 PNG / JPG(JPEG)（魔数校验，杜绝伪造扩展名）；解码后 ≤ 1MB
   * @throws UnauthorizedException 令牌无效；BadRequestException 格式或大小非法
   */
  saveAvatar(token: string, imageBase64: string): { saved: boolean } {
    const { account } = this.requireSession(token);
    const data = Buffer.from(imageBase64, 'base64');
    if (data.length === 0 || data.length > AVATAR_MAX_BYTES) {
      throw new BadRequestException('头像图片解码后须在 1MB 以内');
    }
    const isPng = data.length > 8 &&
      data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
    const isJpeg = data.length > 3 &&
      data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    if (!isPng && !isJpeg) {
      throw new BadRequestException('仅支持 JPG/JPEG/PNG 格式的图片');
    }
    this.repository.writeAvatar(account, data, isPng ? 'png' : 'jpg');
    this.logger.log(`用户头像已更新: ${account}（${data.length}B）`);
    return { saved: true };
  }

  /**
   * getProfile —— 读取当前用户资料（仅本人，凭令牌）
   * 返回：profile 为 null 表示尚未填写（前端按空表单处理）
   * @throws UnauthorizedException 令牌无效
   */
  getProfile(token: string): { account: string; profile: UserProfile | null } {
    const { account } = this.requireSession(token);
    return { account, profile: this.repository.readProfile(account) };
  }

  /**
   * saveProfile —— 保存当前用户资料（DTO 已限长度；邮箱格式在本层校验，空串=清空放行）
   * @throws UnauthorizedException 令牌无效；BadRequestException 邮箱格式非法
   */
  saveProfile(token: string, raw: { name?: string; email?: string; studentId?: string; bio?: string }): { saved: boolean } {
    const { account } = this.requireSession(token);
    const profile: UserProfile = {
      name: raw.name || '',
      email: raw.email || '',
      studentId: raw.studentId || '',
      bio: raw.bio || '',
      updatedAt: new Date().toISOString(),
    };
    if (profile.email && !EMAIL_PATTERN.test(profile.email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
    this.repository.writeProfile(account, profile);
    this.logger.log(`用户资料已更新: ${account}`);
    return { saved: true };
  }

  /** _openSession —— 清理过期会话后登记新会话并返回令牌 */
  private _openSession(account: string): string {
    const now = Date.now();
    const sessions = this.repository.readSessions().filter((s) => s.expiresAt > now);
    const token = TOKEN_PREFIX + randomBytes(32).toString('hex');
    sessions.push({ token, account, expiresAt: now + SESSION_TTL_MS });
    this.repository.writeSessions(sessions);
    return token;
  }

  /** _accountOfValidToken —— 令牌→账号（前缀不符/未登记/已过期均返回 null） */
  private _accountOfValidToken(token: string): string | null {
    if (!token.startsWith(TOKEN_PREFIX)) {
      return null;
    }
    const hit = this.repository.readSessions().find((s) => s.token === token);
    if (!hit || hit.expiresAt <= Date.now()) {
      return null;
    }
    return hit.account;
  }

  /** _hashPassword —— scrypt 加盐哈希（64 字节，hex 落盘） */
  private _hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, 64).toString('hex');
  }

  /** _verifyPassword —— 常数时间比对（长度不等直接 false，避免 timingSafeEqual 抛错） */
  private _verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const actual = Buffer.from(this._hashPassword(password, salt), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  /** _newSalt —— 每账号独立盐（16 字节 hex） */
  private _newSalt(): string {
    return randomBytes(16).toString('hex');
  }
}
