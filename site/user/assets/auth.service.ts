/**
 * ============================================================================
 * 模块：用户板块专属 / 登录态服务（user/assets/auth.service.ts）
 * 职责：全站页头登录态的存取与渲染——登录态持久化于 localStorage（键
 *       SMSK_AUTH：{ token, account }）；启动时向后端 GET /api/user/me
 *       校验令牌（失效即清除并回落未登录视图），并把页头 .header-tools
 *       内的 .auth-area 在两种视图间切换：未登录=「登录/注册」链接；
 *       已登录=默认头像（首字母圆标，悬停提示"更改头像"）+ 用户名
 *       （悬停下拉：用户信息/个人信息设置/粗分界线/退出登录，个人信息
 *       类入口为占位空跳转，样式见 common/layout.css 页头用户菜单区块）。
 *       另暴露纯函数 validateCredential（账号/密码格式校验，前后端同规则）
 *       与 SMSK.auth 助手（signin/signup 页面脚本调用）。
 * 说明：本服务挂载于全部内容页（与公用脚本同载，先于 main.js 加载），
 *       admin 工具页不加载——main.ts 对未加载页降级为空实现。
 * 依赖：errors.ts / dom.ts / logger.ts（均需先于本文件加载）。
 * 类型：AuthState / AuthApi / ServiceLifecycle 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.validateCredential（纯函数，供自测与表单页复用）、
 *       window.SMSK.createAuthService（工厂）、window.SMSK.auth（助手）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/** STORAGE_KEY —— localStorage 登录态键名（signin/signup 页与本文件共用） */
const STORAGE_KEY = 'SMSK_AUTH';

/** ACCOUNT_PATTERN —— 账号格式契约（与后端 user.dto.ts 同规则：4~30 位字母数字） */
const ACCOUNT_PATTERN = /^[A-Za-z0-9]{4,30}$/;

/** API 地址：同域反代（线上）优先；本地静态预览（:8123 等）指向后端 3000 */
const AUTH_API: string = location.pathname.startsWith('/site/')
  ? 'http://localhost:3000/api/user'
  : '/api/user';

/**
 * validateCredential —— 账号/密码格式校验（纯函数，供自测与 signin/signup 复用）
 * 输入：account 账号原文；password 密码原文
 * 返回：null 表示合法；否则为可直接展示的中文错误文案
 */
function validateCredential(account: string, password: string): string | null {
  if (!ACCOUNT_PATTERN.test(account)) {
    return '账号须为 4~30 位字母或数字';
  }
  if (password.length < 6 || password.length > 64) {
    return '密码长度须为 6~64 位';
  }
  return null;
}

/** readAuth —— 内部辅助：安全读取 localStorage 登录态（损坏的存量数据视为未登录） */
function readAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { return null; }
    const parsed: unknown = JSON.parse(raw);
    const state = parsed as AuthState;
    if (typeof state.token !== 'string' || typeof state.account !== 'string') { return null; }
    return state;
  } catch (_e) {
    return null;
  }
}

/** writeAuth / clearAuth —— 内部辅助：登录态写入与清除 */
function writeAuth(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** escapeHtml —— 内部辅助：账号名插入 DOM 前转义（防 localStorage 被篡改后注入） */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, function (ch: string): string {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch;
  });
}

/**
 * createAuthService —— 登录态服务工厂（契约守卫层）
 * 输入：root 页头工具区节点（.header-tools）；logger 统一日志器
 * 返回：ServiceLifecycle；root 缺失时告警并返回空实现（不中断页面其余服务）
 */
function createAuthService(
  root: HTMLElement | null,
  logger: Logger
): ServiceLifecycle {
  if (!root) {
    logger.warn('auth', '页头工具区节点缺失（.header-tools），登录态渲染跳过');
    return { start: function () {}, destroy: function () {} };
  }
  return _createAuthController(root, logger);
}

