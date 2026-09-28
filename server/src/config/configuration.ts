/**
 * ============================================================================
 * 模块：配置层（server/src/config/configuration.ts）
 * 职责：后端唯一配置源——从环境变量读取并校验（零硬编码：端口、数据文件
 *       路径、跨域白名单均经此注入，业务代码禁止出现字面量配置）。
 * 依赖：node:path / node:fs（解析默认路径与存在性检查）。
 * 导出：ServerConfig 接口、loadConfig 工厂。
 * ============================================================================
 */
import * as path from 'path';
import * as fs from 'fs';

/** ServerConfig —— 后端配置契约（环境变量 → 强类型） */
export interface ServerConfig {
  /** HTTP 监听端口（env PORT，默认 3000） */
  port: number;
  /** 轮播数据文件绝对路径（env BANNERS_FILE，默认 <仓库根>/site/index/data/banners.js） */
  bannersFile: string;
  /** 允许跨域调用的来源（env CORS_ORIGINS 逗号分隔，默认本机静态服务） */
  corsOrigins: string[];
}

/**
 * defaultBannersFile —— 计算数据文件默认路径
 * 输入：无（基于本文件位置；src 与 dist 下深度一致，两者均指向仓库根）
 * 返回：<仓库根>/site/index/data/banners.js 绝对路径
 */
function defaultBannersFile(): string {
  return path.resolve(__dirname, '../../../site/index/data/banners.js');
}

/**
 * loadConfig —— 读取并校验配置
 * 职责：环境变量优先、缺省值兜底；端口/路径非法时抛带上下文的异常（不静默）
 * Globals Used: process.env（运行环境注入）
 * 返回：ServerConfig
 * @throws Error 端口非数字或数据文件不存在时
 */
export function loadConfig(): ServerConfig {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`[ConfigError] PORT 非法: ${process.env.PORT}`);
  }
  const bannersFile = process.env.BANNERS_FILE
    ? path.resolve(process.env.BANNERS_FILE)
    : defaultBannersFile();
  if (!fs.existsSync(bannersFile)) {
    throw new Error(`[ConfigError] 轮播数据文件不存在: ${bannersFile}`);
  }
  const corsOrigins = (process.env.CORS_ORIGINS ||
    'http://localhost:8123,http://localhost:8080,http://127.0.0.1:8123')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return { port, bannersFile, corsOrigins };
}
