/**
 * ============================================================================
 * 模块：API 板块 / 管理员服务（server/src/api/administrator/administrator.service.ts）
 * 职责：管理员的登录/登出/会话解析业务，以及供其他板块调用的管理员令牌
 *       强校验入口（requireValidToken）。与 user 板块的 UserService 完全
 *       独立实现：独立哈希/令牌逻辑、独立会话文件、"a." 前缀令牌——
 *       普通用户令牌在管理员校验上永远无效（防提权）。
 * 依赖：@nestjs/common（异常与日志）；node:crypto；ADMINISTRATOR_REPOSITORY 令牌。
 * ============================================================================
 */
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import {
  AdministratorRecord, AdministratorSessionRecord, ADMINISTRATOR_REPOSITORY,
} from './administrator.repository';

/** SESSION_TTL_MS —— 管理员会话有效期（7 天） */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** TOKEN_PREFIX —— 管理员令牌前缀（普通用户令牌为 "u."；前缀不符直接判无效） */
const TOKEN_PREFIX = 'a.';

/**
 * AdministratorService —— 管理员业务服务
 * 类职责：口令常数时间比对、管理员会话签发/解析/注销、对外校验入口；
 * 类属性：logger（模块级统一日志）、repository（仓储抽象）。
 */
@Injectable()
export class AdministratorService {
  private readonly logger = new Logger('AdministratorService');

  constructor(
    @Inject(ADMINISTRATOR_REPOSITORY)
    private readonly repository: {
      readAccounts(): AdministratorRecord[];
      readSessions(): AdministratorSessionRecord[];
      writeSessions(sessions: AdministratorSessionRecord[]): void;
    },
  ) {}

  /**
   * signin —— 管理员登录
   * 说明：账号不存在与密码错误返回同一提示（不泄露信息）
   * @throws UnauthorizedException 账号或密码错误
   */
  signin(account: string, password: string): { success: boolean; token: string; account: string } {
    const record = this.repository.readAccounts().find((a) => a.account === account);
    if (!record || !this._verifyPassword(password, record.salt, record.hash)) {
      throw new UnauthorizedException('管理员账号或密码错误');
    }
    this.logger.log(`管理员登录: ${account}`);
    return { success: true, token: this._openSession(account), account };
  }

  /** signout —— 管理员登出（删除对应会话，令牌即刻失效） */
  signout(token: string): { success: boolean } {
    this.repository.writeSessions(
      this.repository.readSessions().filter((s) => s.token !== token),
    );
    return { success: true };
  }

  /**
   * requireSession —— 解析令牌得到当前管理员账号（供 GET /api/administrator/me）
   * @throws UnauthorizedException 令牌缺失/前缀不符/未登记/已过期
   */
  requireSession(token: string): { account: string } {
    const account = this._accountOfValidToken(token);
    if (!account) {
      throw new UnauthorizedException('管理员登录已失效，请重新登录');
    }
    return { account };
  }

  /**
   * requireValidToken —— 供其他板块调用的管理员令牌强校验（如 PUT /api/banners）
   * 说明：普通用户的 "u." 令牌在此永远校验失败——只查管理员会话文件
   * @throws UnauthorizedException 未提供令牌或令牌无效（非管理员会话）
   */
  requireValidToken(token?: string): { account: string } {
    const account = token ? this._accountOfValidToken(token) : null;
    if (!account) {
      throw new UnauthorizedException('需要管理员登录后才能执行此操作');
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

  /** _verifyPassword —— 常数时间比对（长度不等直接 false，避免 timingSafeEqual 抛错） */
  private _verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const actual = Buffer.from(scryptSync(password, salt, 64).toString('hex'), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
