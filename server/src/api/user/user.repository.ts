/**
 * ============================================================================
 * 模块：API 板块 / 用户数据文件仓储（server/src/api/user/user.repository.ts）
 * 职责：<仓库根>/user_data/ 下 accounts.json 与 sessions.json 的读写——
 *       同板块的 user.service 只依赖本仓储的抽象接口，不直接触碰文件系统。
 *       目录与文件按需自动创建（区别于 banners.js 必须预先存在的强校验）。
 * 依赖：node:fs / node:path / @nestjs/common Logger（写操作的关键节点日志）。
 * 导出：UserFileRepository（实现）、USER_REPOSITORY（DI 令牌）、数据契约。
 * ============================================================================
 */
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/** AccountRecord —— accounts.json 单条账号（只存盐+哈希，绝不落明文密码） */
export interface AccountRecord {
  account: string;
  salt: string;
  hash: string;
  createdAt: string;
}

/** SessionRecord —— sessions.json 单条会话（expiresAt 为毫秒时间戳） */
export interface SessionRecord {
  token: string;
  account: string;
  expiresAt: number;
}

/**
 * UserFileRepository —— user_data/ 文件仓储实现
 * 类职责：账号/会话记录与 JSON 文件两种形态互转，读取带结构防御；
 * 类属性：userDataDir（注入的目录绝对路径）、logger（模块级统一日志）。
 * 生命周期：由 Nest DI 容器单例管理，供 user.service 调用。
 */
@Injectable()
export class UserFileRepository {
  private readonly logger = new Logger('UserFile');

  constructor(private readonly userDataDir: string) {}

  /**
   * readAccounts —— 读取全部账号
   * 返回：AccountRecord[]；文件尚不存在时返回空数组（首次注册时创建）
   * @throws Error 文件存在但 JSON 非法或结构不符时（带路径上下文）
   */
  readAccounts(): AccountRecord[] {
    const file = this._accountsFile();
    if (!fs.existsSync(file)) {
      return [];
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const accounts = (parsed as { accounts?: unknown }).accounts;
    if (!Array.isArray(accounts)) {
      throw new Error(`accounts.json 结构非法（accounts 不是数组）: ${file}`);
    }
    return accounts as AccountRecord[];
  }

  /** writeAccounts —— 原子写回全部账号 */
  writeAccounts(accounts: AccountRecord[]): void {
    this._atomicWrite(this._accountsFile(), JSON.stringify({ accounts }, null, 2) + '\n');
    this.logger.log(`已写回用户账号 ${accounts.length} 条`);
  }

  /**
   * readSessions —— 读取全部会话
   * 返回：SessionRecord[]；文件尚不存在时返回空数组
   * @throws Error 文件存在但 JSON 非法或结构不符时（带路径上下文）
   */
  readSessions(): SessionRecord[] {
    const file = this._sessionsFile();
    if (!fs.existsSync(file)) {
      return [];
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const sessions = (parsed as { sessions?: unknown }).sessions;
    if (!Array.isArray(sessions)) {
      throw new Error(`sessions.json 结构非法（sessions 不是数组）: ${file}`);
    }
    return sessions as SessionRecord[];
  }

  /** writeSessions —— 原子写回全部会话 */
  writeSessions(sessions: SessionRecord[]): void {
    this._atomicWrite(this._sessionsFile(), JSON.stringify({ sessions }, null, 2) + '\n');
  }

  private _accountsFile(): string {
    return path.join(this.userDataDir, 'accounts.json');
  }

  private _sessionsFile(): string {
    return path.join(this.userDataDir, 'sessions.json');
  }

  /**
   * _atomicWrite —— 确保数据目录存在后原子写（先写临时文件再改名，避免写坏已有数据文件）
   */
  private _atomicWrite(file: string, content: string): void {
    fs.mkdirSync(this.userDataDir, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, file);
  }
}

/** USER_REPOSITORY —— 仓储抽象的 DI 令牌（service 依赖此令牌而非实现） */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
