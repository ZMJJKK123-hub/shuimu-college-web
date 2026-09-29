/**
 * ============================================================================
 * 模块：用户板块专属 / 头像服务（user/assets/avatar.service.ts）
 * 职责：页头头像的全链路——① 拉取与展示：登录后 GET /api/user/avatar 取
 *       本人头像，替换页头默认字母头像；② 悬停白框：头像悬停展开
 *       "更改头像"菜单（与用户名下拉同款 UI，鼠标下移不消失）；
 *       ③ 编辑器：点击触发文件选择（仅 JPG/JPEG/PNG，前端先验类型与大小），
 *       打开拖拽平移 + 滚轮/滑杆缩放的圆形裁剪弹层，确认后 256×256 PNG
 *       经 PUT /api/user/avatar（base64）上传，成功即时刷新页头。
 * 说明：挂载于全部内容页（先于 auth.service.js 加载）；auth.service 渲染
 *       登录态后经 SMSK.avatar.load/enhance 接入；未加载本服务的页面自动
 *       降级为默认字母头像（可选成员模式，同 banner.service）。
 * 依赖：logger.ts（先于本文件加载）；auth.service.js 的 SMSK.auth.getToken。
 * 类型：AvatarApi 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.avatar
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/** AVATAR_API —— 用户接口地址（同域反代优先；本地静态预览指向后端 3000） */
const AVATAR_API: string = location.pathname.startsWith('/site/')
  ? 'http://localhost:3000/api/user'
  : '/api/user';

/** AVATAR_SIZE —— 裁剪输出边长（正方形 PNG，页面端圆形显示） */
const AVATAR_SIZE = 256;

/** AVATAR_STAGE —— 裁剪舞台边长（展示画布 300×300，圆形裁切区为内切圆） */
const AVATAR_STAGE = 300;

/** AVATAR_MAX_PICK_BYTES —— 选图上限（裁剪输出远小于此；解码后服务端另有 1MB 上限） */
const AVATAR_MAX_PICK_BYTES = 8 * 1024 * 1024;

/** AVATAR_ZOOM_MIN/MAX —— 相对"铺满裁切区"基准缩放的倍率范围 */
const AVATAR_ZOOM_MIN = 1;
const AVATAR_ZOOM_MAX = 4;

/**
 * resolveLogLevel —— 内部辅助：读取站点配置的日志级别
 * 单一职责：只做"配置 → LogLevel"的取值与缺失防御，不创建日志器、不写日志。
 * 返回：SiteConfig.logLevel（配置层是唯一取值源，本服务不再写死级别）。
 * 边界：本文件在全部内容页均晚于 config/site.config.js 加载（见各页 script 顺序），
 *       若被单独引入导致 CONFIG 缺失，即显式抛 ConfigError（杜绝静默回退到写死级别）。
 */
function resolveLogLevel(): LogLevel {
  if (!SMSK.CONFIG) {
    throw new SMSK.ConfigError('CONFIG', SMSK.CONFIG);
  }
  return SMSK.CONFIG.logLevel;
}

/** avatarLogger —— 本服务独立日志器（级别随站点配置 CONFIG.logLevel 生效） */
const avatarLogger = SMSK.createLogger(resolveLogLevel());

/** avatarUrl —— 当前已加载头像的 objectURL（null=无头像/未加载） */
let avatarUrl: string | null = null;

/**
 * loadAvatar —— 拉取当前登录用户头像
 * 输入：token 用户令牌
 * 返回：objectURL（可用图）；无头像（404）或失败返回 null
 */
function loadAvatar(token: string): Promise<string | null> {
  return fetch(AVATAR_API + '/avatar?token=' + encodeURIComponent(token))
    .then(function (r: Response): Promise<Blob> | null {
      if (!r.ok) { return null; }
      return r.blob();
    })
    .then(function (blob: Blob | null): string | null {
      if (!blob) { return null; }
      const previous = avatarUrl;
      avatarUrl = URL.createObjectURL(blob);
      if (previous) { URL.revokeObjectURL(previous); }
      return avatarUrl;
    })
    .catch(function (): null {
      avatarLogger.warn('avatar', '头像拉取失败，保留默认字母头像');
      return null;
    });
}

/** enhanceAvatar —— 把已加载的头像图替换进页头 .user-avatar（未加载/未登录则不动）
 * 已有图片时更新其 src（上传成功后的即时刷新），无图片时新建 */
function enhanceAvatar(): void {
  if (!avatarUrl) { return; }
  const el = document.querySelector('.user-avatar');
  if (!el) { return; }
  const existing = el.querySelector('img');
  if (existing) {
    existing.src = avatarUrl;
    return;
  }
  const img = document.createElement('img');
  img.src = avatarUrl;
  img.alt = '头像';
  el.textContent = '';
  el.appendChild(img);
}