/** _createAuthController —— 内部控制器（参数已经工厂守卫，非空确定） */
function _createAuthController(root: HTMLElement, logger: Logger): ServiceLifecycle {
  const unbinds: Unbind[] = [];
  let state: AuthState | null = readAuth();

  /** render —— 按当前登录态重绘 .auth-area（静态默认为未登录视图） */
  function render(): void {
    const area = root.querySelector('.auth-area');
    if (!area) {
      logger.warn('auth', '页头登录态容器缺失（.auth-area），跳过渲染');
      return;
    }
    if (state) {
      area.innerHTML =
        '<div class="header-user">' +
        '<a class="user-avatar" href="#" data-act="placeholder" data-tip="更改头像" title="更改头像（建设中，点击暂无跳转）">' +
        escapeHtml(state.account.charAt(0).toUpperCase()) + '</a>' +
        '<div class="user-name" tabindex="0">' +
        escapeHtml(state.account) +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>' +
        '<div class="user-menu">' +
        '<a href="#" data-act="placeholder" title="建设中，点击暂无跳转">用户信息</a>' +
        '<a href="#" data-act="placeholder" title="建设中，点击暂无跳转">个人信息设置</a>' +
        '<a class="menu-logout" href="#" data-act="logout" title="退出登录">退出登录</a>' +
        '</div>' +
        '</div>' +
        '</div>';
    } else {
      area.innerHTML =
        '<a class="tool-btn" href="../user/signin.html" title="账号登录">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>' +
        '登录</a>' +
        '<a class="tool-btn" href="../user/signup.html" title="注册新账号">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><path d="M19 8v6M16 11h6"/></svg>' +
        '注册</a>';
    }
  }

  /** doLogout —— 退出登录：通知后端删会话（失败不阻断本地清除）→ 清态 → 重绘 */
  function doLogout(): void {
    if (state) {
      fetch(AUTH_API + '/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.token })
      }).catch(function () { /* 后端不可达时仍完成本地登出 */ });
    }
    clearAuth();
    state = null;
    render();
    logger.info('auth', '已退出登录');
  }

  return {
    start: function (): void {
      // 菜单点击（事件委托）：退出登录执行登出；占位入口（用户信息/设置/更改头像）仅阻止默认行为
      unbinds.push(SMSK.on(root, 'click', function (ev: Event): void {
        const target = ev.target as Element | null;
        const closest = target && target.closest ? target.closest.bind(target) : null;
        if (!closest) { return; }
        const logoutBtn = closest('[data-act="logout"]');
        if (logoutBtn) {
          ev.preventDefault();
          doLogout();
          return;
        }
        const placeholder = closest('[data-act="placeholder"]');
        if (placeholder) {
          ev.preventDefault();
        }
      }));
      if (state) {
        // 有本地登录态：向后端校验一次，失效则清除（后端不可达时维持本地态，避免误登出）
        fetch(AUTH_API + '/me?token=' + encodeURIComponent(state.token))
          .then(function (r: Response): void {
            if (!r.ok) {
              clearAuth();
              state = null;
              logger.info('auth', '登录态已失效，自动清除');
            }
            render();
          })
          .catch(function (): void { render(); });
      } else {
        render();
      }
    },
    destroy: function (): void {
      unbinds.forEach(function (unbind: Unbind): void { unbind(); });
      unbinds.length = 0;
    }
  };
}

/** SMSK.auth —— 登录态助手（signin/signup 页面脚本经此读写登录态） */
SMSK.auth = {
  isLoggedin: function (): boolean { return readAuth() !== null; },
  getAccount: function (): string { const s = readAuth(); return s ? s.account : ''; },
  getToken: function (): string { const s = readAuth(); return s ? s.token : ''; },
  save: function (next: AuthState): void {
    writeAuth(next);
  },
  logout: function (): void { clearAuth(); }
};

window.SMSK.validateCredential = validateCredential;
window.SMSK.createAuthService = createAuthService;
