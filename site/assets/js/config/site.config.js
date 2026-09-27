/**
 * ============================================================================
 * 模块：配置层 / 站点配置（assets/js/config/site.config.js）
 * 职责：站点唯一配置源（SiteConfig 契约实现），所有可调参数集中于此，
 *       由 main.js 组装根读取后注入各服务，业务代码零硬编码。
 * 依赖：无（本模块不依赖任何其他 JS，必须最先加载）。
 * 挂载：window.SMSK.CONFIG
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * SiteConfig —— 站点全局配置契约（JSDoc 强类型约定）
 * @typedef {Object} SiteConfig
 * @property {'debug'|'info'|'warn'|'error'} logLevel 统一日志级别
 * @property {Object} banner                    轮播配置（契约见 banner.service.js）
 * @property {number}  banner.intervalMs        自动播放间隔（毫秒）
 * @property {boolean} banner.autoplay          是否自动播放
 * @property {Object} navCollapse               导航收起配置（契约见 nav-collapse.service.js）
 * @property {number} navCollapse.durationMs    下滑收起/上滑展开的过渡时长（毫秒）
 * @property {number} backtopThresholdPx        返回顶部按钮显隐滚动阈值（像素）
 */

/** @type {SiteConfig} 站点全局配置实例（修改参数只改这里） */
window.SMSK.CONFIG = {
  logLevel: 'info',
  banner: {
    intervalMs: 5000,
    autoplay: true
  },
  navCollapse: {
    durationMs: 500
  },
  backtopThresholdPx: 320
};
