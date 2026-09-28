/**
 * ============================================================================
 * 模块：服务层 / 导航条滚动收起服务（assets/js/services/nav-collapse.service.ts）
 * 职责：监听滚动方向——下滑时将主导航平滑收起（滑入页头之后隐藏），
 *       上滑时立即平滑展开；过渡基于 transform，天然可打断，中途反向时
 *       从当前位置平滑回滑（满足"先收再伸不割裂"的交互要求）。
 *       仅桌面端生效（≤900px 时主导航是抽屉菜单，不参与收起）。
 * 依赖：errors.ts / dom.ts / logger.ts（均需先于本文件加载）。
 * 类型：NavState / NavCollapseConfig / ServiceLifecycle 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.createNavCollapseService（工厂）、
 *       window.SMSK.resolveNavState（纯函数，供自测）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/** NavCollapseRuntimeState —— 收起服务运行态（状态机/滚动锚点/节流标记） */
interface NavCollapseRuntimeState {
  current: NavState;
  lastY: number;
  rafPending: boolean;
  started: boolean;
}

/** DESKTOP_MQ —— 桌面端媒体查询（与 layout.css 的移动端断点 900px 对齐） */
const DESKTOP_MQ: MediaQueryList = window.matchMedia('(min-width: 901px)');

/**
 * resolveNavState —— 纯函数：由滚动增量推算导航目标状态
 * 输入：deltaY 本帧垂直滚动增量（正=下滑，负=上滑，0=静止）；
 *       currentState 当前状态
 * 返回：目标状态；增量为 0 时维持现状（tests/selftest.html 覆盖）
 * 单一职责：仅做方向→状态映射，不触碰 DOM
 */
function resolveNavState(deltaY: number, currentState: NavState): NavState {
  if (deltaY > 0) { return 'collapsed'; }
  if (deltaY < 0) { return 'expanded'; }
  return currentState;
}

/**
 * createNavCollapseService —— 导航收起服务工厂（契约守卫 + 委托控制器）
 * 职责：校验配置，通过后交由控制器实现滚动监听与状态切换
 * Globals Used: 无（依赖全部经参数注入）
 * Calls: _createNavCollapseController
 * @param navEl  主导航节点（.mainnav）；null 时返回空实现
 * @param config 收起配置（来自 SiteConfig.navCollapse）
 * @param logger 统一日志器
 * @throws SMSK.ConfigError config.durationMs 契约不合法时
 */
function createNavCollapseService(navEl: HTMLElement | null,
                                  config: NavCollapseConfig | null,
                                  logger: Logger): ServiceLifecycle {
  if (!config || typeof config.durationMs !== 'number' || config.durationMs <= 0) {
    throw new SMSK.ConfigError('navCollapse.durationMs', config && config.durationMs);
  }
  if (!navEl) {
    logger.warn('nav-collapse', '当前页面无主导航节点，返回空实现');
    return { start: function () {}, destroy: function () {} };
  }
  return _createNavCollapseController(navEl, config, logger);
}

/**
 * _createNavCollapseController —— 内部辅助：收起控制器（接收已校验的确定参数）
 * 职责：注入过渡时长（配置为唯一取值源）→ 监听滚动（rAF 节流）
 *       并按 resolveNavState 的结果切换 .collapsed 类
 * Calls: SMSK.on / resolveNavState
 */
function _createNavCollapseController(navEl: HTMLElement,
                                      config: NavCollapseConfig,
                                      logger: Logger): ServiceLifecycle {
  const state: NavCollapseRuntimeState =
    { current: 'expanded', lastY: 0, rafPending: false, started: false };
  const unbinds: Unbind[] = [];

  /** applyTransition —— 内部辅助：桌面端注入过渡时长；抽屉模式交还 CSS 控制
   * 单一职责：只管理 inline transition 的设置与清除
   */
  function applyTransition(): void {
    if (DESKTOP_MQ.matches) {
      navEl.style.transition = 'transform ' + config.durationMs + 'ms ease';
    } else {
      navEl.style.transition = '';
    }
  }

  /** setState —— 内部辅助：切换到目标状态（与当前不同才操作 DOM） */
  function setState(target: NavState): void {
    if (target === state.current) { return; }
    state.current = target;
    navEl.classList.toggle('collapsed', target === 'collapsed');
    logger.debug('nav-collapse', '导航状态切换', { state: target });
  }

  /** handleFrame —— 内部辅助：单帧处理——计算增量并推算目标状态
   * 抽屉模式（移动端）强制展开并跳过收起逻辑
   */
  function handleFrame(): void {
    const y = window.scrollY;
    const deltaY = y - state.lastY;
    state.lastY = y;
    if (!DESKTOP_MQ.matches) {
      setState('expanded');
      return;
    }
    setState(resolveNavState(deltaY, state.current));
  }

  return {
    /** start —— 启动监听（幂等）：注入过渡、绑定滚动（rAF 节流）与断点切换 */
    start: function (): void {
      if (state.started) { return; }
      state.started = true;
      state.lastY = window.scrollY;
      applyTransition();
      unbinds.push(SMSK.on(window, 'scroll', function () {
        if (state.rafPending) { return; }
        state.rafPending = true;
        window.requestAnimationFrame(function () {
          state.rafPending = false;
          handleFrame();
        });
      }, { passive: true }));
      unbinds.push(SMSK.on(DESKTOP_MQ, 'change', applyTransition));
      logger.info('nav-collapse', '滚动收起服务已启动',
        { durationMs: config.durationMs });
    },
    /** destroy —— 解绑监听并复位展开态（供页面卸载/测试清理） */
    destroy: function (): void {
      unbinds.forEach(function (unbind) { unbind(); });
      unbinds.length = 0;
      setState('expanded');
      navEl.style.transition = '';
      state.started = false;
      logger.info('nav-collapse', '滚动收起服务已停止');
    }
  };
}

window.SMSK.resolveNavState = resolveNavState;
window.SMSK.createNavCollapseService = createNavCollapseService;
