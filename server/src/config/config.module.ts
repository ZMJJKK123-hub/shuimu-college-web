/**
 * ============================================================================
 * 模块：配置层 / 全局配置模块（server/src/config/config.module.ts）
 * 职责：以全局模块形式提供 'APP_CONFIG'（ServerConfig），任何业务模块
 *       无需重复 import 即可注入——配置是横切能力。
 * 依赖：@nestjs/common；configuration.ts（loadConfig 工厂）。
 * ============================================================================
 */
import { Global, Module } from '@nestjs/common';
import { loadConfig, ServerConfig } from './configuration';

/** ConfigModule —— 全局配置模块（APP_CONFIG 唯一提供方） */
@Global()
@Module({
  providers: [
    {
      provide: 'APP_CONFIG',
      useFactory: (): ServerConfig => loadConfig(),
    },
  ],
  exports: ['APP_CONFIG'],
})
export class ConfigModule {}
