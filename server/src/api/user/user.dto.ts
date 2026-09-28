/**
 * ============================================================================
 * 模块：API 板块 / 用户 DTO（server/src/api/user/user.dto.ts）
 * 职责：定义 /api/user 各接口的入参契约（class-validator 强类型校验）。
 *       账号仅限 4~30 位字母数字、密码 6~64 位——与前端 site/user/assets
 *       表单脚本保持同一套规则（无手机号/邮箱/微信等任何额外验证渠道）。
 * 依赖：class-validator（声明式校验）。
 * ============================================================================
 */
import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

/** ACCOUNT_PATTERN —— 账号格式契约（前后端共用规则：4~30 位字母数字） */
const ACCOUNT_PATTERN = /^[A-Za-z0-9]{4,30}$/;

/** SignupDto —— POST /api/user/signup 请求体：注册（成功即自动登录） */
export class SignupDto {
  @Matches(ACCOUNT_PATTERN, { message: '账号须为 4~30 位字母或数字' })
  account!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 64, { message: '密码长度须为 6~64 位' })
  password!: string;
}

/** SigninDto —— POST /api/user/signin 请求体：登录 */
export class SigninDto {
  @Matches(ACCOUNT_PATTERN, { message: '账号格式不正确' })
  account!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 64, { message: '密码长度须为 6~64 位' })
  password!: string;
}

/** SignoutDto —— POST /api/user/signout 请求体：登出（携令牌） */
export class SignoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;
}
