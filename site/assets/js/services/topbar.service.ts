/**
 * ============================================================================
 * 模块：业务行为层 / 顶部欢迎条一次性收起服务（services/topbar.service.ts）
 * 职责：顶部欢迎条（.topbar）"出现过之后被滚出视口"即永久收起——加 .gone
 *       类（高度动画到 0，样式见 common/layout.css）并解绑监听，此后无论
 *       如何上滑都不再重现（"只出现一次"，每次页面加载计一次）。
 *       状态机语义：只有本次加载中进入过视野（hasBeenVisible）的欢迎条，
 *       滚出视野才触发收起——浏览器刷新恢复滚动位置时（欢迎条在视口外、
 *       从未出现过）不判定，用户上滑仍能看到，再次滚出视野才锁定。
 * 依赖：errors.ts / dom.ts（SMSK.on 的解绑句柄）/ logger.ts（均需先于本文件加载）。
 * 类型：ServiceLifecycle 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.createTopbarService（工厂）；由 main.ts 装配启动。
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/** TOPBAR_GONE_CLASS —— 永久收起状态类名（样式见 common/layout.css 的 .topbar.gone） */
const TOPBAR_GONE_CLASS = 'gone';

/**
 * createTopbarService —— 顶部欢迎条服务工厂（契约守卫层）
 * 输入：root 欢迎条节点（.topbar）；logger 统一日志器
 * 返回：ServiceLifecycle；root 缺失时告警并返回空实现（不中断页面其余服务）
 */
function createTopbarService(
  root: HTMLElement | null,
  logger: Logger
): ServiceLifecycle {
  if (!root) {
    logger.warn('topbar', '顶部欢迎条节点缺失（.topbar），一次性收起跳过');
    return { start: function () {}, destroy: function () {} };
  }
  return _createTopbarController(root, logger);
}

/** _createTopbarController —— 内部控制器（参数已经工厂守卫，非空确定）
 * 生命周期：start 幂等（重复调用不重复绑定）；destroy 可重入（解绑滚动监听） */
function _createTopbarController(root: HTMLElement, logger: Logger): ServiceLifecycle {
  let unbindScroll: Unbind | null = null;
  let dismissed = false;
  /** hasBeenVisible —— 本次加载中欢迎条是否进入过视野（"出现过"才有资格"消失"）；
   * 初始化：装配时（DOMContentLoaded）在视野内即视为已出现（页面在顶部），
   * 在视野外（浏览器刷新恢复到页面中部）则为 false，待上滑见到过才算 */
  let hasBeenVisible = root.getBoundingClientRect().bottom > 0;

  /** isOutOfView —— 内部辅助：欢迎条底部是否已越过视口顶部（滚出视野判定） */
  function isOutOfView(): boolean {
    return root.getBoundingClientRect().bottom <= 0;
  }

  /** dismiss —— 内部辅助：永久收起（加类 + 解绑 + 置状态；幂等只执行一次） */
  function dismiss(): void {
    if (dismissed) { return; }
    dismissed = true;
    root.classList.add(TOPBAR_GONE_CLASS);
    if (unbindScroll) { unbindScroll(); unbindScroll = null; }
    logger.debug('topbar', '欢迎条已滚出视野，永久收起');
  }

  return {
    start: function (): void {
      if (unbindScroll || dismissed) { return; }
      unbindScroll = SMSK.on(window, 'scroll', function (): void {
        if (isOutOfView()) {
          // 出现过之后滚出视野 → 永久收起；从未出现过（刷新恢复的滚动位置）不判定
          if (hasBeenVisible) { dismiss(); }
        } else {
          hasBeenVisible = true;
        }
      }, { passive: true });
    },
    destroy: function (): void {
      if (unbindScroll) { unbindScroll(); unbindScroll = null; }
    }
  };
}

window.SMSK.createTopbarService = createTopbarService;
