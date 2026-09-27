/**
 * ============================================================================
 * 模块：服务层 / 首页轮播服务（assets/js/services/banner.service.js）
 * 职责：按数据层（site/data/banners.js，四接口契约）渲染首页 .banner 的
 *       幻灯片，并接管自动播放与指示点交互（切换 .slide.active）。
 *       契约：organizer(选填)/title(必填)/description(选填)/link(选填)；
 *       底色主题按顺序自动轮换 s1/s2/s3，管理员无需关心。
 * 依赖：errors.js / dom.js / logger.js（均需先于本文件加载）。
 * 挂载：window.SMSK.createBannerService（工厂）、
 *       window.SMSK.validateBannerSlides（纯函数，供自测）、
 *       window.SMSK.nextIndex（纯函数，供自测）
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
 * validateBannerSlides —— 纯函数：校验轮播数据契约（管理员四接口）
 * 输入：slides 待校验的数据数组（BannerSlide[]，契约见 site/data/banners.js）
 * 返回：null 表示合法；否则返回带字段路径的错误描述（不抛出，由调用方处置）
 * 单一职责：只做契约判定（tests/selftest.html 覆盖各分支）
 */
function validateBannerSlides(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return 'banners 须为非空数组';
  }
  for (var i = 0; i < slides.length; i++) {
    var s = slides[i];
    if (!s || typeof s.title !== 'string' || !s.title) {
      return 'banners[' + i + '].title 缺失或为空';
    }
    if (s.organizer !== undefined && typeof s.organizer !== 'string') {
      return 'banners[' + i + '].organizer 须为字符串';
    }
    if (s.description !== undefined && typeof s.description !== 'string') {
      return 'banners[' + i + '].description 须为字符串';
    }
    if (s.link !== undefined && s.link !== null) {
      if (typeof s.link !== 'object' || typeof s.link.href !== 'string' || !s.link.href) {
        return 'banners[' + i + '].link.href 缺失';
      }
      if (s.link.label !== undefined && typeof s.link.label !== 'string') {
        return 'banners[' + i + '].link.label 须为字符串';
      }
    }
  }
  return null;
}

/**
 * _buildSlide —— 内部辅助：由单条数据构建一张幻灯片 DOM
 * 输入：slide BannerSlide 数据；index 序号（决定自动轮换的底色主题）
 * 返回：构建好的 .slide 元素；文案经 textContent 写入（防标记注入）
 */
function _buildSlide(slide, index) {
  var theme = 's' + ((index % 3) + 1);
  var el = document.createElement('div');
  el.className = 'slide ' + theme + (index === 0 ? ' active' : '');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var deco = document.createElementNS(SVG_NS, 'svg');
  deco.setAttribute('class', 'deco');
  var use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '#deco-waves');
  deco.appendChild(use);
  el.appendChild(deco);

  var inner = document.createElement('div');
  inner.className = 'inner';
  if (slide.organizer) {
    var eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = slide.organizer;
    inner.appendChild(eyebrow);
  }
  var title = document.createElement('h2');
  title.textContent = slide.title;
  inner.appendChild(title);
  if (slide.description) {
    var text = document.createElement('p');
    text.textContent = slide.description;
    inner.appendChild(text);
  }
  if (slide.link && slide.link.href) {
    var btns = document.createElement('div');
    btns.className = 'btns';
    var a = document.createElement('a');
    a.className = 'btn primary';
    a.href = slide.link.href;
    a.textContent = slide.link.label || '了解更多';
    btns.appendChild(a);
    inner.appendChild(btns);
  }
  el.appendChild(inner);
  return el;
}

/**
 * _renderSlides —— 内部辅助：清空旧幻灯片并按数据渲染全部幻灯片
 * 输入：root 轮播根节点；slides 数据数组
 * 返回：渲染后的幻灯片元素数组（供指示点与激活逻辑使用）
 */
function _renderSlides(root, slides) {
  SMSK.qsa('.slide', root).forEach(function (old) { root.removeChild(old); });
  var dotsWrap = SMSK.qs('.dots', root);
  var els = slides.map(function (s, i) {
    var el = _buildSlide(s, i);
    root.insertBefore(el, dotsWrap);
    return el;
  });
  return els;
}

/**
 * createBannerService —— 首页轮播服务工厂
 * 职责：校验配置与数据 → 按数据渲染幻灯片 → 提供受控 start/destroy 生命周期
 * Globals Used: 无（数据经参数注入，不直接读取 SMSK.DATA_BANNERS）
 * Calls: SMSK.qs / SMSK.qsa / nextIndex / validateBannerSlides / _renderSlides
 * @param {HTMLElement|null} root 轮播根节点（.banner）；null 时返回空实现（非首页）
 * @param {BannerConfig}     config 轮播配置（来自 SiteConfig.banner）
 * @param {Logger}           logger 统一日志器
 * @param {BannerSlide[]}    slides 轮播数据（来自 site/data/banners.js）
 * @returns {{start: function(): void, destroy: function(): void}}
 * @throws {SMSK.ConfigError} 配置或数据契约不合法时（错误带字段路径）
 */
function createBannerService(root, config, logger, slides) {
  if (!config || typeof config.intervalMs !== 'number' || config.intervalMs <= 0) {
    throw new SMSK.ConfigError('banner.intervalMs', config && config.intervalMs);
  }
  if (!root) {
    logger.warn('banner', '当前页面无轮播节点，返回空实现');
    return { start: function () {}, destroy: function () {} };
  }
  var dataError = validateBannerSlides(slides);
  if (dataError) {
    throw new SMSK.ConfigError(dataError, slides);
  }

  var slideEls = _renderSlides(root, slides);
  var dotsWrap = SMSK.qs('.dots', root);
  var state = { current: 0, timer: null, started: false };

  /** _activate —— 内部辅助：把第 idx 张设为唯一激活态（幻灯片与指示点） */
  function _activate(idx) {
    state.current = idx;
    for (var i = 0; i < slideEls.length; i++) {
      slideEls[i].classList.toggle('active', i === idx);
      if (dotsWrap && dotsWrap.children[i]) {
        dotsWrap.children[i].classList.toggle('active', i === idx);
      }
    }
  }

  /** _renderDots —— 内部辅助：依幻灯片数量生成指示点并绑定点选切换 */
  function _renderDots() {
    if (!dotsWrap) { return; }
    slideEls.forEach(function (el, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', '切换到第 ' + (i + 1) + ' 张');
      btn.addEventListener('click', (function (idx) {
        return function () { _activate(idx); };
      })(i));
      dotsWrap.appendChild(btn);
    });
  }

  return {
    /** start —— 启动轮播（幂等；autoplay 时按 intervalMs 定时切换） */
    start: function () {
      if (state.started || slideEls.length === 0) { return; }
      state.started = true;
      _renderDots();
      _activate(state.current);
      if (config.autoplay) {
        state.timer = window.setInterval(function () {
          _activate(nextIndex(state.current, slideEls.length));
        }, config.intervalMs);
      }
      logger.info('banner', '轮播已启动（数据驱动）', { total: slideEls.length,
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
window.SMSK.validateBannerSlides = validateBannerSlides;
window.SMSK.createBannerService = createBannerService;
