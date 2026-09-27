/**
 * ============================================================================
 * 模块：横切层 / 全局统一异常过滤器（server/src/common/unified-exception.filter.ts）
 * 职责：把所有异常映射为统一响应体 { code, message, timestamp, path }，
 *       未捕获异常经 Logger.error 附堆栈落日志——杜绝静默吞错。
 * 依赖：@nestjs/common（ExceptionFilter / HttpException / Logger）。
 * ============================================================================
 */
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException,
  HttpStatus, Logger,
} from '@nestjs/common';

/** UnifiedErrorBody —— 统一错误响应体契约 */
export interface UnifiedErrorBody {
  code: number;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * UnifiedExceptionFilter —— 全局异常过滤器
 * 职责：HttpException 按其状态码映射；未知异常一律 500 并记录完整堆栈
 * 生命周期：main.ts 注册为全局过滤器，拦截全部路由
 */
@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp
      ? (exception as HttpException).message
      : '服务器内部错误';
    if (!isHttp) {
      this.logger.error(
        `未捕获异常 ${request?.method} ${request?.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    const body: UnifiedErrorBody = {
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request?.url || '',
    };
    response.status(status).json(body);
  }
}
