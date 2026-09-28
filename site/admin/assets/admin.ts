/**
 * ============================================================================
 * 模块：管理页脚本（admin/assets/admin.ts）——轮播内容管理页逻辑
 * 职责：从后端 GET /api/banners 加载轮播数据渲染表单卡（四接口），
 *       管理员编辑/增删后 PUT 保存，后端原子写回 site/data/banners.js。
 * 说明：本页为独立页面（不依赖站内 SMSK 各服务），仅复用全局数据契约类型
 *       （BannerSlide/BannerLink 见 assets/js/types.d.ts）；
 *       编译产物 admin/assets/admin.js 由 index.html 引用。
 * 运行：本地需先启动后端（server/ 下 npm run dev，端口 3000）；
 *       线上经 Nginx 同域反代，无需任何配置。
 * ============================================================================
 */

/** BannersResponseBody —— GET /api/banners 响应体 */
interface BannersResponseBody {
  slides: Partial<BannerSlide>[];
}

/** SaveResponseBody —— PUT /api/banners 成功响应体 */
interface SaveResponseBody {
  count: number;
}

/** 状态条文案类型（'' = 中性） */
type StatusKind = '' | 'ok' | 'err';

/** API 地址：同域反代（线上）优先；本地静态预览（:8123 等）指向后端 3000 */
const API: string = location.pathname.startsWith('/site/')
  ? 'http://localhost:3000/api/banners'
  : '/api/banners';

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

/** loadAll —— 读取后端数据并渲染全部表单卡；失败降级为一张空卡并提示 */
function loadAll(): void {
  fetch(API).then(function (r) {
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
  setStatus('', '正在保存……');
  fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: slides })
  }).then(function (r) {
    if (!r.ok) {
      return r.json().then(function (e) {
        throw new Error(errMsg(e) || 'HTTP ' + r.status);
      });
    }
    return r.json() as Promise<SaveResponseBody>;
  }).then(function (body) {
    setStatus('ok', '已保存并发布（' + body.count + ' 张）——首页强刷即可看到');
  }).catch(function (e) {
    setStatus('err', '保存失败：' + errMsg(e));
  });
});

loadAll();
