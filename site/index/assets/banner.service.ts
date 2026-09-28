/**
 * ============================================================================
 * 模块：首页板块专属 / 轮播服务（index/assets/banner.service.ts）
 * 职责：按数据层（site/data/banners.js，四接口契约）渲染首页 .banner 的
 *       幻灯片，并接管自动播放与指示点交互（切换 .slide.active）。
 *       契约：organizer(选填)/title(必填)/description(选填)/link(选填)；
 *       底色主题按顺序自动轮换 s1/s2/s3，管理员无需关心。
 * 依赖：errors.ts / dom.ts / logger.ts（均需先于本文件加载）。
 * 类型：BannerSlide / BannerConfig / ServiceLifecycle 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.createBannerService（工厂）、
 *       window.SMSK.validateBannerSlides（纯函数，供自测）、
 *       window.SMSK.nextIndex（纯函数，供自测）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/** BannerRuntimeState —— 轮播运行态（当前索引/定时器句柄/启动标记） */
interface BannerRuntimeState {
  current: number;
  timer: number | null;
  started: boolean;
}

/**
 * nextIndex —— 纯函数：环形推算下一张幻灯片索引
 * 输入：current 当前索引（0 起，可为任意整数）；total 幻灯片总数
 * 返回：下一个有效索引；total <= 0 时返回 -1（边界防御，由调用方告警）
 * 单一职责：仅做索引推算，不触碰 DOM 与定时器（tests/selftest.html 覆盖）
 */
function nextIndex(current: number, total: number): number {
  if (total <= 0) { return -1; }
  if (total === 1) { return 0; }
  return (current + 1) % total;
}

/**
 * validateBannerSlides —— 纯函数：校验轮播数据契约（管理员四接口）
 * 输入：input 待校验的原始数据（unknown：来自数据文件/API，不可信）
 * 返回：null 表示合法；否则返回带字段路径的错误描述（不抛出，由调用方处置）
 * 单一职责：只做契约判定（tests/selftest.html 覆盖各分支）
 */
function validateBannerSlides(input: unknown): string | null {
  if (!Array.isArray(input) || input.length === 0) {
    return 'banners 须为非空数组';
  }
  for (let i = 0; i < input.length; i++) {
    const s = input[i] as Partial<BannerSlide> | null | undefined;
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
      const link = s.link as Partial<BannerLink>;
      if (typeof s.link !== 'object' || typeof link.href !== 'string' || !link.href) {
        return 'banners[' + i + '].link.href 缺失';
      }
      if (link.label !== undefined && typeof link.label !== 'string') {
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
function _buildSlide(slide: BannerSlide, index: number): HTMLElement {
  const theme = 's' + ((index % 3) + 1);
  const el = document.createElement('div');
  el.className = 'slide ' + theme + (index === 0 ? ' active' : '');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const deco = document.createElementNS(SVG_NS, 'svg');
  deco.setAttribute('class', 'deco');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '#deco-waves');
  deco.appendChild(use);
  el.appendChild(deco);

  const inner = document.createElement('div');
  inner.className = 'inner';
  if (slide.organizer) {
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = slide.organizer;
    inner.appendChild(eyebrow);
  }
  const title = document.createElement('h2');
  title.textContent = slide.title;
  inner.appendChild(title);
  if (slide.description) {
    const text = document.createElement('p');
    text.textContent = slide.description;
    inner.appendChild(text);
  }
  if (slide.link && slide.link.href) {
    const btns = document.createElement('div');
    btns.className = 'btns';
    const a = document.createElement('a');
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
function _renderSlides(root: HTMLElement, slides: BannerSlide[]): HTMLElement[] {
  SMSK.qsa('.slide', root).forEach(function (old) { root.removeChild(old); });
  const dotsWrap = SMSK.qs('.dots', root);
  const els = slides.map(function (s, i) {
    const el = _buildSlide(s, i);
    root.insertBefore(el, dotsWrap);
    return el;
  });
  return els;
}

/**
 * _renderDots —— 内部辅助：依幻灯片数量生成指示点并绑定点选切换
 * 输入：slideEls 幻灯片元素数组；dotsWrap 指示点容器；activate 激活回调
 */
function _renderDots(slideEls: HTMLElement[], dotsWrap: HTMLElement | null,
                     activate: (idx: number) => void): void {
  if (!dotsWrap) { return; }
  slideEls.forEach(function (_el, i) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换到第 ' + (i + 1) + ' 张');
    btn.addEventListener('click', (function (idx: number) {
      return function () { activate(idx); };
    })(i));
    dotsWrap.appendChild(btn);
  });
}

/**
 * createBannerService —— 首页轮播服务工厂（契约守卫 + 委托控制器）
 * 职责：校验配置与数据契约，通过后交由控制器实现生命周期
 * Globals Used: 无（数据经参数注入，不直接读取 SMSK.DATA_BANNERS）
 * Calls: validateBannerSlides / _createBannerController
 * @param root   轮播根节点（.banner）；null 时返回空实现（非首页）
 * @param config 轮播配置（来自 SiteConfig.banner）
 * @param logger 统一日志器
 * @param slides 轮播数据（来自 site/data/banners.js；unknown 交由契约校验）
 * @throws SMSK.ConfigError 配置或数据契约不合法时（错误带字段路径）
 */
function createBannerService(
  root: HTMLElement | null,
  config: BannerConfig | null,
  logger: Logger,
  slides: unknown
): ServiceLifecycle {
  if (!config || typeof config.intervalMs !== 'number' || config.intervalMs <= 0) {
    throw new SMSK.ConfigError('banner.intervalMs', config && config.intervalMs);
  }
  if (!root) {
    logger.warn('banner', '当前页面无轮播节点，返回空实现');
    return { start: function () {}, destroy: function () {} };
  }
  const dataError = validateBannerSlides(slides);
  if (dataError) {
    throw new SMSK.ConfigError(dataError, slides);
  }
  return _createBannerController(root, config, logger, slides as BannerSlide[]);
}

/**
 * _createBannerController —— 内部辅助：轮播控制器（接收已校验的确定参数）
 * 职责：按数据渲染幻灯片 → 提供受控 start/destroy 生命周期
 */
function _createBannerController(root: HTMLElement, config: BannerConfig,
                                 logger: Logger, slides: BannerSlide[]): ServiceLifecycle {
  const slideEls = _renderSlides(root, slides);
  const dotsWrap = SMSK.qs('.dots', root);
  const state: BannerRuntimeState = { current: 0, timer: null, started: false };

  /** _activate —— 内部辅助：把第 idx 张设为唯一激活态（幻灯片与指示点） */
  function _activate(idx: number): void {
    state.current = idx;
    for (let i = 0; i < slideEls.length; i++) {
      slideEls[i].classList.toggle('active', i === idx);
      if (dotsWrap && dotsWrap.children[i]) {
        dotsWrap.children[i].classList.toggle('active', i === idx);
      }
    }
  }

  return {
    /** start —— 启动轮播（幂等；autoplay 时按 intervalMs 定时切换） */
    start: function (): void {
      if (state.started || slideEls.length === 0) { return; }
      state.started = true;
      _renderDots(slideEls, dotsWrap, _activate);
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
    destroy: function (): void {
      if (state.timer) { window.clearInterval(state.timer); state.timer = null; }
      state.started = false;
      logger.info('banner', '轮播已停止');
    }
  };
}

window.SMSK.nextIndex = nextIndex;
window.SMSK.validateBannerSlides = validateBannerSlides;
window.SMSK.createBannerService = createBannerService;
