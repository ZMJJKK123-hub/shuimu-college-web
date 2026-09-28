/**
 * ============================================================================
 * 模块：管理员板块页面脚本 / 管理员登录表单（administrator/assets/administrator.ts）
 * 职责：管理员登录表单交互——POST /api/administrator/signin 校验账号密码，
 *       成功后把管理员令牌写入 localStorage（键 SMSK_ADMIN_AUTH：
 *       { token, account }，键名与 site/admin/assets/admin.ts 保持一致）
 *       并跳转 site/admin/ 轮播管理页。
 * 说明：本页为独立工具页（不依赖站内 SMSK 各服务，不加载公用脚本）；
 *       管理员令牌与普通用户令牌（SMSK_AUTH）完全隔离，前缀 "a."。
 * 封装：IIFE——全站 .ts 同属一个编译程序（全局脚本），页面专属脚本
 *       不向全局暴露任何符号，避免与其他页面脚本重名。
 * ============================================================================
 */
(function (): void {

  /** SigninResponseBody —— POST /api/administrator/signin 成功响应体 */
  interface SigninResponseBody {
    success: boolean;
    token: string;
    account: string;
  }

  /** STORAGE_KEY —— 管理员登录态键名（site/admin/assets/admin.ts 读取同一键） */
  const STORAGE_KEY = 'SMSK_ADMIN_AUTH';

  /** API 地址：同域反代（线上）优先；本地静态预览（:8123 等）指向后端 3000 */
  const API: string = location.pathname.startsWith('/site/')
    ? 'http://localhost:3000/api/administrator'
    : '/api/administrator';

  /** requiredEl —— 内部辅助：按 id 取关键节点，缺失即显式抛错（不静默吞错） */
  function requiredEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) { throw new Error('[administrator] 管理员登录页关键节点缺失（#' + id + '）'); }
    return el;
  }

  const form = requiredEl('auth-form') as HTMLFormElement;
  const accountInput = requiredEl('account') as HTMLInputElement;
  const passwordInput = requiredEl('password') as HTMLInputElement;
  const submitBtn = requiredEl('submit') as HTMLButtonElement;
  const msgEl = requiredEl('msg');

  /** showMsg —— 内部辅助：错误条展示（后端 401 文案） */
  function showMsg(text: string): void {
    msgEl.textContent = text;
    msgEl.className = 'gate-msg err';
    msgEl.hidden = false;
  }

  /** errMsg —— 内部辅助：未知异常转可读文案（catch 参数按 unknown 处理） */
  function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  form.addEventListener('submit', function (ev: Event): void {
    ev.preventDefault();
    const account = accountInput.value.trim();
    const password = passwordInput.value;
    if (!account || !password) {
      showMsg('请输入管理员账号与密码');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '正在验证……';
    fetch(API + '/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: account, password: password })
    }).then(function (r: Response): Promise<SigninResponseBody> {
      if (!r.ok) {
        return r.json().then(function (e: { message?: string }): never {
          throw new Error((e && e.message) || ('HTTP ' + r.status));
        });
      }
      return r.json() as Promise<SigninResponseBody>;
    }).then(function (body: SigninResponseBody): void {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: body.token, account: body.account }));
      location.href = '../admin/index.html';
    }).catch(function (e: unknown): void {
      showMsg('登录失败：' + errMsg(e));
      submitBtn.disabled = false;
      submitBtn.textContent = '进入控制台';
    });
  });
})();
