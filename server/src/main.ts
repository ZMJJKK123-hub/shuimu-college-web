/**
 * ============================================================================
 * 模块：启动入口 / 组装根（server/src/main.ts）
 * 职责：创建应用 → 注册全局校验管道与统一异常过滤器 → 开启跨域
 *       （本地静态预览跨端口需要）→ 监听配置注入的端口。
 * 加载依赖：本文件是进程入口，其导入链即全部模块（app → banners → ...）。
 * Globals Used: process.env（经 config 层读取，本文件不直接触碰）。
 * ============================================================================
 */
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config/configuration';
import { UnifiedExceptionFilter } from './common/unified-exception.filter';

/**
 * bootstrap —— 应用启动入口
 * 职责：装配横切件（校验/异常/跨域）并监听；启动失败抛出（不静默退出）
 * Calls: loadConfig / NestFactory.create / UnifiedExceptionFilter
 */
async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new UnifiedExceptionFilter());
  app.enableCors({ origin: config.corsOrigins });
  await app.listen(config.port);
  new Logger('Bootstrap').log(
    `后端已启动: http://localhost:${config.port} | 轮播数据文件: ${config.bannersFile}` +
      ` | 用户数据目录: ${config.userDataDir} | 管理员数据目录: ${config.adminDataDir}`,
  );
}

bootstrap().catch((err: unknown) => {
  new Logger('Bootstrap').error(
    '启动失败',
    err instanceof Error ? err.stack : String(err),
  );
  process.exitCode = 1;
});
