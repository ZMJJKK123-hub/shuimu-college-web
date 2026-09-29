/**
 * ============================================================================
 * 模块：横切层 / 全局统一异常过滤器（server/src/common/unified-exception.filter.ts）
 * 职责：把所有异常映射为统一响应体 { code, message, timestamp, path }，
 *       未捕获异常经 Logger.error 附堆栈落日志——杜绝静默吞错。
 *       其中 HttpException 的 message 经 _readableMessage 归一化：保留 ValidationPipe
 *       的字段级中文提示（如「账号须为 4~30 位字母或数字」）而非笼统的
 *       「Bad Request Exception」，前端可原样展示给用户。
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
 * 类职责：把任意异常收敛成统一响应体——HttpException 按其状态码映射并归一化
 *         可读消息；非 HttpException（未预期故障）一律 500 并记录完整堆栈。
 * 类属性：logger（模块域 'Exceptions'，全站错误级日志出口）。
 * 生命周期：main.ts 注册为全局过滤器，拦截全部路由；实例由 Nest 单例管理，
 *           catch() 为唯一入口（每次异常一次调用，无状态累积）。
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
      ? this._readableMessage(exception as HttpException)
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

  /**
   * _readableMessage —— 内部辅助：把 HttpException 的响应载荷归一为一行可读文案
   * 单一职责：只做"响应载荷 → 字符串"的形态转换；不改状态码、不落日志、不判业务。
   * 输入：exception 已由调用方判定为 HttpException 的实例。
   * 返回：可直接展示给调用方（前端 e.message）的文案；多个字段校验失败时以「；」连接。
   * 边界与回退：
   *   1) 载荷为字符串（Nest 内置 404 等）→ 原样返回；
   *   2) 载荷为对象且 message 为字符串 → 原样返回；
   *   3) 载荷为对象且 message 为数组（ValidationPipe 形态）→ 过滤空项后连接，
   *      空数组或全非字符串 → 落回第 4 条；
   *   4) 以上均不匹配 → 回退 exception.message，保证 message 永不为空串
   *      （响应体契约 UnifiedErrorBody.message 为 string，不可为数组/null）。
   */
  private _readableMessage(exception: HttpException): string {
    const payload: unknown = exception.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload !== null && typeof payload === 'object' && 'message' in payload) {
      const raw = (payload as { message: unknown }).message;
      if (typeof raw === 'string' && raw.length > 0) {
        return raw;
      }
      if (Array.isArray(raw)) {
        const parts = raw.filter(
          (item): item is string => typeof item === 'string' && item.length > 0,
        );
        if (parts.length > 0) {
          return parts.join('；');
        }
      }
    }
    return exception.message;
  }
}
