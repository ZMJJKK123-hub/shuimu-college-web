/**
 * ============================================================================
 * 模块：API 板块 / 用户控制器（server/src/api/user/user.controller.ts）
 * 职责：/api/user 的路由分发与 DTO 入参接收——仅做协议转换，
 *       业务规则全部下沉 user.service（禁止在控制器写业务）。
 * 依赖：user.service / user.dto（均在本板块目录内）。
 * ============================================================================
 */
import { Body, Controller, Get, Header, Post, Put, Query, StreamableFile } from '@nestjs/common';
import { UserService } from './user.service';
import { SigninDto, SignoutDto, SignupDto, UpdateAvatarDto } from './user.dto';

/**
 * UserController —— 普通用户账号接口
 * 路由：POST /api/user/signup（注册即登录）；POST /api/user/signin；
 *       POST /api/user/signout；GET /api/user/me?token=（会话校验）；
 *       GET /api/user/avatar?token=（本人头像图片）；PUT /api/user/avatar（更新头像）
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

  /** GET /api/user/avatar —— 返回本人头像图片字节（未设置时 404；不缓存，换头像即时生效） */
  @Get('avatar')
  @Header('Cache-Control', 'no-store')
  getAvatar(@Query('token') token?: string): StreamableFile {
    const { data, mime } = this.userService.getAvatar(token || '');
    return new StreamableFile(data, { type: mime });
  }

  /** PUT /api/user/avatar —— 更新本人头像（base64 图片，服务端校验格式与大小） */
  @Put('avatar')
  saveAvatar(@Body() dto: UpdateAvatarDto): { saved: boolean } {
    return this.userService.saveAvatar(dto.token, dto.image);
  }
}
