/**
 * ============================================================================
 * 模块：API 板块 / 用户模块装配（server/src/api/user/user.module.ts）
 * 职责：装配 user 板块的控制器/服务/仓储，并把配置层的数据目录
 *       注入仓储实现（依赖倒置：service 只见抽象令牌）。
 * 依赖：@nestjs/common；配置层 'APP_CONFIG'；同目录仓储实现。
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { ServerConfig } from '../../config/configuration';
import { UserFileRepository, USER_REPOSITORY } from './user.repository';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/** UserModule —— 普通用户模块（controller + service + 仓储绑定） */
@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useFactory: (config: ServerConfig) => new UserFileRepository(config.userDataDir),
      inject: ['APP_CONFIG'],
    },
  ],
})
export class UserModule {}
