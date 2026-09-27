/**
 * ============================================================================
 * 模块：服务层 / 首页轮播服务（assets/js/services/banner.service.js）
 * 职责：接管首页 .banner 的自动播放与指示点交互（切换 .slide.active）。
 * 依赖：errors.js / dom.js / logger.js（均需先于本文件加载）。
 * 挂载：window.SMSK.createBannerService（工厂）、window.SMSK.nextIndex（纯函数，供自测）
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * BannerConfig —— 轮播配置契约
 * @typedef {Object} BannerConfig
 * @property {number}  intervalMs 自动播放间隔（毫秒），必须 > 0
 * @property {boolean} autoplay   是否自动播放
 */

/**
 * nextIndex —— 纯函数：环形推算下一张幻灯片索引
 * 输入：current 当前索引（0 起，可为任意整数）；total 幻灯片总数
 * 返回：下一个有效索引；total <= 0 时返回 -1（边界防御，由调用方告警）
 * 单一职责：仅做索引推算，不触碰 DOM 与定时器（tests/selftest.html 覆盖）
 */
function nextIndex(current, total) {
  if (total <= 0) { return -1; }
  if (total === 1) { return 0; }
  return (current + 1) % total;
}

/**
 * _renderDots —— 内部辅助：依幻灯片数量动态生成指示点按钮
 * 输入：dotsWrap 指示点容器；total 幻灯片数量；onSelect 点选回调（入参为目标索引）
 * 返回：生成的按钮元素数组
 */
function _renderDots(dotsWrap, total, onSelect) {
  var buttons = [];
  for (var i = 0; i < total; i++) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换到第 ' + (i + 1) + ' 张');
    btn.addEventListener('click', (function (idx) {
      return function () { onSelect(idx); };
    })(i));
    dotsWrap.appendChild(btn);
    buttons.push(btn);
  }
  return buttons;
}

/**
 * _activate —— 内部辅助：将目标索引设为唯一激活态
 * 输入：slides 幻灯片元素数组；dots 指示点元素数组；idx 目标索引
 * 返回：无；单一职责：只负责 class 切换
 */
function _activate(slides, dots, idx) {
  for (var i = 0; i < slides.length; i++) {
    slides[i].classList.toggle('active', i === idx);
    if (dots[i]) { dots[i].classList.toggle('active', i === idx); }
  }
}

/**
 * createBannerService —— 首页轮播服务工厂
 * 职责：校验配置 → 生成指示点 → 提供受控的 start/destroy 生命周期
 * Globals Used: 无（依赖全部经参数注入，符合 DI 约定）
 * Calls: SMSK.qs / SMSK.qsa / SMSK.on / nextIndex / _renderDots / _activate
 * @param {HTMLElement|null} root 轮播根节点（.banner）；null 时返回空实现（非首页）
 * @param {BannerConfig}     config 轮播配置（通常来自 SiteConfig.banner）
 * @param {Logger}           logger 统一日志器
 * @returns {{start: function(): void, destroy: function(): void}}
 * @throws {SMSK.ConfigError} config.intervalMs 契约不合法时
 */
function createBannerService(root, config, logger) {
  if (!config || typeof config.intervalMs !== 'number' || config.intervalMs <= 0) {
    throw new SMSK.ConfigError('banner.intervalMs', config && config.intervalMs);
  }
  if (!root) {
    logger.warn('banner', '当前页面无轮播节点，返回空实现');
    return { start: function () {}, destroy: function () {} };
  }

  var slides = SMSK.qsa('.slide', root);
  var dotsWrap = SMSK.qs('.dots', root);
  var dots = dotsWrap ? _renderDots(dotsWrap, slides.length, show) : [];
  var state = { current: 0, timer: null, started: false };

  /** show —— 闭包内部：切换到指定索引并记录状态 */
  function show(idx) {
    state.current = idx;
    _activate(slides, dots, idx);
  }

  return {
    /** start —— 启动轮播（幂等；autoplay 时按 intervalMs 定时切换） */
    start: function () {
      if (state.started || slides.length === 0) { return; }
      state.started = true;
      show(state.current);
      if (config.autoplay) {
        state.timer = window.setInterval(function () {
          show(nextIndex(state.current, slides.length));
        }, config.intervalMs);
      }
      logger.info('banner', '轮播已启动', { total: slides.length,
        autoplay: config.autoplay, intervalMs: config.intervalMs });
    },
    /** destroy —— 停止定时器并复位（供测试/页面卸载清理） */
    destroy: function () {
      if (state.timer) { window.clearInterval(state.timer); state.timer = null; }
      state.started = false;
      logger.info('banner', '轮播已停止');
    }
  };
}

window.SMSK.nextIndex = nextIndex;
window.SMSK.createBannerService = createBannerService;
