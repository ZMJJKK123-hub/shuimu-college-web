/**
 * ============================================================================
 * 模块：基础设施层 / 统一日志器（assets/js/infrastructure/logger.js）
 * 职责：项目内唯一日志出口——级别过滤、结构化上下文、错误附堆栈；
 *       全项目禁止直接调用 console.*，一律经本工厂产出的 Logger 输出。
 * 依赖：errors.js（加载于本文件之前，提供 SMSK.ConfigError）。
 * 挂载：window.SMSK.createLogger
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * Logger —— 统一日志器契约
 * @typedef {Object} Logger
 * @property {(scope: string, msg: string, ctx?: Object): void} debug 诊断细节（生产级别下静默）
 * @property {(scope: string, msg: string, ctx?: Object): void} info  关键生命周期/业务里程碑
 * @property {(scope: string, msg: string, ctx?: Object): void} warn  可恢复异常、降级执行
 * @property {(scope: string, msg: string, err?: Error): void} error 失败与捕获异常（附上下文与堆栈）
 */

/** LEVEL_ORDER —— 日志级别权重表（数值越大优先级越高，用于级别过滤） */
var LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * createLogger —— Logger 工厂
 * 职责：按注入的最低级别产出统一日志器；所有输出带 [SMSK][级别][模块域] 前缀
 *       与结构化上下文对象（不拼接裸字符串），敏感信息一律不落日志。
 * Globals Used: 无（级别经参数注入，不读取全局配置）
 * Calls: 浏览器 console API（仅本模块允许触碰，是全站唯一出口）
 * @param {'debug'|'info'|'warn'|'error'} minLevel 生效的最低日志级别
 * @returns {Logger}
 * @throws {SMSK.ConfigError} minLevel 不在合法枚举内时
 */
function createLogger(minLevel) {
  if (!LEVEL_ORDER[minLevel]) {
    throw new SMSK.ConfigError('logLevel', minLevel);
  }

  /**
   * emit —— 内部辅助：级别过滤后统一格式化输出
   * 输入：level 本次级别；scope 模块域；msg 摘要；ctx 结构化上下文或 Error
   * 返回：无；单一职责：只做过滤与格式化转发
   */
  function emit(level, scope, msg, ctx) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) { return; }
    var prefix = '[SMSK][' + level.toUpperCase() + '][' + scope + '] ' + msg;
    if (ctx instanceof Error) {
      window.console[level](prefix, ctx, ctx.stack || '');
    } else if (ctx !== undefined && ctx !== null) {
      window.console[level](prefix, ctx);
    } else {
      window.console[level](prefix);
    }
  }

  return {
    debug: function (scope, msg, ctx) { emit('debug', scope, msg, ctx); },
    info: function (scope, msg, ctx) { emit('info', scope, msg, ctx); },
    warn: function (scope, msg, ctx) { emit('warn', scope, msg, ctx); },
    error: function (scope, msg, ctx) { emit('error', scope, msg, ctx); }
  };
}

window.SMSK.createLogger = createLogger;
