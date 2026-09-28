/**
 * ============================================================================
 * 模块：API 板块 / 管理员模块装配（server/src/api/administrator/administrator.module.ts）
 * 职责：装配 administrator 板块的控制器/服务/仓储，并把配置层的数据目录
 *       注入仓储实现（依赖倒置：service 只见抽象令牌）。
 *       导出 AdministratorService 供 banners 等板块做管理员令牌强校验。
 * 依赖：@nestjs/common；配置层 'APP_CONFIG'；同目录仓储实现。
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { ServerConfig } from '../../config/configuration';
import { AdministratorFileRepository, ADMINISTRATOR_REPOSITORY } from './administrator.repository';
import { AdministratorController } from './administrator.controller';
import { AdministratorService } from './administrator.service';

/** AdministratorModule —— 管理员模块（controller + service + 仓储绑定，对外导出校验服务） */
@Module({
  controllers: [AdministratorController],
  providers: [
    AdministratorService,
    {
      provide: ADMINISTRATOR_REPOSITORY,
      useFactory: (config: ServerConfig) => new AdministratorFileRepository(config.adminDataDir),
      inject: ['APP_CONFIG'],
    },
  ],
  exports: [AdministratorService],
})
export class AdministratorModule {}
