/**
 * ============================================================================
 * 模块：基础设施层 / DOM 工具（assets/js/infrastructure/dom.ts）
 * 职责：封装 DOM 查询与事件绑定的横切工具（纯函数、无业务语义），
 *       供各 service 统一调用，事件绑定返回解绑函数以便服务销毁清理。
 * 依赖：无（加载顺序位于 errors.ts 之后）。
 * 挂载：window.SMSK.qs / window.SMSK.qsa / window.SMSK.on
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/**
 * qs —— 查询首个匹配元素
 * 输入：sel CSS 选择器；scope 查询范围节点（默认 document）
 * 返回：泛型 T（默认 HTMLElement）| null
 */
function qs<T extends Element = HTMLElement>(sel: string, scope?: ParentNode): T | null {
  return (scope ?? document).querySelector<T>(sel);
}

/**
 * qsa —— 查询全部匹配元素
 * 输入：sel CSS 选择器；scope 查询范围节点（默认 document）
 * 返回：T[]（真实数组，便于 length 判断与 forEach 遍历）
 */
function qsa<T extends Element = HTMLElement>(sel: string, scope?: ParentNode): T[] {
  return Array.from((scope ?? document).querySelectorAll<T>(sel));
}

/**
 * on —— 事件绑定（带解绑能力，支持 passive 等监听选项）
 * 输入：target 事件目标（元素/window/MediaQueryList 等 EventTarget）；
 *       type 事件名；handler 处理函数；options 可选的监听选项
 *       （如滚动监听传 { passive: true }）
 * 返回：解绑函数（服务 destroy 时调用以清理监听，防内存泄漏）
 */
function on(
  target: EventTarget,
  type: string,
  handler: (ev: Event) => void,
  options?: boolean | AddEventListenerOptions
): Unbind {
  target.addEventListener(type, handler, options);
  return function () {
    target.removeEventListener(type, handler, options);
  };
}

window.SMSK.qs = qs;
window.SMSK.qsa = qsa;
window.SMSK.on = on;
