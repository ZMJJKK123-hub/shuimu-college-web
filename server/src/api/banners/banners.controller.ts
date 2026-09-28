/**
 * ============================================================================
 * 模块：API 板块 / 轮播内容控制器（server/src/api/banners/banners.controller.ts）
 * 职责：/api/banners 的路由分发与 DTO 入参接收——仅做协议转换，
 *       业务规则全部下沉 banners.service（禁止在控制器写业务）。
 * 依赖：banners.service / update-banners.dto（均在本板块目录内）。
 * ============================================================================
 */
import { Body, Controller, Get, Put } from '@nestjs/common';
import { AdministratorService } from '../administrator/administrator.service';
import { BannersService } from './banners.service';
import { UpdateBannersDto } from './update-banners.dto';

/**
 * BannersController —— 轮播内容接口
 * 路由：GET /api/banners（公开读取）；PUT /api/banners（保存，需管理员令牌）
 */
@Controller('api/banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly administratorService: AdministratorService,
  ) {}

  /** GET /api/banners —— 返回当前轮播数据 { slides: [...] }（公开：首页数据本就可见） */
  @Get()
  getSlides(): { slides: ReturnType<BannersService['getSlides']> } {
    return { slides: this.bannersService.getSlides() };
  }

  /**
   * PUT /api/banners —— 先校验管理员令牌（普通用户令牌无效），再保存
   * @throws UnauthorizedException 未登录/令牌无效（统一过滤器输出 401）
   */
  @Put()
  saveSlides(@Body() dto: UpdateBannersDto): {
    saved: boolean;
    count: number;
    slides: ReturnType<BannersService['saveSlides']>;
  } {
    this.administratorService.requireValidToken(dto.token);
    const slides = this.bannersService.saveSlides(dto.slides);
    return { saved: true, count: slides.length, slides };
  }
}
