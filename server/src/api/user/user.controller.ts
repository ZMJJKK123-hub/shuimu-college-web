/**
 * ============================================================================
 * 模块：API 板块 / 用户控制器（server/src/api/user/user.controller.ts）
 * 职责：/api/user 的路由分发与 DTO 入参接收——仅做协议转换，
 *       业务规则全部下沉 user.service（禁止在控制器写业务）。
 * 依赖：user.service / user.dto（均在本板块目录内）。
 * ============================================================================
 */
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { SigninDto, SignoutDto, SignupDto } from './user.dto';

/**
 * UserController —— 普通用户账号接口
 * 路由：POST /api/user/signup（注册即登录）；POST /api/user/signin；
 *       POST /api/user/signout；GET /api/user/me?token=（会话校验）
 */
@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** POST /api/user/signup —— 注册成功即自动登录，直接返回令牌 */
  @Post('signup')
  signup(@Body() dto: SignupDto): { saved: boolean; token: string; account: string } {
    return this.userService.signup(dto.account, dto.password);
  }

  /** POST /api/user/signin —— 登录成功返回令牌与账号 */
  @Post('signin')
  signin(@Body() dto: SigninDto): { success: boolean; token: string; account: string } {
    return this.userService.signin(dto.account, dto.password);
  }

  /** POST /api/user/signout —— 登出（删除会话） */
  @Post('signout')
  signout(@Body() dto: SignoutDto): { success: boolean } {
    return this.userService.signout(dto.token);
  }

  /** GET /api/user/me —— 令牌有效性校验（供前端页头登录态渲染） */
  @Get('me')
  me(@Query('token') token?: string): { account: string } {
    return this.userService.requireSession(token || '');
  }
}
