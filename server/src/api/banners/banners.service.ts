/**
 * ============================================================================
 * 模块：API 板块 / 轮播内容服务（server/src/api/banners/banners.service.ts）
 * 职责：轮播内容的业务规则——读取、保存（经仓储持久化），并对数据做
 *       业务级校验（标题去空白、链接补协议等 DTO 覆盖不到的规则）。
 * 依赖：@nestjs/common（Logger）；BANNER_SLIDES_REPOSITORY（同目录仓储抽象）。
 * ============================================================================
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BANNER_SLIDES_REPOSITORY, BannerSlideRecord,
} from './banners.repository';

/**
 * BannersService —— 轮播内容业务服务
 * 类职责：编排"校验 → 仓储读写"，自身不触碰 fs；
 * 类属性：repository（DI 注入的仓储抽象）、logger（统一日志）。
 * 生命周期：Nest DI 单例，供 banners.controller 调用。
 */
@Injectable()
export class BannersService {
  private readonly logger = new Logger('BannersService');

  constructor(
    @Inject(BANNER_SLIDES_REPOSITORY)
    private readonly repository: {
      read(): BannerSlideRecord[];
      write(slides: BannerSlideRecord[]): void;
    },
  ) {}

  /**
   * getSlides —— 读取全部轮播数据
   * 返回：BannerSlideRecord[]（读失败异常由全局过滤器统一兜底）
   */
  getSlides(): BannerSlideRecord[] {
    return this.repository.read();
  }

  /**
   * saveSlides —— 保存轮播数据（业务规则归一化后写回）
   * 输入：slides 已过 DTO 校验的数组
   * 返回：归一化后的数组（ trimming 空串→undefined，便于 JSON 省略字段）
   */
  saveSlides(slides: BannerSlideRecord[]): BannerSlideRecord[] {
    const normalized = slides.map((s) => ({
      organizer: this.blankToUndefined(s.organizer),
      title: (s.title || '').trim(),
      description: this.blankToUndefined(s.description),
      link: s.link && s.link.href ? {
        label: this.blankToUndefined(s.link.label),
        href: s.link.href.trim(),
      } : null,
    }));
    this.repository.write(normalized);
    this.logger.log(`轮播内容已保存（${normalized.length} 张）`);
    return normalized;
  }

  /** blankToUndefined —— 内部辅助：空串/纯空白归一为 undefined
   * 输入：v 可选字符串；返回：非空白串或 undefined */
  private blankToUndefined(v?: string): string | undefined {
    const t = (v || '').trim();
    return t ? t : undefined;
  }
}
