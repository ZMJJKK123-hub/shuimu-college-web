/**
 * ============================================================================
 * 模块：服务层 / 滚动逐层显现服务（assets/js/services/reveal.service.ts）
 * 职责：为内容页区块做"滚动到视口才显现"的入场效果——
 *       创建时同步给显现单元挂 .reveal-unit（隐藏态，先于首帧绘制，无闪烁；
 *       本服务未加载/JS 失效则不挂类，内容照常显示），IntersectionObserver
 *       观察单元进入视口后挂 .revealed（显现态）并停止观察（一次性）。
 *       同一父容器下的相邻单元按 staggerMs 逐个错开，形成"逐层渲染"层次。
 * 依赖：errors.ts / dom.ts / logger.ts（均需先于本文件加载）；
 *       显现态样式见 common/base.css 的 .reveal-unit / .revealed 通用类。
 * 类型：RevealConfig / ServiceLifecycle 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.createRevealService（工厂）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/**
 * REVEAL_UNIT_SELECTOR —— 显现单元选择器（全站内容页通用，零 HTML 约定）
 * 首屏类：.banner（首页轮播）、.page-banner（子页横幅）——进页即播一次入场；
 * 内容类：.placeholder-card / .topic-list（板块占位页）、.sec-head（区头）、
 *         .news-flex > .panel（首页新闻双栏）、
 *         .about-flex .text 与 .about-flex .stat-card（关于我们简介区）
 */
const REVEAL_UNIT_SELECTOR: string = [
  '.banner',
  '.page-banner',
  '.placeholder-card',
  '.topic-list',
  '.sec-head',
  '.news-flex > .panel',
  '.about-flex .text',
  '.about-flex .stat-card'
].join(', ');

/** OBSERVE_THRESHOLD —— 进入视口比例阈值（单元可见 15% 即触发显现） */
const OBSERVE_THRESHOLD: number = 0.15;

/**
 * createRevealService —— 逐层显现服务工厂（契约守卫 + 委托控制器）
 * 职责：校验配置，通过后交由控制器实现观察与显现切换
 * Globals Used: document（单元发现与 CSS 变量注入）
 * Calls: _createRevealController
 * @param config 显现配置（来自 SiteConfig.reveal）
 * @param logger 统一日志器
 * @throws SMSK.ConfigError reveal.durationMs / reveal.staggerMs 契约不合法时
 */
function createRevealService(config: RevealConfig | null,
                            logger: Logger): ServiceLifecycle {
  if (!config || typeof config.durationMs !== 'number' || config.durationMs <= 0) {
    throw new SMSK.ConfigError('reveal.durationMs', config && config.durationMs);
  }
  if (typeof config.staggerMs !== 'number' || config.staggerMs < 0) {
    throw new SMSK.ConfigError('reveal.staggerMs', config && config.staggerMs);
  }
  return _createRevealController(config, logger);
}

/**
 * _createRevealController —— 内部辅助：显现控制器（接收已校验的确定参数）
 * 职责：发现显现单元 → 注入过渡时长变量 → 挂隐藏态类并按父容器分组错开 →
 *       IntersectionObserver 一次性显现；destroy 时完整还原（供测试清理）
 * Calls: SMSK.qsa / IntersectionObserver
 */
function _createRevealController(config: RevealConfig,
                                 logger: Logger): ServiceLifecycle {
  const units: HTMLElement[] = SMSK.qsa<HTMLElement>(REVEAL_UNIT_SELECTOR);
  const started = { flag: false };
  let observer: IntersectionObserver | null = null;

  /** applyStagger —— 内部辅助：同父容器下的相邻单元按序号错开 transitionDelay
   * 单一职责：只负责分组与延迟注入，不触碰显隐状态 */
  function applyStagger(): void {
    const groups: Map<ParentNode, HTMLElement[]> = new Map();
    units.forEach(function (unit: HTMLElement): void {
      const parent: ParentNode | null = unit.parentElement;
      if (!parent) { return; }
      const group: HTMLElement[] | undefined = groups.get(parent);
      if (group) { group.push(unit); } else { groups.set(parent, [unit]); }
    });
    groups.forEach(function (group: HTMLElement[]): void {
      if (group.length < 2) { return; }
      group.forEach(function (unit: HTMLElement, i: number): void {
        unit.style.transitionDelay = (i * config.staggerMs) + 'ms';
      });
    });
  }

  /** reveal —— 内部辅助：显现单个单元并停止观察（一次性语义） */
  function reveal(unit: HTMLElement): void {
    unit.classList.add('revealed');
    if (observer) { observer.unobserve(unit); }
    logger.debug('reveal', '单元已显现', { tag: unit.tagName, cls: unit.className });
  }

  return {
    /** start —— 启动显现（幂等）：注入时长变量 → 预隐藏 → 开始观察
     *（创建后立即调用；首屏单元因已在视口内，观察器首次回调即播入场动画） */
    start: function (): void {
      if (started.flag) { return; }
      started.flag = true;
      if (units.length === 0) {
        logger.warn('reveal', '当前页面无显现单元，返回空实现');
        return;
      }
      document.documentElement.style
        .setProperty('--reveal-duration', config.durationMs + 'ms');
      applyStagger();
      units.forEach(function (unit: HTMLElement): void {
        unit.classList.add('reveal-unit');
      });
      observer = new IntersectionObserver(function (entries: IntersectionObserverEntry[]): void {
        entries.forEach(function (entry: IntersectionObserverEntry): void {
          if (entry.isIntersecting) { reveal(entry.target as HTMLElement); }
        });
      }, { threshold: OBSERVE_THRESHOLD });
      units.forEach(function (unit: HTMLElement): void {
        observer && observer.observe(unit);
      });
      logger.info('reveal', '逐层显现服务已启动',
        { units: units.length, durationMs: config.durationMs, staggerMs: config.staggerMs });
    },
    /** destroy —— 解除观察并还原单元（供页面卸载/测试清理） */
    destroy: function (): void {
      if (observer) { observer.disconnect(); observer = null; }
      units.forEach(function (unit: HTMLElement): void {
        unit.classList.remove('reveal-unit', 'revealed');
        unit.style.transitionDelay = '';
      });
      document.documentElement.style.removeProperty('--reveal-duration');
      started.flag = false;
      logger.info('reveal', '逐层显现服务已停止');
    }
  };
}

window.SMSK.createRevealService = createRevealService;
