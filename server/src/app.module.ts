/**
 * ============================================================================
 * 模块：根模块（server/src/app.module.ts）
 * 职责：装配应用——导入全局配置模块（提供 'APP_CONFIG'）并挂载业务模块。
 * 依赖：@nestjs/common；config/config.module；modules/banners。
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { BannersModule } from './modules/banners/banners.module';

/** AppModule —— 应用根模块：配置注入点 + 业务模块注册表 */
@Module({
  imports: [ConfigModule, BannersModule],
})
export class AppModule {}
