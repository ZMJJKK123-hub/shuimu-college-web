/**
 * ============================================================================
 * 模块：基础设施层 / 自定义异常（assets/js/infrastructure/errors.ts）
 * 职责：提供带业务语义的自定义异常，用于配置契约违反与关键 DOM 缺失的
 *       显式报错（携带上下文），杜绝静默吞错。
 * 依赖：无（加载顺序位于 site.config.ts 之后、其他 infrastructure 之前）。
 * 挂载：window.SMSK.ConfigError / window.SMSK.DomError
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/**
 * ConfigError —— 配置契约违反异常
 * 职责：配置缺失 / 类型非法 / 取值越界时抛出，message 携带字段名与实际值。
 * 属性：field（违约字段路径）、actualValue（实际读到的值，便于排障）。
 */
class ConfigError extends Error {
  public readonly field: string;
  public readonly actualValue: unknown;

  constructor(field: string, actualValue: unknown) {
    super('[ConfigError] 配置字段 "' + field + '" 非法，实际值：' +
      JSON.stringify(actualValue));
    this.name = 'ConfigError';
    this.field = field;
    this.actualValue = actualValue;
  }
}

/**
 * DomError —— 关键 DOM 节点缺失异常
 * 职责：页面关键节点（主导航/轮播根等）查询失败时抛出，携带选择器与页面标识。
 * 属性：selector（未命中的选择器）、page（所在页面 data-page 标识）。
 */
class DomError extends Error {
  public readonly selector: string;
  public readonly page: string;

  constructor(selector: string, page: string) {
    super('[DomError] 页面 "' + page + '" 未找到关键节点：' + selector);
    this.name = 'DomError';
    this.selector = selector;
    this.page = page;
  }
}

window.SMSK.ConfigError = ConfigError;
window.SMSK.DomError = DomError;
