/**
 * ============================================================================
 * 模块：服务层 / 导航服务（assets/js/services/nav.service.js）
 * 职责：主导航当前页高亮（.active）与移动端抽屉菜单的开关交互。
 * 依赖：errors.js / dom.js / logger.js（均需先于本文件加载）。
 * 挂载：window.SMSK.createNavService（工厂）、
 *       window.SMSK.resolveActivePage（纯函数，供自测）
 * ============================================================================
 */
window.SMSK = window.SMSK || {};

/**
 * NavItem —— 导航项契约
 * @typedef {Object} NavItem
 * @property {string} id    页面标识，与 HTML 中 <li data-page> 对应，如 "languages"
 * @property {string} label 中文显示名，如 "编程语言"
 * @property {string} href  页面相对路径，如 "languages.html"
 */

/**
 * resolveActivePage —— 纯函数：由路径解析当前导航项 id
 * 输入：pathname 页面路径（如 "/languages.html"、"/"、"/index.html"）；
 *       navItems 导航契约数组
 * 返回：匹配的 NavItem.id；根路径/index.html 归一化为 "index"；未匹配返回 null
 * 单一职责：路径→id 映射推算，不做 DOM 操作（tests/selftest.html 覆盖）
 */
function resolveActivePage(pathname, navItems) {
  var file = String(pathname || '').split('/').pop().toLowerCase();
  if (file === '' || file === 'index.html') { file = 'index'; }
  var base = file.replace(/\.html?$/, '');
  for (var i = 0; i < navItems.length; i++) {
    var item = navItems[i];
    if (item.id === base) { return item.id; }
    var hrefBase = String(item.href || '').split('/').pop()
      .replace(/\.html?$/, '').toLowerCase();
    if (hrefBase === base) { return item.id; }
  }
  return null;
}

/**
 * createNavService —— 导航服务工厂
 * 职责：高亮当前页对应的 <li data-page>；绑定移动端汉堡/遮罩开关
 * Globals Used: 无（依赖全部经参数注入）
 * Calls: SMSK.qs / SMSK.qsa / resolveActivePage
 * @param {HTMLElement} navEl 主导航 <ul> 节点（#nav-list）
 * @param {string}      pageId 当前页面标识（取自 <body data-page>）
 * @param {Logger}      logger 统一日志器
 * @returns {{highlight: function(): void, bindMobileToggle: function(): void}}
 * @throws {SMSK.DomError} navEl 缺失时（主导航为全站关键节点）
 */
function createNavService(navEl, pageId, logger) {
  if (!navEl) {
    throw new SMSK.DomError('#nav-list', pageId || 'unknown');
  }

  return {
    /** highlight —— 为当前页对应的导航项添加 .active；未命中时仅告警不中断 */
    highlight: function () {
      var target = SMSK.qs('li[data-page="' + pageId + '"]', navEl);
      if (!target) {
        logger.warn('nav', '未找到当前页对应的导航项', { page: pageId });
        return;
      }
      target.classList.add('active');
      logger.info('nav', '当前页导航已高亮', { page: pageId });
    },

    /** bindMobileToggle —— 绑定移动端抽屉菜单：汉堡开、遮罩关 */
    bindMobileToggle: function () {
      var toggle = SMSK.qs('.nav-toggle');
      var mask = SMSK.qs('.nav-mask');
      var drawer = SMSK.qs('.mainnav');
      if (!toggle || !mask || !drawer) {
        logger.warn('nav', '移动端菜单节点缺失，跳过绑定');
        return;
      }
      toggle.addEventListener('click', function () {
        drawer.classList.toggle('open');
        mask.classList.toggle('show');
      });
      mask.addEventListener('click', function () {
        drawer.classList.remove('open');
        mask.classList.remove('show');
      });
      logger.info('nav', '移动端菜单已绑定');
    }
  };
}

window.SMSK.resolveActivePage = resolveActivePage;
window.SMSK.createNavService = createNavService;
