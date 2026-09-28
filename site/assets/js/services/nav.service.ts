/**
 * ============================================================================
 * 模块：服务层 / 导航服务（assets/js/services/nav.service.ts）
 * 职责：主导航当前页高亮（.active）与移动端抽屉菜单的开关交互。
 * 依赖：errors.ts / dom.ts / logger.ts（均需先于本文件加载）。
 * 类型：NavServiceApi 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.createNavService（工厂）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/**
 * createNavService —— 导航服务工厂
 * 职责：高亮当前页对应的 <li data-page>；绑定移动端汉堡/遮罩开关
 * Globals Used: 无（依赖全部经参数注入）
 * Calls: SMSK.qs
 * @param navEl  主导航 <ul> 节点（#nav-list）
 * @param pageId 当前页面标识（取自 <body data-page>）
 * @param logger 统一日志器
 * @throws SMSK.DomError navEl 缺失时（主导航为全站关键节点）
 */
function createNavService(navEl: HTMLElement | null, pageId: string,
                          logger: Logger): NavServiceApi {
  if (!navEl) {
    throw new SMSK.DomError('#nav-list', pageId || 'unknown');
  }

  return {
    /** highlight —— 为当前页对应的导航项添加 .active；未命中时仅告警不中断 */
    highlight: function (): void {
      const target = SMSK.qs('li[data-page="' + pageId + '"]', navEl);
      if (!target) {
        logger.warn('nav', '未找到当前页对应的导航项', { page: pageId });
        return;
      }
      target.classList.add('active');
      logger.info('nav', '当前页导航已高亮', { page: pageId });
    },

    /** bindMobileToggle —— 绑定移动端抽屉菜单：汉堡开、遮罩关 */
    bindMobileToggle: function (): void {
      const toggle = SMSK.qs('.nav-toggle');
      const mask = SMSK.qs('.nav-mask');
      const drawer = SMSK.qs('.mainnav');
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

window.SMSK.createNavService = createNavService;
