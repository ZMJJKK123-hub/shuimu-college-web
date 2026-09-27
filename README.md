# 清华大学水木书院学生科学技术协会 官网（架构占位版）

水木书院科协官方网站。**内容架构**参照电子系科协文档站（[eesast/docs](https://github.com/eesast/docs)），
**视觉与语言风格**严格遵循[水木书院官网](https://smc.tsinghua.edu.cn/)（清华紫 `#660874`（PANTONE 259C）门户风格，渐变辅助玫红 `#D93379`：
中文主标题 + 英文副标题、“更多”链接、正式书院语体）。

当前版本：**首页完整可用，七个板块页均为占位页**，内容待科协成员按下方指引补充。

> **架构总纲**：全站采用「静态门户 + 后端 API + 渐进业务」架构，部署于自建服务器
>（Nginx 同域反代，阶段2起提供报名等业务接口）。总体设计、演进路线与各阶段验收
> 要求见 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**（活文档，改架构先改它）；
> 前端门户契约见 [docs/PHASE1-架构设计.md](docs/PHASE1-架构设计.md)。

## 本地预览

纯静态站点，零构建依赖，两种方式任选：

1. 直接双击 `site/index.html`（`file://` 打开即可正常浏览）；
2. 本地服务（推荐）：
   ```bash
   cd site
   python -m http.server 8080
   # 浏览器访问 http://localhost:8080/
   ```

纯函数自测页：浏览器打开 `tests/selftest.html`，全部用例应显示 PASS。

## 目录结构

```
shuimu-web/
├── agent.md                       # 开发主协议（先读，再动代码）
├── README.md                      # 本文件
├── docs/
│   ├── ARCHITECTURE.md            # 总体架构设计（活文档：后端/部署/演进路线）
│   └── PHASE1-架构设计.md          # 前端门户接口契约
├── tests/selftest.html            # 纯函数自测页（浏览器原生断言）
└── site/                          # 站点部署单元（可整体拷贝部署）
    ├── index.html                 # 首页
    ├── about/index.html           # 科协介绍（占位页）
    ├── languages/index.html       # 编程语言（占位页）
    ├── tools/index.html           # 开发工具（占位页）
    ├── game/index.html            # 游戏开发（占位页）
    ├── web/index.html             # Web 开发（占位页）
    ├── machine-learning/index.html# 机器学习（占位页）
    ├── contests/index.html        # 科创竞赛（占位页）
    └── assets/                    # 全站共享资源（各板块如需图片，放各自文件夹内）
        ├── css/                   # 样式层（单一职责拆分，均 ≤250 行核心代码）
        │   ├── base.css           #   设计令牌 + reset + 通用板块标题
        │   ├── layout.css         #   顶条/页头/主导航/移动端抽屉
        │   ├── footer.css         #   页脚/版权条/返回顶部
        │   ├── home.css           #   首页：轮播横幅
        │   ├── home-about.css     #   首页：科协简介与统计卡
        │   ├── home-tech.css      #   首页：技术板块六宫格
        │   ├── home-news.css      #   首页：新闻/通知双栏
        │   └── subpage.css        #   子页：横幅与占位卡片
        └── js/                    # 行为层（经典脚本，全局命名空间 window.SMSK）
            ├── config/site.config.js  # 配置层：站点唯一配置源
            ├── infrastructure/        # 基础设施层：errors / dom / logger
            ├── services/             # 业务行为层：banner / nav / nav-collapse / backtop
            └── main.js               # 组装根：读配置 → 装配服务（引入顺序见其头注）
```

**板块目录约定**：每个板块一个文件夹（如 `site/languages/`），`index.html` 为该板块入口。
今后为板块补充图片、子页面等资源时，一律放在该板块自己的文件夹内，保持根目录与 `assets/` 不膨胀。

## 如何补充内容

| 要补充的内容 | 位置 |
| :--- | :--- |
| 首页轮播标语（3 张，现为占位） | `site/index.html` 中 `.slide` 区块（整体可替换） |
| 科协简介正文与统计数字 | `site/index.html` 的 `#about` 区块 |
| 六大板块卡片的描述文案 | `site/index.html` 的 `#tech` 区块内各 `.tech-card` |
| 新闻 / 公告条目 | `site/index.html` 的 `.news-flex` 双栏面板 |
| 板块页正式内容 | 对应 `site/<板块>/index.html` 的 `.placeholder-zone` 区域 |
| 板块主题标签（子主题入口） | 对应 `site/<板块>/index.html` 的 `.topic-list` |
| 板块图片/附件 | 放在对应板块文件夹内（如 `site/languages/images/`），页内相对引用 |
| 联系方式 / 版权 / 友情链接 | 各页 `.footer`（八页共用同一份标记，改时全局替换） |
| 站点参数（轮播间隔、日志级别等） | `site/assets/js/config/site.config.js`（唯一配置源） |
| 配色 / 字号 / 间距 | `site/assets/css/base.css` 的 CSS 变量（全站令牌） |

注意：新增板块页面时，建立 `site/<板块名>/index.html`，在 `body` 上写
`data-page="板块id"`，并在 `#nav-list` 增加对应 `<li data-page>`，`nav.service.js`
会自动完成当前页高亮。

## 开发协议

本仓库开发遵循 `agent.md` 主协议（契约先行两阶段法、文档注释基线、
架构分层、≤250 行/文件、统一日志、禁 console.log 等）。改动前请先阅读。

## 风格参考

- 视觉规范来源：[水木书院官网](https://smc.tsinghua.edu.cn/)（主色清华紫 `#660874`（辅助玫红 `#D93379`），
  中文主标题+英文副标题版式，页脚含书院门户式信息栏）
- 内容架构来源：[电子系科协文档站](https://docs.eesast.com/)
  （Languages / Tools / Game / Web / Machine Learning / Contests 板块划分）
