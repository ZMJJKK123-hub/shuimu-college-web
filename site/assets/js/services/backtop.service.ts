/**
 * ============================================================================
 * 模块：服务层 / 返回顶部服务（assets/js/services/backtop.service.ts）
 * 职责：监听滚动，按阈值显隐 .backtop 按钮，点击平滑回顶。
 * 依赖：dom.ts / logger.ts（均需先于本文件加载）。
 * 类型：ServiceLifecycle 见 assets/js/types.d.ts。
 * 挂载：window.SMSK.createBacktopService（工厂）
 * ============================================================================
 */
window.SMSK = window.SMSK || ({} as SMSKNamespace);

/**
 * createBacktopService —— 返回顶部服务工厂
 * 职责：滚动超过注入阈值时显示按钮；点击平滑滚动至页顶；销毁时解绑监听
 * Globals Used: 无（依赖全部经参数注入；滚动读取 window.scrollY 属运行环境交互）
 * Calls: SMSK.on（事件绑定并取得解绑函数）
 * @param btn          返回顶部按钮节点；null 时返回空实现并告警
 * @param thresholdPx  显隐滚动阈值（像素，来自 SiteConfig）
 * @param logger       统一日志器
 */
function createBacktopService(btn: HTMLElement | null, thresholdPx: number,
                              logger: Logger): ServiceLifecycle {
  if (!btn) {
    logger.warn('backtop', '当前页面无返回顶部按钮，返回空实现');
    return { start: function () {}, destroy: function () {} };
  }

  let unbindScroll: Unbind | null = null;
  let unbindClick: Unbind | null = null;
  let started = false;

  return {
    /** start —— 绑定滚动显隐与点击回顶（幂等） */
    start: function (): void {
      if (started) { return; }
      started = true;
      unbindScroll = SMSK.on(window, 'scroll', function () {
        btn.classList.toggle('show', window.scrollY > thresholdPx);
      });
      unbindClick = SMSK.on(btn, 'click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        logger.info('backtop', '用户点击返回顶部', { fromY: window.scrollY });
      });
      logger.info('backtop', '返回顶部服务已启动', { thresholdPx: thresholdPx });
    },
    /** destroy —— 解绑全部监听并隐藏按钮（供页面卸载/测试清理） */
    destroy: function (): void {
      if (unbindScroll) { unbindScroll(); }
      if (unbindClick) { unbindClick(); }
      btn.classList.remove('show');
      started = false;
      logger.info('backtop', '返回顶部服务已停止');
    }
  };
}

window.SMSK.createBacktopService = createBacktopService;

