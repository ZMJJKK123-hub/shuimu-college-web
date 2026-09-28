/**
 * ============================================================================
 * 模块：API 板块 / 管理员 DTO（server/src/api/administrator/administrator.dto.ts）
 * 职责：定义 /api/administrator 各接口的入参契约（class-validator 强类型校验）。
 *       注意：管理员无公开注册接口（防提权），仅有登录/登出；
 *       "管理员创建管理员"为后续扩展项。
 * 依赖：class-validator（声明式校验）。
 * ============================================================================
 */
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** AdministratorSigninDto —— POST /api/administrator/signin 请求体：登录 */
export class AdministratorSigninDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  account!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  password!: string;
}

/** AdministratorSignoutDto —— POST /api/administrator/signout 请求体：登出（携令牌） */
export class AdministratorSignoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;
}
