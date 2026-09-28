/**
 * ============================================================================
 * 模块：类型层 / 全站类型契约（assets/js/types.d.ts）
 * 职责：集中声明 window.SMSK 命名空间与跨文件共享的数据/服务契约类型。
 *       本文件是纯声明（.d.ts，不产出 JS、不参与运行），是"9 个全局脚本
 *       无模块化但强类型"的关键：所有 .ts 文件共享这里的全局类型。
 * 说明：各服务类/函数的具体实现分散在对应 .ts 中（全局可见），
 *       此处以 typeof 引用其真实签名，保证声明与实现永不脱钩。
 * ============================================================================
 */

/* ---------- 基础别名 ---------- */

/** LogLevel —— 统一日志级别（logger 工厂入参、SiteConfig.logLevel 取值域） */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** LogContext —— 结构化日志上下文（不拼接裸字符串；error 级另可传 Error） */
type LogContext = Record<string, unknown>;

/** Unbind —— 事件解绑函数（dom.on 的返回值，服务 destroy 时清理监听用） */
type Unbind = () => void;

/** NavState —— 主导航滚动收起状态机取值 */
type NavState = 'collapsed' | 'expanded';

/* ---------- 数据契约 ---------- */

/** BannerLink —— 轮播跳转链接（label 选填，href 必填） */
interface BannerLink {
  label?: string;
  href: string;
}

/** BannerSlide —— 首页轮播单张数据的四接口契约（与 site/data/banners.js 对应）
 *  title 必填；organizer/description 选填；link 选填（null 表示显式无链接） */
interface BannerSlide {
  organizer?: string;
  title: string;
  description?: string;
  link?: BannerLink | null;
}

/** NavItem —— 主航单项契约（与 HTML 中 <li data-page> 对应） */
interface NavItem {
  id: string;
  label: string;
  href: string;
}

/* ---------- 配置契约 ---------- */

/** BannerConfig —— 轮播行为配置（SiteConfig.banner） */
interface BannerConfig {
  intervalMs: number;
  autoplay: boolean;
}

/** NavCollapseConfig —— 导航收起行为配置（SiteConfig.navCollapse） */
interface NavCollapseConfig {
  durationMs: number;
}

/** SiteConfig —— 站点全局配置契约（site.config.ts 的产出物） */
interface SiteConfig {
  logLevel: LogLevel;
  banner: BannerConfig;
  navCollapse: NavCollapseConfig;
  backtopThresholdPx: number;
}

/* ---------- 服务契约 ---------- */

/** Logger —— 统一日志器（createLogger 的产出物，全站唯一日志出口） */
interface Logger {
  debug(scope: string, msg: string, ctx?: LogContext): void;
  info(scope: string, msg: string, ctx?: LogContext): void;
  warn(scope: string, msg: string, ctx?: LogContext): void;
  error(scope: string, msg: string, ctx?: LogContext | Error): void;
}

/** ServiceLifecycle —— 各服务的统一生命周期（幂等 start / 可重入 destroy） */
interface ServiceLifecycle {
  start(): void;
  destroy(): void;
}

/** NavServiceApi —— 导航服务对外接口（createNavService 的产出物） */
interface NavServiceApi {
  highlight(): void;
  bindMobileToggle(): void;
}

/** AppHandle —— main.ts 装配完成后的运行时句柄（调试/销毁入口） */
interface AppHandle {
  logger: Logger;
  services: {
    nav: NavServiceApi;
    navCollapse: ServiceLifecycle;
    banner: ServiceLifecycle;
    backtop: ServiceLifecycle;
  };
}

/* ---------- 命名空间契约 ---------- */

/** SMSKNamespace —— window.SMSK 的完整形态
 *  各成员由对应 .ts 文件按加载顺序挂载；CONFIG/DATA_BANNERS/app 为数据/句柄，
 *  其余为工厂与纯函数（typeof 直接引用实现处签名，改实现即改契约）。 */
interface SMSKNamespace {
  /** 站点配置（config/site.config.ts 挂载） */
  CONFIG?: SiteConfig;
  /** 首页轮播数据（data/banners.js 挂载；后端读写的就是这份文件） */
  DATA_BANNERS?: BannerSlide[];
  /** 自定义异常（infrastructure/errors.ts 挂载） */
  ConfigError: typeof ConfigError;
  DomError: typeof DomError;
  /** DOM 工具（infrastructure/dom.ts 挂载） */
  qs: typeof qs;
  qsa: typeof qsa;
  on: typeof on;
  /** 日志（infrastructure/logger.ts 挂载） */
  createLogger: typeof createLogger;
  /** 轮播（services/banner.service.ts 挂载） */
  nextIndex: typeof nextIndex;
  validateBannerSlides: typeof validateBannerSlides;
  createBannerService: typeof createBannerService;
  /** 导航（services/nav.service.ts 挂载） */
  resolveActivePage: typeof resolveActivePage;
  createNavService: typeof createNavService;
  /** 导航收起（services/nav-collapse.service.ts 挂载） */
  resolveNavState: typeof resolveNavState;
  createNavCollapseService: typeof createNavCollapseService;
  /** 返回顶部（services/backtop.service.ts 挂载） */
  createBacktopService: typeof createBacktopService;
  /** 运行时句柄（main.ts 装配完成后挂载） */
  app?: AppHandle;
}

/** window.SMSK 声明为可选：各成员按脚本加载顺序渐进挂载，
 *  读取侧（如 CONFIG）因此拿到 SiteConfig | undefined，交由边界校验处置。 */
interface Window {
  SMSK?: SMSKNamespace;
}

/** 裸名 SMSK 与 window.SMSK 同体（全局对象属性）。
 *  声明为必有：文件内部经各自的守卫行（window.SMSK = window.SMSK || ...）
 *  初始化后使用，读取侧不再需要非空断言。 */
declare var SMSK: SMSKNamespace;
