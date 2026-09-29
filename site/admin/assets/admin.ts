/**
 * ============================================================================
 * 模块：管理页脚本（admin/assets/admin.ts）——轮播内容管理页逻辑
 * 职责：① 登录门槛：启动时校验管理员令牌（GET /api/administrator/me），
 *         未登录/失效一律跳转 site/administrator/ 登录页；
 *       ② 业务：从后端 GET /api/banners 加载轮播数据渲染表单卡（四接口），
 *         管理员编辑/增删后 PUT 保存（请求体附管理员令牌），后端原子写回
 *         site/index/data/banners.js。
 * 说明：本页为独立页面（不依赖站内 SMSK 各服务），仅复用全局数据契约类型
 *       （BannerSlide/BannerLink 见 assets/js/types.d.ts）；
 *       管理员登录态键 SMSK_ADMIN_AUTH 与 administrator.ts 写入方一致；
 *       编译产物 admin/assets/admin.js 由 index.html 引用。
 * 封装：IIFE——全站 .ts 同属一个编译程序（全局脚本），页面专属脚本
 *       不向全局暴露任何符号，避免与其他页面脚本重名
 *       （2026-09-29 补齐：此前 API / requiredEl / setStatus 等直接落在全局作用域）。
 * 运行：本地需先启动后端（server/ 下 npm run dev，端口 3000）；
 *       线上经 Nginx 同域反代，无需任何配置。
 * ============================================================================
 */
