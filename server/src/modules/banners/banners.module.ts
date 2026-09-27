/**
 * ============================================================================
 * 模块：业务模块 / 轮播内容模块装配（server/src/modules/banners/banners.module.ts）
 * 职责：装配 banners 模块的控制器/服务/仓储，并把配置层的文件路径
 *       注入仓储实现（依赖倒置：service 只见抽象令牌）。
 * 依赖：@nestjs/common；配置层 'APP_CONFIG'；基础设施仓储实现。
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { ServerConfig } from '../../config/configuration';
import { BannersFileRepository, BANNER_SLIDES_REPOSITORY } from '../../infrastructure/banners-file.repository';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';

/** BannersModule —— 轮播内容模块（controller + service + 仓储绑定） */
@Module({
  controllers: [BannersController],
  providers: [
    BannersService,
    {
      provide: BANNER_SLIDES_REPOSITORY,
      useFactory: (config: ServerConfig) => new BannersFileRepository(config.bannersFile),
      inject: ['APP_CONFIG'],
    },
  ],
})
export class BannersModule {}
