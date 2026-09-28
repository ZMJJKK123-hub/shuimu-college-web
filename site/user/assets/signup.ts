/**
 * ============================================================================
 * 模块：用户板块页面脚本 / 注册表单（user/assets/signup.ts）
 * 职责：注册表单交互——前端预校验（格式 + 两次密码一致）→
 *       POST /api/user/signup → 成功（后端注册即自动登录）经 SMSK.auth.save
 *       写入登录态并跳回首页。
 * 说明：依赖同页已加载的 auth.service.js（SMSK.auth / SMSK.validateCredential），
 *       故本文件置于 main.js 之后加载；失败文案展示于卡片内 #msg。
 * 封装：IIFE——全站 .ts 同属一个编译程序（全局脚本），页面专属脚本
 *       不向全局暴露任何符号，避免与其他页面脚本重名。
 * ============================================================================
 */
(function (): void {

  /** SignupResponseBody —— POST /api/user/signup 成功响应体 */
  interface SignupResponseBody {
    saved: boolean;
    token: string;
    account: string;
  }

  /** API 地址：同域反代（线上）优先；本地静态预览（:8123 等）指向后端 3000 */
  const API: string = location.pathname.startsWith('/site/')
    ? 'http://localhost:3000/api/user'
    : '/api/user';

  /** requiredEl —— 内部辅助：按 id 取关键节点，缺失即显式抛错（不静默吞错） */
  function requiredEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) { throw new Error('[signup] 注册页关键节点缺失（#' + id + '）'); }
    return el;
  }

  /** authApi —— 登录态助手（auth.service.js 先于本文件加载；缺失即页面装配错误） */
  if (!SMSK.auth) {
    throw new Error('[signup] 依赖缺失：auth.service.js 需先于本文件加载（SMSK.auth 未挂载）');
  }
  const authApi: AuthApi = SMSK.auth;

  const form = requiredEl('auth-form') as HTMLFormElement;
  const accountInput = requiredEl('account') as HTMLInputElement;
  const passwordInput = requiredEl('password') as HTMLInputElement;
  const password2Input = requiredEl('password2') as HTMLInputElement;
  const submitBtn = requiredEl('submit') as HTMLButtonElement;
  const msgEl = requiredEl('msg');

  /** showMsg —— 内部辅助：错误条展示（后端 409/400 文案或本地预校验文案） */
  function showMsg(text: string): void {
    msgEl.textContent = text;
    msgEl.className = 'auth-msg err';
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
    const invalid = SMSK.validateCredential(account, password);
    if (invalid) { showMsg(invalid); return; }
    if (password !== password2Input.value) {
      showMsg('两次输入的密码不一致');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '正在注册……';
    fetch(API + '/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: account, password: password })
    }).then(function (r: Response): Promise<SignupResponseBody> {
      if (!r.ok) {
        return r.json().then(function (e: { message?: string }): never {
          throw new Error((e && e.message) || ('HTTP ' + r.status));
        });
      }
      return r.json() as Promise<SignupResponseBody>;
    }).then(function (body: SignupResponseBody): void {
      authApi.save({ token: body.token, account: body.account });
      location.href = '../index/index.html';
    }).catch(function (e: unknown): void {
      showMsg('注册失败：' + errMsg(e));
      submitBtn.disabled = false;
      submitBtn.textContent = '注 册';
    });
  });
})();