(function (): void {

  /** BannersResponseBody —— GET /api/banners 响应体 */
  interface BannersResponseBody {
    slides: Partial<BannerSlide>[];
  }

  /** SaveResponseBody —— PUT /api/banners 成功响应体 */
  interface SaveResponseBody {
    count: number;
  }

  /** AdminAuth —— 管理员登录态（localStorage 键 SMSK_ADMIN_AUTH） */
  interface AdminAuth {
    token: string;
    account: string;
  }

  /** 状态条文案类型（'' = 中性） */
  type StatusKind = '' | 'ok' | 'err';

  /** API 地址：同域反代（线上）优先；本地静态预览（:8123 等）指向后端 3000 */
  const API: string = location.pathname.startsWith('/site/')
    ? 'http://localhost:3000/api/banners'
    : '/api/banners';

  /** ADMIN_API —— 管理员接口地址（登录门槛校验与登出用） */
  const ADMIN_API: string = location.pathname.startsWith('/site/')
    ? 'http://localhost:3000/api/administrator'
    : '/api/administrator';

  /** requiredEl —— 内部辅助：按 id 取关键节点，缺失即显式抛错（不静默吞错） */
  function requiredEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) { throw new Error('[admin] 管理页关键节点缺失（#' + id + '）'); }
    return el;
  }

  const slidesBox = requiredEl('slides');
  const statusEl = requiredEl('status');
  const addBtn = requiredEl('add-slide');
  const saveBtn = requiredEl('save');

  /** setStatus —— 内部辅助：状态条文案 */
  function setStatus(kind: StatusKind, msg: string): void {
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
    statusEl.textContent = msg;
  }

  /** errMsg —— 内部辅助：未知异常转可读文案（catch 参数按 unknown 处理） */
  function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  /** readAdminAuth —— 内部辅助：安全读取管理员登录态（损坏存量数据视为未登录） */
  function readAdminAuth(): AdminAuth | null {
    try {
      const raw = localStorage.getItem('SMSK_ADMIN_AUTH');
      if (!raw) { return null; }
      const parsed = JSON.parse(raw) as Partial<AdminAuth>;
      if (typeof parsed.token !== 'string' || typeof parsed.account !== 'string') { return null; }
      return parsed as AdminAuth;
    } catch (_e) {
      return null;
    }
  }

  /** gotoLogin —— 内部辅助：清除本地管理员态并跳转管理员登录页 */
  function gotoLogin(): void {
    localStorage.removeItem('SMSK_ADMIN_AUTH');
    location.href = '../administrator/index.html';
  }

  /** fieldOf —— 内部辅助：取表单卡内指定 data-k 的输入框
   * （选择器命中的节点由 buildCard 刚生成，必然存在，故直接断言） */
  function fieldOf(card: Element, k: string): HTMLInputElement {
    return card.querySelector('input[data-k="' + k + '"]') as HTMLInputElement;
  }

  /** buildCard —— 内部辅助：由一条数据构建一张表单卡 */
  function buildCard(s: Partial<BannerSlide>, i: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'slide-card';
    card.innerHTML =
      '<div class="no">第 ' + (i + 1) + ' 张</div>' +
      '<div class="field"><label>主办方（选填）</label><input data-k="organizer" value=""></div>' +
      '<div class="field"><label><b>标题（必填）</b></label><input data-k="title" value=""></div>' +
      '<div class="field"><label>介绍（选填）</label><input data-k="description" value=""></div>' +
      '<div class="link-row">' +
      '<div class="field"><label>跳转按钮文字（选填）</label><input data-k="linkLabel" value=""></div>' +
      '<div class="field"><label>跳转链接（选填）</label><input data-k="linkHref" value=""></div>' +
      '</div>' +
      '<div class="card-ops"><button class="btn ghost" type="button">删除本张</button></div>';
    fieldOf(card, 'organizer').value = s.organizer || '';
    fieldOf(card, 'title').value = s.title || '';
    fieldOf(card, 'description').value = s.description || '';
    fieldOf(card, 'linkLabel').value = (s.link && s.link.label) || '';
    fieldOf(card, 'linkHref').value = (s.link && s.link.href) || '';
    const delBtn = card.querySelector('.card-ops .btn');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        if (slidesBox.children.length <= 1) { setStatus('err', '至少保留一张'); return; }
        card.remove();
        renumber();
      });
    }
    return card;
  }

  /** renumber —— 内部辅助：删除后重排"第 N 张"编号 */
  function renumber(): void {
    Array.from(slidesBox.children).forEach(function (c, i) {
      const no = c.querySelector('.no');
      if (no) { no.textContent = '第 ' + (i + 1) + ' 张'; }
    });
  }

  /** collect —— 内部辅助：从表单收集为契约数据（空字段不进入对象） */
  function collect(): BannerSlide[] {
    return Array.from(slidesBox.children).map(function (c) {
      const get = function (k: string): string { return fieldOf(c, k).value.trim(); };
      let link: BannerLink | null = null;
      if (get('linkHref')) {
        link = { href: get('linkHref') };
        if (get('linkLabel')) { link.label = get('linkLabel'); }
      }
      const slide: BannerSlide = { title: get('title') };
      if (get('organizer')) { slide.organizer = get('organizer'); }
      if (get('description')) { slide.description = get('description'); }
      if (link) { slide.link = link; }
      return slide;
    });
  }

  /** loadAll —— 读取后端数据并渲染全部表单卡（GET 亦统一附管理员令牌参数）；失败降级为一张空卡并提示 */
  function loadAll(): void {
    const auth = readAdminAuth();
    const query = auth ? '?token=' + encodeURIComponent(auth.token) : '';
    fetch(API + query).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json() as Promise<BannersResponseBody>;
    }).then(function (body) {
      slidesBox.innerHTML = '';
      body.slides.forEach(function (s, i) { slidesBox.appendChild(buildCard(s, i)); });
      setStatus('ok', '已加载 ' + body.slides.length + ' 张（当前线上的内容）');
    }).catch(function () {
      slidesBox.innerHTML = '';
      slidesBox.appendChild(buildCard({ title: '' }, 0));
      setStatus('err', '无法连接后端——请在 server/ 目录运行 npm run dev 后刷新本页');
    });
  }

  /**
   * guardAdmin —— 登录门槛（启动入口）
   * 流程：无本地令牌 → 跳登录页；有令牌 → GET /api/administrator/me 校验，
   *       失效（401）→ 跳登录页；通过 → 页头显示当前管理员、绑定登出，放行业务。
   * 说明：后端不可达时不跳转（避免与登录页互相踢成死循环），仅在状态条提示。
   */
  function guardAdmin(): void {
    const auth = readAdminAuth();
    if (!auth) { gotoLogin(); return; }
    fetch(ADMIN_API + '/me?token=' + encodeURIComponent(auth.token)).then(function (r: Response): void {
      if (!r.ok) { gotoLogin(); return; }
      const accountEl = document.getElementById('admin-account');
      if (accountEl) { accountEl.textContent = '当前管理员：' + auth.account; }
      const logoutEl = document.getElementById('admin-logout');
      if (logoutEl) {
        logoutEl.addEventListener('click', function (ev: Event): void {
          ev.preventDefault();
          fetch(ADMIN_API + '/signout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: auth.token })
          }).then(function (): void { gotoLogin(); }, function (): void { gotoLogin(); });
        });
      }
      loadAll();
    }).catch(function (): void {
      setStatus('err', '无法连接后端——请在 server/ 目录运行 npm run dev 后刷新本页');
    });
  }

  addBtn.addEventListener('click', function () {
    if (slidesBox.children.length >= 8) { setStatus('err', '最多 8 张'); return; }
    slidesBox.appendChild(buildCard({ title: '' }, slidesBox.children.length));
    renumber();
  });

  saveBtn.addEventListener('click', function () {
    const slides = collect();
    if (slides.some(function (s) { return !s.title; })) {
      setStatus('err', '每张的标题都必填');
      return;
    }
    const auth = readAdminAuth();
    if (!auth) {
      setStatus('err', '管理员登录已失效，即将跳转登录页……');
      setTimeout(gotoLogin, 1200);
      return;
    }
    setStatus('', '正在保存……');
    fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: slides, token: auth.token })
    }).then(function (r: Response): Promise<SaveResponseBody> | undefined {
      if (r.status === 401) {
        setStatus('err', '管理员登录已失效，即将跳转登录页……');
        setTimeout(gotoLogin, 1200);
        return undefined;
      }
      if (!r.ok) {
        return r.json().then(function (e: unknown): never {
          const body = e as { message?: string };
          throw new Error((body && body.message) || ('HTTP ' + r.status));
        });
      }
      return r.json() as Promise<SaveResponseBody>;
    }).then(function (body: SaveResponseBody | undefined): void {
      if (!body) { return; }
      setStatus('ok', '已保存并发布（' + body.count + ' 张）——首页强刷即可看到');
    }).catch(function (e) {
      setStatus('err', '保存失败：' + errMsg(e));
    });
  });

  guardAdmin();
})();
