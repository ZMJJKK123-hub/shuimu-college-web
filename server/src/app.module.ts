/**
 * ============================================================================
 * 模块：根模块（server/src/app.module.ts）
 * 职责：装配应用——导入全局配置模块（提供 'APP_CONFIG'）并挂载各 API 板块模块。
 * 依赖：@nestjs/common；config/config.module；api/banners。
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { BannersModule } from './api/banners/banners.module';
import { UserModule } from './api/user/user.module';
import { AdministratorModule } from './api/administrator/administrator.module';

/** AppModule —— 应用根模块：配置注入点 + 业务模块注册表 */
@Module({
  imports: [ConfigModule, BannersModule, UserModule, AdministratorModule],
})
export class AppModule {}