/** validatePick —— 内部辅助：选图前置校验（类型 + 大小），返回错误文案或 null */
function validatePick(file: File): string | null {
  const okType = file.type === 'image/jpeg' || file.type === 'image/jpg' ||
    file.type === 'image/png' || /\.(jpe?g|png)$/i.test(file.name);
  if (!okType) { return '仅支持 JPG/JPEG/PNG 格式的图片'; }
  if (file.size > AVATAR_MAX_PICK_BYTES) { return '图片过大（上限 8MB），请更换或压缩后再试'; }
  return null;
}

/**
 * openAvatarEditor —— 打开"更改头像"编辑器（触发浏览器文件选择）
 * 选定后经 editAvatarFile 进入裁剪弹层；再次点击可重复更换。
 */
function openAvatarEditor(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/jpg,image/png';
  input.style.display = 'none';
  input.addEventListener('change', function (): void {
    const file = input.files && input.files[0];
    if (!file) { return; }
    const invalid = validatePick(file);
    if (invalid) { avatarLogger.warn('avatar', invalid, { name: file.name, size: file.size }); return; }
    editAvatarFile(file);
  });
  document.body.appendChild(input);
  input.click();
  input.remove();
}

/** 编辑器内部状态（editAvatarFile 打开弹层期间有效） */
let editorImage: HTMLImageElement | null = null;
let editorScale = 1;          // 实际绘制缩放（基准铺满 × 用户倍率）
let editorBaseScale = 1;      // 基准缩放：图片恰好铺满 300×300 舞台
let editorOffsetX = 0;        // 图片左上角在舞台坐标系的位置
let editorOffsetY = 0;
let editorZoom = 1;           // 用户倍率（滑杆/滚轮控制量）

/**
 * editAvatarFile —— 以给定图片文件直接进入裁剪弹层
 * 说明：openAvatarEditor 的内部入口，单独暴露供自动化测试（IAB 无法唤起文件选择）。
 */
