/**
 * ============================================================================
 * 模块：API 板块 / 轮播数据文件仓储（server/src/api/banners/banners.repository.ts）
 * 职责：site/index/data/banners.js 的读/序列化/原子写——同板块的 banners.service
 *       只依赖本仓储的抽象接口，不直接触碰文件系统。
 *       （当前为文件存储实现；阶段2 接 Prisma 时仅替换本文件，接口不变。）
 * 依赖：node:fs / @nestjs/common Logger（写操作的关键节点日志）。
 * 导出：BannersFileRepository（实现）、BANNER_SLIDES_REPOSITORY（DI 令牌）。
 * ============================================================================
 */
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/** BannerLink / BannerSlideRecord —— 数据契约（与前端 site/index/data/banners.js 一致） */
export interface BannerLink {
  label?: string;
  href: string;
}
export interface BannerSlideRecord {
  organizer?: string;
  title: string;
  description?: string;
  link?: BannerLink | null;
}

/** 写回文件的固定模板（读取端正则依赖其中的赋值行格式） */
const FILE_TEMPLATE_HEAD =
  `/**
 * 首页轮播数据（本文件由后端 /admin 管理页自动写回，请勿手工编辑格式）
 * 字段契约：organizer(选填)/title(必填)/description(选填)/link(选填)
 */
window.SMSK = window.SMSK || {};

window.SMSK.DATA_BANNERS = `;

/** 从文件内容提取 JSON 数组的正则（匹配赋值语句，容忍尾随分号/空白） */
const DATA_PATTERN = /DATA_BANNERS\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/;

/**
 * BannersFileRepository —— banners.js 文件仓储实现
 * 类职责：把"幻灯片数组"与"JS 数据文件"两种形态互转；
 * 类属性：bannersFile（注入的绝对路径）、logger（模块级统一日志）。
 * 生命周期：由 Nest DI 容器单例管理，供 banners.service 调用。
 */
@Injectable()
export class BannersFileRepository {
  private readonly logger = new Logger('BannersFile');

  constructor(private readonly bannersFile: string) {}

  /**
   * read —— 读取并解析数据文件
   * 返回：BannerSlideRecord[]；文件无数据段或 JSON 非法时抛带路径上下文的异常
   */
  read(): BannerSlideRecord[] {
    const content = fs.readFileSync(this.bannersFile, 'utf-8');
    const match = content.match(DATA_PATTERN);
    if (!match) {
      throw new Error(`banners.js 数据段解析失败（未找到 DATA_BANNERS 赋值）: ${this.bannersFile}`);
    }
    const parsed: unknown = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) {
      throw new Error(`banners.js 数据段不是数组: ${this.bannersFile}`);
    }
    return parsed as BannerSlideRecord[];
  }

  /**
   * write —— 序列化并原子写回数据文件
   * 输入：slides 已通过 DTO 校验的幻灯片数组
   * 返回：无；失败抛异常（先写临时文件再改名，避免写坏线上文件）
   */
  write(slides: BannerSlideRecord[]): void {
    const next =
      FILE_TEMPLATE_HEAD + JSON.stringify(slides, null, 2) + ';\n';
    const tmp = this.bannersFile + '.tmp';
    fs.writeFileSync(tmp, next, 'utf-8');
    fs.renameSync(tmp, this.bannersFile);
    this.logger.log(`已写回轮播数据 ${slides.length} 张 -> ${path.basename(this.bannersFile)}`);
  }
}

/** BANNER_SLIDES_REPOSITORY —— 仓储抽象的 DI 令牌（service 依赖此令牌而非实现） */
export const BANNER_SLIDES_REPOSITORY = Symbol('BANNER_SLIDES_REPOSITORY');
