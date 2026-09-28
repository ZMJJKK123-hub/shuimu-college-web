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
  ConflictException, Inject, Injectable, Logger, UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { AccountRecord, SessionRecord, USER_REPOSITORY } from './user.repository';

/** SESSION_TTL_MS —— 会话有效期（7 天） */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** TOKEN_PREFIX —— 用户令牌前缀（管理员令牌为 "a."；前缀不符的令牌直接判无效） */
const TOKEN_PREFIX = 'u.';

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
    },
  ) {}

  /**
   * signup —— 注册
   * 流程：查重 → 加盐哈希落盘 → 自动登录（签发令牌）
   * @throws ConflictException 账号已被注册
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
