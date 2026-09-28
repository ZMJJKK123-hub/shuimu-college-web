/**
 * ============================================================================
 * 模块：API 板块 / 管理员控制器（server/src/api/administrator/administrator.controller.ts）
 * 职责：/api/administrator 的路由分发与 DTO 入参接收——仅做协议转换，
 *       业务规则全部下沉 administrator.service（禁止在控制器写业务）。
 * 依赖：administrator.service / administrator.dto（均在本板块目录内）。
 * ============================================================================
 */
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AdministratorService } from './administrator.service';
import { AdministratorSigninDto, AdministratorSignoutDto } from './administrator.dto';

/**
 * AdministratorController —— 管理员账号接口
 * 路由：POST /api/administrator/signin；POST /api/administrator/signout；
 *       GET /api/administrator/me?token=（会话校验，供 site/admin 管理页门槛）
 */
@Controller('api/administrator')
export class AdministratorController {
  constructor(private readonly administratorService: AdministratorService) {}

  /** POST /api/administrator/signin —— 登录成功返回管理员令牌与账号 */
  @Post('signin')
  signin(@Body() dto: AdministratorSigninDto): { success: boolean; token: string; account: string } {
    return this.administratorService.signin(dto.account, dto.password);
  }

  /** POST /api/administrator/signout —— 登出（删除会话） */
  @Post('signout')
  signout(@Body() dto: AdministratorSignoutDto): { success: boolean } {
    return this.administratorService.signout(dto.token);
  }

  /** GET /api/administrator/me —— 管理员令牌有效性校验（供管理页登录门槛） */
  @Get('me')
  me(@Query('token') token?: string): { account: string } {
    return this.administratorService.requireSession(token || '');
  }
}
