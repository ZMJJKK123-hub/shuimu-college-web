/**
 * ============================================================================
 * 模块：组装根（assets/js/main.js）—— Composition Root
 * 职责：读取 SiteConfig → 校验 → 创建统一 Logger → 依当前页面装配
 *       所需服务（导航/导航收起/轮播/返回顶部）并启动；全站唯一装配点。
 * 加载依赖顺序（HTML 中 script 引入顺序，缺一不可）：
 *   config/site.config.js → infrastructure/errors.js → infrastructure/dom.js
 *   → infrastructure/logger.js → services/banner.service.js
 *   → services/nav.service.js → services/nav-collapse.service.js
 *   → services/backtop.service.js → data/banners.js（首页轮播数据）→ 本文件
 * Globals Used: window.SMSK.CONFIG（配置层注入）、document（DOM 根）
 * 挂载：window.SMSK.app（运行时句柄：logger 与服务实例，便于调试/销毁）
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * validateConfig —— 配置契约校验（输入边界验证）
 * 职责：逐字段校验 SiteConfig，违约立即抛 ConfigError（带字段与实际值）
 * Globals Used: 无
 * Calls: SMSK.ConfigError
 * @param {SiteConfig} cfg 待校验配置
 * @returns {void}
 * @throws {SMSK.ConfigError} 任一契约字段非法时
 */
function validateConfig(cfg) {
  var levels = ['debug', 'info', 'warn', 'error'];
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
 * @returns {void}
 */
function bootstrap() {
  var cfg = window.SMSK.CONFIG;
  validateConfig(cfg);
  var logger = SMSK.createLogger(cfg.logLevel);

  var pageId = document.body.getAttribute('data-page') || 'index';

  // 导航服务：全站必备（缺失属关键节点故障，直接上抛 DomError）
  var navService = SMSK.createNavService(SMSK.qs('#nav-list'), pageId, logger);
  navService.highlight();
  navService.bindMobileToggle();

  // 导航收起服务：下滑收起/上滑展开（仅桌面端，工厂内部自判）
  var navCollapseService =
    SMSK.createNavCollapseService(SMSK.qs('.mainnav'), cfg.navCollapse, logger);
  navCollapseService.start();

  // 轮播/返回顶部：非首页或无节点时工厂内部降级为空实现（warn 日志）
  var bannerService = SMSK.createBannerService(
    SMSK.qs('.banner'), cfg.banner, logger, window.SMSK.DATA_BANNERS || []);
  bannerService.start();
  var backtopService =
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
