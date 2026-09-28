# 清华大学水木书院学生科学技术协会 官网（架构占位版）

水木书院科协官方网站。**内容架构**参照电子系科协文档站（[eesast/docs](https://github.com/eesast/docs)），
**视觉与语言风格**严格遵循[水木书院官网](https://smc.tsinghua.edu.cn/)（清华紫 `#660874`（PANTONE 259C）门户风格，渐变辅助玫红 `#D93379`：
中文主标题 + 英文副标题、“更多”链接、正式书院语体）。

当前版本：**首页完整可用，四个资料板块页均为占位页**（书院主页 + 编程语言介绍/开发工具/Web开发/学校必备），内容待科协成员按下方指引补充。

> **架构总纲**：全站采用「静态门户 + 后端 API + 渐进业务」架构，部署于自建服务器
>（Nginx 同域反代，阶段2起提供报名等业务接口）。总体设计、演进路线与各阶段验收
> 要求见 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**（活文档，改架构先改它）；
> 前端门户契约见 [docs/PHASE1-架构设计.md](docs/PHASE1-架构设计.md)。

## 本地预览

前端行为脚本以 **TypeScript 源码**入库（`site/assets/js/**/*.ts`），编译产物 `.js` 不入库，
本地预览前需先构建一次（需 Node.js）：

```bash
npm install          # 首次：安装 TypeScript（仓库根目录）
npm run build:site   # 编译 site/ 下全部 .ts → 同名 .js（原位生成）
```

构建完成后两种方式任选：

1. 直接双击 `site/index.html`（`file://` 打开即可正常浏览）；
2. 本地服务（推荐）：
   ```bash
   cd site
   python -m http.server 8080
   # 浏览器访问 http://localhost:8080/
   ```

改任何 `.ts` 后重新执行 `npm run build:site` 并刷新页面；推送时 `hooks/pre-push`
钩子会自动做全量类型检查（详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §5）。

纯函数自测页：浏览器打开 `tests/selftest.html`，全部用例应显示 PASS（自测加载的也是
编译产物，同样需先构建）。


**轮播内容管理（管理员入口）**：

```bash
# 1) 启动后端（首次先 cd server && npm install）
cd server && npm run dev        # 端口 3000
# 2) 浏览器打开 http://localhost:8123/site/admin/
#    表单编辑四接口（主办方/标题/介绍/跳转）→ 保存即写回 site/data/banners.js
```

线上（服务器部署后）直接访问 `https://域名/admin/`，无需启动任何本地进程。

## 目录结构

```
shuimu-web/
├── agent.md                       # 开发主协议（先读，再动代码）
├── README.md                      # 本文件
├── package.json                   # 根工作区：TypeScript 依赖与 typecheck/build 脚本
├── hooks/pre-push                 # Git 钩子：推送前类型检查硬门禁（core.hooksPath=hooks）
├── .gitattributes                 # 钩子脚本强制 LF（防 CRLF 破坏 sh 解析）
├── docs/
│   ├── ARCHITECTURE.md            # 总体架构设计（活文档：后端/部署/演进路线/TS 工具链）
│   └── PHASE1-架构设计.md          # 前端门户接口契约
├── tests/selftest.html            # 纯函数自测页（浏览器原生断言）
├── server/                        # 后端（阶段1起）：NestJS，按 API 板块组织（src/api/），/api/banners
└── site/                          # 站点部署单元（可整体拷贝部署）
    ├── index.html                 # 首页（书院主页）
    ├── data/banners.js            # 数据层：首页轮播内容（管理员维护入口，非编译产物）
    ├── admin/                     # 轮播管理页（表单 → PUT /api/banners）
    │   ├── index.html
    │   └── assets/admin.ts        # 管理页脚本源码（编译产物 admin.js 不入库）
    ├── languages/index.html       # 编程语言介绍（占位页）
    ├── tools/index.html           # 开发工具（占位页）
    ├── web/index.html             # Web 开发（占位页）
    ├── essentials/index.html      # 学校必备（占位页）
    ├── tsconfig.json              # 前端 TS 编译配置（strict 全开，原位产出 .js）
    └── assets/                    # 全站共享资源（各板块如需图片，放各自文件夹内）
        ├── css/                   # 样式层（2026-09-28 合并精简，无行数上限规则）
        │   ├── base.css           #   设计令牌 + reset + 通用板块标题
        │   ├── layout.css         #   顶条/页头/主导航/移动端抽屉
        │   ├── footer.css         #   页脚/版权条/返回顶部
        │   ├── home.css           #   首页合一：轮播/科协简介/资料板块/新闻公告
        │   └── subpage.css        #   子页：横幅与占位卡片
        └── js/                    # 行为层（TS 源码入库，编译 .js 不入库）
            ├── types.d.ts             # 类型层：window.SMSK 命名空间与共享契约
            ├── config/site.config.ts  # 配置层：站点唯一配置源
            ├── infrastructure/        # 基础设施层：errors / dom / logger
            ├── services/             # 业务行为层：banner / nav / nav-collapse / backtop
            └── main.ts               # 组装根：读配置 → 装配服务（加载顺序见其头注）
```

**板块目录约定**：每个板块一个文件夹（如 `site/languages/`），`index.html` 为该板块入口。
今后为板块补充图片、子页面等资源时，一律放在该板块自己的文件夹内，保持根目录与 `assets/` 不膨胀。

## 如何补充内容

| 要补充的内容 | 位置 |
| :--- | :--- |
| 首页轮播标语（管理员入口） | `site/data/banners.js`——改文字/加幻灯片只编辑此数据文件，无需动 HTML |
| 科协简介正文与统计数字 | `site/index.html` 的 `#about` 区块 |
| 六大板块卡片的描述文案 | `site/index.html` 的 `#tech` 区块内各 `.tech-card` |
| 新闻 / 公告条目 | `site/index.html` 的 `.news-flex` 双栏面板 |
| 板块页正式内容 | 对应 `site/<板块>/index.html` 的 `.placeholder-zone` 区域 |
| 板块主题标签（子主题入口） | 对应 `site/<板块>/index.html` 的 `.topic-list` |
| 板块图片/附件 | 放在对应板块文件夹内（如 `site/languages/images/`），页内相对引用 |
| 联系方式 / 版权 / 友情链接 | 各页 `.footer`（八页共用同一份标记，改时全局替换） |
| 站点参数（轮播间隔、日志级别等） | `site/assets/js/config/site.config.ts`（唯一配置源，改后需重新编译） |
| 配色 / 字号 / 间距 | `site/assets/css/base.css` 的 CSS 变量（全站令牌） |

注意：新增板块页面时，建立 `site/<板块名>/index.html`，在 `body` 上写
`data-page="板块id"`，并在 `#nav-list` 增加对应 `<li data-page>`，`nav.service.ts`
会自动完成当前页高亮。

## 开发协议

本仓库开发遵循 `agent.md` 主协议（契约先行两阶段法、文档注释基线、
架构分层、≤250 行/文件、统一日志、禁 console.log 等）。改动前请先阅读。

## 风格参考

- 视觉规范来源：[水木书院官网](https://smc.tsinghua.edu.cn/)（主色清华紫 `#660874`（辅助玫红 `#D93379`），
  中文主标题+英文副标题版式，页脚含书院门户式信息栏）
- 内容架构来源：[电子系科协文档站](https://docs.eesast.com/)
  （Languages / Tools / Game / Web / Machine Learning / Contests 板块划分）
