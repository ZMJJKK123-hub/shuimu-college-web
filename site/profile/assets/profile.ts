/**
 * ============================================================================
 * 模块：个人信息设置页脚本（profile/assets/profile.ts）
 * 职责：登录门槛（未登录跳转登录页）→ 拉取本人资料回填表单 →
 *       「保存修改」PUT /api/user/profile（前端预校验同后端规则）→
 *       结果提示；「重置」恢复已加载值；头像区复用 SMSK.avatar
 *       （已上传头像直接展示，未上传显示账号首字母；两处按钮均唤起裁剪编辑器）。
 * 说明：依赖同页先于本文件加载的 auth.service.js（SMSK.auth）；
 *       avatar.service.js 缺失时头像区降级为首字母，不阻断表单。
 * 封装：IIFE——页面专属脚本不向全局暴露任何符号，避免与其他页面脚本重名。
 * 类型：AuthApi / AvatarApi 见 assets/js/types.d.ts。
 * ============================================================================
 */
(function (): void {

  /** ProfileResponseBody —— GET /api/user/profile 响应体（profile 为 null=尚未填写） */
  interface ProfileResponseBody {
    account: string;
    profile: { name: string; email: string; studentId: string; bio: string } | null;
  }

  /** API 地址：同域反代（线上）优先；本地静态预览（:8123 等）指向后端 3000 */
  const API: string = location.pathname.startsWith('/site/')
    ? 'http://localhost:3000/api/user'
    : '/api/user';

  /** EMAIL_PATTERN —— 前端预校验（与后端 user.service 同规则：空串放行） */
  const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** requiredEl —— 内部辅助：按 id 取关键节点，缺失即显式抛错（不静默吞错） */
  function requiredEl<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) { throw new Error('[profile] 页面关键节点缺失（#' + id + '）'); }
    return el as T;
  }

  /** authApi —— 登录态助手（auth.service.js 先于本文件加载；缺失即页面装配错误） */
  if (!SMSK.auth) {
    throw new Error('[profile] 依赖缺失：auth.service.js 需先于本文件加载（SMSK.auth 未挂载）');
  }
  const authApi: AuthApi = SMSK.auth;

  // ---- 登录门槛：未登录直接回登录页（不渲染表单交互） ----
  if (!authApi.isLoggedin()) {
    location.replace('../user/signin.html');
    return;
  }
  const account: string = authApi.getAccount();
  const token: string = authApi.getToken();

  const form = requiredEl<HTMLFormElement>('profile-form');
  const nameInput = requiredEl<HTMLInputElement>('f-name');
  const emailInput = requiredEl<HTMLInputElement>('f-email');
  const studentIdInput = requiredEl<HTMLInputElement>('f-studentId');
  const bioInput = requiredEl<HTMLTextAreaElement>('f-bio');
  const bioCount = requiredEl<HTMLElement>('bio-count');
  const msg = requiredEl<HTMLElement>('profile-msg');
  const saveBtn = requiredEl<HTMLButtonElement>('btn-save');
  const accountEl = requiredEl<HTMLElement>('profile-account');
  const sideSub = requiredEl<HTMLElement>('profile-side-sub');
  const letterEl = requiredEl<HTMLElement>('profile-avatar-letter');
  const imgEl = requiredEl<HTMLImageElement>('profile-avatar-img');

  /** loaded —— 已加载的服务端资料快照（重置的恢复基准） */
  let loaded: { name: string; email: string; studentId: string; bio: string } =
    { name: '', email: '', studentId: '', bio: '' };

  /** fillForm —— 内部辅助：按资料对象回填四个字段并刷新字数 */
  function fillForm(p: { name: string; email: string; studentId: string; bio: string }): void {
    nameInput.value = p.name;
    emailInput.value = p.email;
    studentIdInput.value = p.studentId;
    bioInput.value = p.bio;
    updateBioCount();
  }

  /** updateBioCount —— 内部辅助：简介字数实时展示 */
  function updateBioCount(): void {
    bioCount.textContent = bioInput.value.length + ' / 500';
  }

  /** showMsg —— 内部辅助：结果提示（ok 绿 / err 红），3.5s 后自动清空 */
  function showMsg(text: string, ok: boolean): void {
    msg.textContent = text;
    msg.className = 'form-msg' + (ok ? ' ok' : ' err');
    window.setTimeout(function (): void {
      if (msg.textContent === text) { msg.textContent = ''; msg.className = 'form-msg'; }
    }, 3500);
  }

  /** loadAvatar —— 内部辅助：已上传头像贴大图，否则首字母兜底（avatar 服务缺失不阻断） */
  function loadAvatar(): void {
    letterEl.textContent = account.charAt(0).toUpperCase();
    const avatarApi: AvatarApi | undefined = SMSK.avatar;
    if (!avatarApi) { return; }
    avatarApi.load(token).then(function (objectUrl: string | null): void {
      if (objectUrl) {
        imgEl.src = objectUrl;
        imgEl.hidden = false;
        letterEl.hidden = true;
      }
    }).catch(function (): void { /* 拉取失败保持首字母兜底 */ });
  }

  /** openAvatarEditor —— 内部辅助：唤起圆形裁剪编辑器（无 avatar 服务时提示不可用） */
  function openAvatarEditor(): void {
    if (SMSK.avatar) {
      SMSK.avatar.openEditor();
    } else {
      showMsg('头像服务未加载，请刷新页面重试', false);
    }
  }

  // ---- 头部信息：账号 + 姓名（有资料时副行显示姓名） ----
  accountEl.textContent = account;
  loadAvatar();

  // ---- 拉取资料回填（失败提示但保留可编辑表单，保存时以后端为准） ----
  fetch(API + '/profile?token=' + encodeURIComponent(token))
    .then(function (res: Response): Promise<ProfileResponseBody> {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    })
    .then(function (body: ProfileResponseBody): void {
      if (body.profile) { loaded = body.profile; }
      fillForm(loaded);
      if (loaded.name) { sideSub.textContent = loaded.name; }
    })
    .catch(function (): void {
      showMsg('资料加载失败，请刷新重试', false);
    });

  // ---- 简介：字数提示；两处「更改头像」按钮均唤起编辑器 ----
  bioInput.addEventListener('input', updateBioCount);
  requiredEl<HTMLButtonElement>('btn-avatar').addEventListener('click', openAvatarEditor);
  requiredEl<HTMLButtonElement>('btn-avatar-camera').addEventListener('click', openAvatarEditor);

  // ---- 重置：恢复到已加载的服务端值 ----
  requiredEl<HTMLButtonElement>('btn-reset').addEventListener('click', function (): void {
    fillForm(loaded);
    showMsg('已恢复上次保存的内容', true);
  });

  // ---- 保存：前端预校验（长度/邮箱）→ PUT /api/user/profile ----
  form.addEventListener('submit', function (ev: Event): void {
    ev.preventDefault();
    const name: string = nameInput.value.trim();
    const email: string = emailInput.value.trim();
    const studentId: string = studentIdInput.value.trim();
    const bio: string = bioInput.value.trim();
    if (name.length > 30) { showMsg('姓名不能超过 30 字', false); return; }
    if (email.length > 120) { showMsg('邮箱不能超过 120 字符', false); return; }
    if (email && !EMAIL_PATTERN.test(email)) { showMsg('邮箱格式不正确', false); return; }
    if (studentId.length > 20) { showMsg('学号不能超过 20 字符', false); return; }
    if (bio.length > 500) { showMsg('个人简介不能超过 500 字', false); return; }

    saveBtn.disabled = true;
    fetch(API + '/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, name: name, email: email, studentId: studentId, bio: bio })
    }).then(function (res: Response): Promise<{ saved: boolean }> {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    }).then(function (): void {
      loaded = { name: name, email: email, studentId: studentId, bio: bio };
      if (name) { sideSub.textContent = name; }
      showMsg('保存成功', true);
    }).catch(function (err: unknown): void {
      showMsg('保存失败：' + (err instanceof Error ? err.message : '网络异常'), false);
    }).finally(function (): void {
      saveBtn.disabled = false;
    });
  });
})();
