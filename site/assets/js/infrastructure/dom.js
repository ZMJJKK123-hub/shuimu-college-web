/**
 * ============================================================================
 * 模块：基础设施层 / DOM 工具（assets/js/infrastructure/dom.js）
 * 职责：封装 DOM 查询与事件绑定的横切工具（纯函数、无业务语义），
 *       供各 service 统一调用，事件绑定返回解绑函数以便服务销毁清理。
 * 依赖：无（加载顺序位于 errors.js 之后）。
 * 挂载：window.SMSK.qs / window.SMSK.qsa / window.SMSK.on
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * qs —— 查询首个匹配元素
 * 输入：sel CSS 选择器；scope 查询范围节点（默认 document）
 * 返回：HTMLElement | null
 */
function qs(sel, scope) {
  return (scope || document).querySelector(sel);
}

/**
 * qsa —— 查询全部匹配元素
 * 输入：sel CSS 选择器；scope 查询范围节点（默认 document）
 * 返回：Element[]（转为真实数组，便于 length 判断与 forEach 遍历）
 */
function qsa(sel, scope) {
  return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
}

/**
 * on —— 事件绑定（带解绑能力）
 * 输入：target 事件目标；type 事件名；handler 处理函数
 * 返回：解绑函数（服务 destroy 时调用以清理监听，防内存泄漏）
 */
function on(target, type, handler) {
  target.addEventListener(type, handler);
  return function () {
    target.removeEventListener(type, handler);
  };
}

window.SMSK.qs = qs;
window.SMSK.qsa = qsa;
window.SMSK.on = on;
