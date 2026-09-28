/**
 * ============================================================================
 * 模块：API 板块 / 轮播内容 DTO（server/src/api/banners/update-banners.dto.ts）
 * 职责：定义 PUT /api/banners 的入参契约（class-validator 强类型校验，
 *       与前端 site/index/data/banners.js 的四接口契约一一对应）。
 * 依赖：class-validator / class-transformer（声明式校验与嵌套转换）。
 * ============================================================================
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsOptional,
  IsString, Length, MaxLength, ValidateNested,
} from 'class-validator';

/** BannerLinkDto —— 跳转按钮契约（label 选填，href 必填） */
export class BannerLinkDto {
  @IsOptional()
  @IsString()
  @Length(1, 30)
  label?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  href!: string;
}

/** BannerSlideDto —— 单张幻灯片契约（管理员四接口） */
export class BannerSlideDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizer?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerLinkDto)
  link?: BannerLinkDto | null;
}

/** UpdateBannersDto —— 保存请求体：幻灯片数组（1~8 张） */
export class UpdateBannersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => BannerSlideDto)
  slides!: BannerSlideDto[];
}
