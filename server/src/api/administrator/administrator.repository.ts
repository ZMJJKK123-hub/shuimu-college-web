/**
 * ============================================================================
 * 模块：API 板块 / 管理员数据文件仓储（server/src/api/administrator/administrator.repository.ts）
 * 职责：<仓库根>/administrator_data/ 下 accounts.json 与 sessions.json 的读写。
 *       与 user 板块的仓储完全独立实现（用户要求：两套账号体系核心类
 *       不共享，从结构上杜绝提权混用）。
 *       首次运行时若账号文件不存在，自动种子一套默认管理员（固定默认对
 *       admin/admin123456，仅哈希落盘）；之后以文件为准。
 * 依赖：node:fs / node:path / node:crypto（默认口令的加盐哈希）/ Logger。
 * 导出：AdministratorFileRepository（实现）、ADMINISTRATOR_REPOSITORY（DI 令牌）。
 * ============================================================================
 */
import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/** AdministratorRecord —— accounts.json 单条管理员账号（只存盐+哈希，绝不落明文密码） */
export interface AdministratorRecord {
  account: string;
  salt: string;
  hash: string;
  createdAt: string;
}

/** AdministratorSessionRecord —— sessions.json 单条会话（expiresAt 为毫秒时间戳） */
export interface AdministratorSessionRecord {
  token: string;
  account: string;
  expiresAt: number;
}

/** 默认管理员（固定默认对：首次运行种子到 accounts.json，建议后续更换口令） */
const DEFAULT_ADMIN_ACCOUNT = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';

/**
 * AdministratorFileRepository —— administrator_data/ 文件仓储实现
 * 类职责：管理员账号/会话记录与 JSON 文件两种形态互转，读取带结构防御，
 *         账号文件缺失时种子默认管理员；
 * 类属性：adminDataDir（注入的目录绝对路径）、logger（模块级统一日志）。
 * 生命周期：由 Nest DI 容器单例管理，供 administrator.service 调用。
 */
@Injectable()
export class AdministratorFileRepository {
  private readonly logger = new Logger('AdministratorFile');

  constructor(private readonly adminDataDir: string) {}

  /**
   * readAccounts —— 读取全部管理员账号
   * 返回：AdministratorRecord[]；文件不存在时种子默认管理员并落盘后返回
   * @throws Error 文件存在但 JSON 非法或结构不符时（带路径上下文）
   */
  readAccounts(): AdministratorRecord[] {
    const file = this._accountsFile();
    if (!fs.existsSync(file)) {
      const seeded: AdministratorRecord[] = [this._buildRecord(DEFAULT_ADMIN_ACCOUNT, DEFAULT_ADMIN_PASSWORD)];
      this.writeAccounts(seeded);
      this.logger.log(`账号文件不存在，已种子默认管理员 ${DEFAULT_ADMIN_ACCOUNT}（默认口令见 README，建议尽快更换）`);
      return seeded;
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const accounts = (parsed as { accounts?: unknown }).accounts;
    if (!Array.isArray(accounts)) {
      throw new Error(`accounts.json 结构非法（accounts 不是数组）: ${file}`);
    }
    return accounts as AdministratorRecord[];
  }

  /** writeAccounts —— 原子写回全部管理员账号 */
  writeAccounts(accounts: AdministratorRecord[]): void {
    this._atomicWrite(this._accountsFile(), JSON.stringify({ accounts }, null, 2) + '\n');
    this.logger.log(`已写回管理员账号 ${accounts.length} 条`);
  }

  /**
   * readSessions —— 读取全部管理员会话
   * 返回：AdministratorSessionRecord[]；文件尚不存在时返回空数组
   * @throws Error 文件存在但 JSON 非法或结构不符时（带路径上下文）
   */
  readSessions(): AdministratorSessionRecord[] {
    const file = this._sessionsFile();
    if (!fs.existsSync(file)) {
      return [];
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const sessions = (parsed as { sessions?: unknown }).sessions;
    if (!Array.isArray(sessions)) {
      throw new Error(`sessions.json 结构非法（sessions 不是数组）: ${file}`);
    }
    return sessions as AdministratorSessionRecord[];
  }

  /** writeSessions —— 原子写回全部管理员会话 */
  writeSessions(sessions: AdministratorSessionRecord[]): void {
    this._atomicWrite(this._sessionsFile(), JSON.stringify({ sessions }, null, 2) + '\n');
  }

  /** _buildRecord —— 账号+口令 → 带 scrypt 盐哈希的落盘记录（供种子与后续扩展使用） */
  private _buildRecord(account: string, password: string): AdministratorRecord {
    const salt = randomBytes(16).toString('hex');
    return {
      account,
      salt,
      hash: scryptSync(password, salt, 64).toString('hex'),
      createdAt: new Date().toISOString(),
    };
  }

  private _accountsFile(): string {
    return path.join(this.adminDataDir, 'accounts.json');
  }

  private _sessionsFile(): string {
    return path.join(this.adminDataDir, 'sessions.json');
  }

  /**
   * _atomicWrite —— 确保数据目录存在后原子写（先写临时文件再改名，避免写坏已有数据文件）
   */
  private _atomicWrite(file: string, content: string): void {
    fs.mkdirSync(this.adminDataDir, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, file);
  }
}

/** ADMINISTRATOR_REPOSITORY —— 仓储抽象的 DI 令牌（service 依赖此令牌而非实现） */
export const ADMINISTRATOR_REPOSITORY = Symbol('ADMINISTRATOR_REPOSITORY');