function editAvatarFile(file: File): void {
  const reader = new FileReader();
  reader.onload = function (): void {
    const img = new Image();
    img.onload = function (): void { openCropModal(img); };
    img.onerror = function (): void { avatarLogger.warn('avatar', '图片解析失败，无法打开编辑器'); };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

/** openCropModal —— 内部辅助：构建并打开裁剪弹层（幂等：重复调用先关旧的） */
function openCropModal(img: HTMLImageElement): void {
  closeCropModal();
  editorImage = img;
  editorZoom = 1;
  editorBaseScale = Math.max(AVATAR_STAGE / img.width, AVATAR_STAGE / img.height);
  applyZoom();

  const overlay = document.createElement('div');
  overlay.className = 'avatar-modal';
  overlay.id = 'avatar-modal';
  overlay.innerHTML =
    '<div class="avatar-card">' +
    '<div class="avatar-head"><h3>更改头像</h3><div class="sub">Change Avatar</div></div>' +
    '<div class="crop-stage"><canvas id="avatar-canvas" width="' + AVATAR_STAGE + '" height="' + AVATAR_STAGE + '"></canvas></div>' +
    '<div class="avatar-zoom"><span>缩小</span><input id="avatar-slider" type="range" ' +
    'min="' + AVATAR_ZOOM_MIN + '" max="' + AVATAR_ZOOM_MAX + '" step="0.01" value="1"><span>放大</span></div>' +
    '<p class="avatar-hint">拖动图片调整位置；滚轮或滑杆缩放；圆形区域即最终头像</p>' +
    '<p class="avatar-msg" id="avatar-msg" hidden></p>' +
    '<div class="avatar-foot">' +
    '<button class="avatar-btn ghost" id="avatar-cancel" type="button">取 消</button>' +
    '<button class="avatar-btn primary" id="avatar-confirm" type="button">确认上传</button>' +
    '</div></div>';
  document.body.appendChild(overlay);

  bindCropModal();
  drawCrop();
}

/** applyZoom —— 内部辅助：按用户倍率重算实际缩放，并把图片平移量钳制在铺满范围内 */
function applyZoom(): void {
  if (!editorImage) { return; }
  editorScale = editorBaseScale * editorZoom;
  const maxX = AVATAR_STAGE - editorImage.width * editorScale;
  const maxY = AVATAR_STAGE - editorImage.height * editorScale;
  editorOffsetX = Math.min(0, Math.max(maxX, editorOffsetX));
  editorOffsetY = Math.min(0, Math.max(maxY, editorOffsetY));
}

/** drawCrop —— 内部辅助：绘制一帧（图片 + 圆形遮罩 + 描边） */
function drawCrop(): void {
  const canvas = document.getElementById('avatar-canvas') as HTMLCanvasElement | null;
  if (!canvas || !editorImage) { return; }
  const ctx = canvas.getContext('2d');
  if (!ctx) { return; }
  ctx.clearRect(0, 0, AVATAR_STAGE, AVATAR_STAGE);
  ctx.drawImage(editorImage, editorOffsetX, editorOffsetY,
    editorImage.width * editorScale, editorImage.height * editorScale);
  // 圆外区域压暗（反向圆路径 + nonzero 填充形成环形遮罩）
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.rect(0, 0, AVATAR_STAGE, AVATAR_STAGE);
  const r = AVATAR_STAGE / 2;
  ctx.arc(r, r, r, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** bindCropModal —— 内部辅助：绑定弹层交互（拖拽平移 / 滚轮与滑杆缩放 / 按钮） */
function bindCropModal(): void {
  const canvas = document.getElementById('avatar-canvas') as HTMLCanvasElement | null;
  const slider = document.getElementById('avatar-slider') as HTMLInputElement | null;
  if (!canvas || !slider) { return; }

  // 拖拽平移：画布起手，window 收 move/up（拖出画布仍跟随）
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', function (ev: PointerEvent): void {
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', function (ev: PointerEvent): void {
    if (!dragging || !editorImage) { return; }
    editorOffsetX += ev.clientX - lastX;
    editorOffsetY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    applyZoom();
    drawCrop();
  });
  canvas.addEventListener('pointerup', function (): void { dragging = false; });
  canvas.addEventListener('pointercancel', function (): void { dragging = false; });

  // 滚轮缩放（画布元素上非 passive，可 preventDefault 阻止页面滚动）
  canvas.addEventListener('wheel', function (ev: WheelEvent): void {
    ev.preventDefault();
    editorZoom = Math.min(AVATAR_ZOOM_MAX,
      Math.max(AVATAR_ZOOM_MIN, editorZoom * (ev.deltaY < 0 ? 1.08 : 1 / 1.08)));
    slider.value = String(editorZoom);
    applyZoom();
    drawCrop();
  });

  // 滑杆缩放
  slider.addEventListener('input', function (): void {
    editorZoom = Number(slider.value);
    applyZoom();
    drawCrop();
  });

  const cancelBtn = document.getElementById('avatar-cancel');
  if (cancelBtn) { cancelBtn.addEventListener('click', closeCropModal); }
  const confirmBtn = document.getElementById('avatar-confirm');
  if (confirmBtn) { confirmBtn.addEventListener('click', confirmCropUpload); }
}

/** showEditorMsg —— 内部辅助：弹层内错误条 */
function showEditorMsg(text: string): void {
  const msg = document.getElementById('avatar-msg');
  if (!msg) { return; }
  msg.textContent = text;
  msg.className = 'avatar-msg err';
  msg.hidden = false;
}

/** closeCropModal —— 内部辅助：关闭并清理弹层与编辑器状态 */
function closeCropModal(): void {
  const overlay = document.getElementById('avatar-modal');
  if (overlay) { overlay.remove(); }
  editorImage = null;
}

/** confirmCropUpload —— 内部辅助：按当前平移/缩放裁出 256×256 PNG 并上传 */
function confirmCropUpload(): void {
  if (!editorImage) { return; }
  const token = SMSK.auth ? SMSK.auth.getToken() : '';
  if (!token) { showEditorMsg('登录已失效，请重新登录后再更改头像'); return; }

  // 舞台坐标 → 源图坐标：源方块边长 = 舞台边长 / 实际缩放
  const sx = -editorOffsetX / editorScale;
  const sy = -editorOffsetY / editorScale;
  const sw = AVATAR_STAGE / editorScale;
  const out = document.createElement('canvas');
  out.width = AVATAR_SIZE;
  out.height = AVATAR_SIZE;
  const ctx = out.getContext('2d');
  if (!ctx) { showEditorMsg('画布初始化失败，请刷新页面重试'); return; }
  ctx.drawImage(editorImage, sx, sy, sw, sw, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const base64 = out.toDataURL('image/png').split(',')[1];

  const confirmBtn = document.getElementById('avatar-confirm') as HTMLButtonElement | null;
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '正在上传……'; }
  fetch(AVATAR_API + '/avatar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, image: base64 })
  }).then(function (r: Response): Promise<{ saved: boolean }> {
    if (!r.ok) {
      return r.json().then(function (e: unknown): never {
        const body = e as { message?: string };
        throw new Error((body && body.message) || ('HTTP ' + r.status));
      });
    }
    return r.json() as Promise<{ saved: boolean }>;
  }).then(function (): void {
    closeCropModal();
    avatarLogger.info('avatar', '头像已更新');
    loadAvatar(token).then(function (url: string | null): void {
      if (url) { enhanceAvatar(); }
    });
  }).catch(function (e: unknown): void {
    showEditorMsg('上传失败：' + (e instanceof Error ? e.message : String(e)));
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = '确认上传'; }
  });
}

/** SMSK.avatar —— 头像能力助手（auth.service 渲染登录态后调用接入页头） */
SMSK.avatar = {
  load: loadAvatar,
  enhance: enhanceAvatar,
  openEditor: openAvatarEditor,
  editFile: editAvatarFile
};
