/**
 * ============================================================================
 * 模块：API 板块 / 轮播内容控制器（server/src/api/banners/banners.controller.ts）
 * 职责：/api/banners 的路由分发与 DTO 入参接收——仅做协议转换，
 *       业务规则全部下沉 banners.service（禁止在控制器写业务）。
 * 依赖：banners.service / update-banners.dto（均在本板块目录内）。
 * ============================================================================
 */
import { Body, Controller, Get, Put } from '@nestjs/common';
import { BannersService } from './banners.service';
import { UpdateBannersDto } from './update-banners.dto';

/**
 * BannersController —— 轮播内容接口
 * 路由：GET /api/banners（读取）；PUT /api/banners（保存，供 /admin 管理页调用）
 */
@Controller('api/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  /** GET /api/banners —— 返回当前轮播数据 { slides: [...] } */
  @Get()
  getSlides(): { slides: ReturnType<BannersService['getSlides']> } {
    return { slides: this.bannersService.getSlides() };
  }

  /** PUT /api/banners —— 校验并保存，返回归一化结果与数量 */
  @Put()
  saveSlides(@Body() dto: UpdateBannersDto): {
    saved: boolean;
    count: number;
    slides: ReturnType<BannersService['saveSlides']>;
  } {
    const slides = this.bannersService.saveSlides(dto.slides);
    return { saved: true, count: slides.length, slides };
  }
}
