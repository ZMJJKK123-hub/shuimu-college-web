/**
 * ============================================================================
 * 模块：配置层 / 站点配置（assets/js/config/site.config.ts）
 * 职责：站点唯一配置源（SiteConfig 契约实现），所有可调参数集中于此，
 *       由 main.ts 组装根读取后注入各服务，业务代码零硬编码。
 * 依赖：无（本模块不依赖任何其他脚本，必须最先加载）。
 * 类型：SiteConfig 契约见 assets/js/types.d.ts（编译期即校验字段完整性）。
 * 挂载：window.SMSK.CONFIG
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/** 站点全局配置实例（修改参数只改这里；类型不符编译不通过） */
window.SMSK.CONFIG = {
  logLevel: 'info',
  banner: {
    intervalMs: 5000,
    autoplay: true
  },
  navCollapse: {
    durationMs: 500
  },
  reveal: {
    durationMs: 600,
    staggerMs: 90
  },
  backtopThresholdPx: 320
} satisfies SiteConfig;
