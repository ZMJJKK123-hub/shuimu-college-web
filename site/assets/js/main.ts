/**
 * ============================================================================
 * 模块：组装根（assets/js/main.ts）—— Composition Root
 * 职责：读取 SiteConfig → 校验 → 创建统一 Logger → 依当前页面装配
 *       所需服务（导航/导航收起/轮播/返回顶部）并启动；全站唯一装配点。
 * 加载依赖顺序（HTML 中 script 引入顺序，缺一不可）：
 *   config/site.config.js → infrastructure/errors.js → infrastructure/dom.js
 *   → infrastructure/logger.js → services/banner.service.js
 *   → services/nav.service.js → services/nav-collapse.service.js
 *   → services/backtop.service.js → data/banners.js（首页轮播数据）→ 本文件
 *   （以上均为 .ts 编译产物的同名 .js，HTML 引用名不变）
 * Globals Used: window.SMSK.CONFIG（配置层注入）、document（DOM 根）
 * 挂载：window.SMSK.app（运行时句柄：logger 与服务实例，便于调试/销毁）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/**
 * validateConfig —— 配置契约校验（输入边界验证）
 * 职责：逐字段校验 SiteConfig，违约立即抛 ConfigError（带字段与实际值）；
 *       断言签名（asserts）使调用方在通过校验后获得类型收窄。
 * Globals Used: 无
 * Calls: SMSK.ConfigError
 * @param cfg 待校验配置（可能缺失/非法，运行时来源不受编译期约束）
 * @throws SMSK.ConfigError 任一契约字段非法时
 */
function validateConfig(cfg: SiteConfig | null | undefined): asserts cfg is SiteConfig {
  const levels: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (!cfg || levels.indexOf(cfg.logLevel) < 0) {
    throw new SMSK.ConfigError('logLevel', cfg && cfg.logLevel);
  }
  if (!cfg.banner || typeof cfg.banner.intervalMs !== 'number' ||
      cfg.banner.intervalMs <= 0) {
    throw new SMSK.ConfigError('banner.intervalMs', cfg && cfg.banner);
  }
  if (!cfg.navCollapse || typeof cfg.navCollapse.durationMs !== 'number' ||
      cfg.navCollapse.durationMs <= 0) {
    throw new SMSK.ConfigError('navCollapse.durationMs', cfg && cfg.navCollapse);
  }
  if (typeof cfg.backtopThresholdPx !== 'number' || cfg.backtopThresholdPx < 0) {
    throw new SMSK.ConfigError('backtopThresholdPx', cfg && cfg.backtopThresholdPx);
  }
}

/**
 * bootstrap —— 应用装配与启动入口
 * 职责：校验配置 → 建日志器 → 装配导航/导航收起/轮播/返回顶部四个服务并启动
 * Globals Used: window.SMSK.CONFIG、document.body（data-page 页面标识）
 * Calls: SMSK.createLogger / createBannerService / createNavService /
 *        createNavCollapseService / createBacktopService / validateConfig
 */
function bootstrap(): void {
  const cfg = window.SMSK.CONFIG;
  validateConfig(cfg);
  const logger = SMSK.createLogger(cfg.logLevel);

  const pageId = document.body.getAttribute('data-page') || 'index';

  // 导航服务：全站必备（缺失属关键节点故障，直接上抛 DomError）
  const navService = SMSK.createNavService(SMSK.qs('#nav-list'), pageId, logger);
  navService.highlight();
  navService.bindMobileToggle();

  // 导航收起服务：下滑收起/上滑展开（仅桌面端，工厂内部自判）
  const navCollapseService =
    SMSK.createNavCollapseService(SMSK.qs('.mainnav'), cfg.navCollapse, logger);
  navCollapseService.start();

  // 轮播/返回顶部：非首页或无节点时工厂内部降级为空实现（warn 日志）
  const bannerService = SMSK.createBannerService(
    SMSK.qs('.banner'), cfg.banner, logger, window.SMSK.DATA_BANNERS || []);
  bannerService.start();
  const backtopService =
    SMSK.createBacktopService(SMSK.qs('.backtop'), cfg.backtopThresholdPx, logger);
  backtopService.start();

  window.SMSK.app = {
    logger: logger,
    services: {
      nav: navService,
      navCollapse: navCollapseService,
      banner: bannerService,
      backtop: backtopService
    }
  };
  logger.info('app', '页面服务装配完成', { page: pageId });
}

// DOM 就绪即装配（兼容脚本置于 head(defer) 或 body 末尾两种引入方式）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
