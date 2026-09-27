/**
 * ============================================================================
 * 模块：服务层 / 导航条滚动收起服务（assets/js/services/nav-collapse.service.js）
 * 职责：监听滚动方向——下滑时将主导航平滑收起（滑入页头之后隐藏），
 *       上滑时立即平滑展开；过渡基于 transform，天然可打断，中途反向时
 *       从当前位置平滑回滑（满足"先收再伸不割裂"的交互要求）。
 *       仅桌面端生效（≤900px 时主导航是抽屉菜单，不参与收起）。
 * 依赖：errors.js / dom.js / logger.js（均需先于本文件加载）。
 * 挂载：window.SMSK.createNavCollapseService（工厂）、
 *       window.SMSK.resolveNavState（纯函数，供自测）
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * NavCollapseConfig —— 收起行为配置契约
 * @typedef {Object} NavCollapseConfig
 * @property {number} durationMs 收起/展开过渡时长（毫秒），必须 > 0
 */

/** DESKTOP_MQ —— 桌面端媒体查询（与 layout.css 的移动端断点 900px 对齐） */
var DESKTOP_MQ = window.matchMedia('(min-width: 901px)');

/**
 * resolveNavState —— 纯函数：由滚动增量推算导航目标状态
 * 输入：deltaY 本帧垂直滚动增量（正=下滑，负=上滑，0=静止）；
 *       currentState 当前状态（'collapsed' | 'expanded'）
 * 返回：目标状态字符串；增量为 0 时维持现状（tests/selftest.html 覆盖）
 * 单一职责：仅做方向→状态映射，不触碰 DOM
 */
function resolveNavState(deltaY, currentState) {
  if (deltaY > 0) { return 'collapsed'; }
  if (deltaY < 0) { return 'expanded'; }
  return currentState;
}

/**
 * createNavCollapseService —— 导航收起服务工厂
 * 职责：校验配置 → 注入过渡时长（配置为唯一取值源）→ 监听滚动（rAF 节流）
 *       并按 resolveNavState 的结果切换 .collapsed 类
 * Globals Used: 无（依赖全部经参数注入；滚动读取 window.scrollY 属运行环境交互）
 * Calls: SMSK.on / resolveNavState
 * @param {HTMLElement|null} navEl 主导航节点（.mainnav）；null 时返回空实现
 * @param {NavCollapseConfig} config 收起配置（来自 SiteConfig.navCollapse）
 * @param {Logger} logger 统一日志器
 * @returns {{start: function(): void, destroy: function(): void}}
 * @throws {SMSK.ConfigError} config.durationMs 契约不合法时
 */
function createNavCollapseService(navEl, config, logger) {
  if (!config || typeof config.durationMs !== 'number' || config.durationMs <= 0) {
    throw new SMSK.ConfigError('navCollapse.durationMs', config && config.durationMs);
  }
  if (!navEl) {
    logger.warn('nav-collapse', '当前页面无主导航节点，返回空实现');
    return { start: function () {}, destroy: function () {} };
  }

  var state = { current: 'expanded', lastY: 0, rafPending: false, started: false };
  var unbinds = [];

  /** applyTransition —— 内部辅助：桌面端注入过渡时长；抽屉模式交还 CSS 控制
   * 输入：无；返回：无。单一职责：只管理 inline transition 的设置与清除
   */
  function applyTransition() {
    if (DESKTOP_MQ.matches) {
      navEl.style.transition = 'transform ' + config.durationMs + 'ms ease';
    } else {
      navEl.style.transition = '';
    }
  }

  /** setState —— 内部辅助：切换到目标状态（与当前不同才操作 DOM）
   * 输入：target 目标状态（'collapsed' | 'expanded'）
   */
  function setState(target) {
    if (target === state.current) { return; }
    state.current = target;
    navEl.classList.toggle('collapsed', target === 'collapsed');
    logger.debug('nav-collapse', '导航状态切换', { state: target });
  }

  /** handleFrame —— 内部辅助：单帧处理——计算增量并推算目标状态
   * 输入：无；返回：无。抽屉模式（移动端）强制展开并跳过收起逻辑
   */
  function handleFrame() {
    var y = window.scrollY;
    var deltaY = y - state.lastY;
    state.lastY = y;
    if (!DESKTOP_MQ.matches) {
      setState('expanded');
      return;
    }
    setState(resolveNavState(deltaY, state.current));
  }

  return {
    /** start —— 启动监听（幂等）：注入过渡、绑定滚动（rAF 节流）与断点切换 */
    start: function () {
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
    destroy: function () {
      unbinds.forEach(function (unbind) { unbind(); });
      unbinds = [];
      setState('expanded');
      navEl.style.transition = '';
      state.started = false;
      logger.info('nav-collapse', '滚动收起服务已停止');
    }
  };
}

window.SMSK.resolveNavState = resolveNavState;
window.SMSK.createNavCollapseService = createNavCollapseService;
