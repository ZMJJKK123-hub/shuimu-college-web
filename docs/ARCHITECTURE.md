# 水木书院科协官网 · 总体架构设计（活文档）

> **文档定位**：本文件是全站架构的唯一权威记录。每个演进阶段开始前在此更新该阶段的
> 详细要求，完成后更新状态标记（`[ ]` → `[x]`），实现与本文不一致时**先改文档再改代码**。
> 前端门户的接口契约细节见 [PHASE1-架构设计.md](PHASE1-架构设计.md)（历史文档，仍有效）。
> 开发行为规范（分层/注释/≤250 行/统一日志等）以仓库根目录 `agent.md` 为准，本文不重复。

---

## 1. 系统定位与总体架构

**定位**：部署于自建服务器的「官网门户 + 业务系统」。门户为静态展示（清华紫 `#660874` 官方视觉），业务（报名、互动、后台管理）由后端 API 按模块渐进叠加。

```
                         Nginx（80/443 · TLS · 静态资源 · 反向代理）
                        ┌─────────────┼──────────────────┐
                   /（官网门户）    /api（后端应用）    /admin（管理后台 SPA，阶段3）
                        │             │                   │
                 site/ 静态文件   NestJS(Node/TS)      React/Vue SPA
                                     │
                      ┌──────────────┼────────────────┐
                 Controller 层    Service 层      Infrastructure 层
                 (DTO 校验/路由)  (报名/活动/权限   (数据库仓储/邮件发送/
                                  等纯业务规则)     统一日志/对象存储)
                                     │
                                SQLite（起步）→ PostgreSQL（量级上来后迁移）
```

**同域反代原则**：门户、API、管理后台共用一个域名，按路径分流。无跨域问题；
静态请求不经过 Node；后端重启不影响门户展示。

## 2. 技术选型（定案）

| 位置 | 选型 | 理由 | 备选（触发条件） |
| :--- | :--- | :--- | :--- |
| 后端框架 | NestJS（TypeScript） | 模块化+DI+DTO+分层是框架强制用法，与 agent.md 一一对应；Web 板块即 JS 栈 | FastAPI——若团队 Python 力量明显更强 |
| 数据库 | SQLite → PostgreSQL | 千级报名量单文件零运维；ORM 隔离后迁移只改配置 | 直接上 PG——若一开始就有多人并发写 |
| ORM | Prisma | schema 即契约，自带迁移工具 | TypeORM |
| 官网门户 | 现有静态站（`site/`） | 已建成，Nginx 直接托管，与后端解耦 | — |
| 管理后台 | 单页应用（阶段3再建） | 只服务干事，不承担门户 SEO | — |
| 部署 | Docker Compose（nginx+app+db） | 换服务器/换届交接=拷 compose 文件 | systemd 直跑——若服务器不支持 Docker |
| 认证 | 学校邮箱验证 + JWT | 报名先做邮箱收集验证；账号体系阶段3引入 | — |

## 3. 仓库目录结构（现状 + 规划）

```
shuimu-web/
├── agent.md                     # 开发主协议
├── README.md
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md          # 本文档（总体架构·活文档）
│   └── PHASE1-架构设计.md        # 前端门户接口契约（历史，仍有效）
├── tests/
│   └── selftest.html            # 前端纯函数自测页
├── site/                        # 【现状·阶段0产物】官网门户（静态，部署单元）
│   ├── index.html
│   ├── <板块>/index.html         # about/ languages/ tools/ game/ web/
│   │                            # machine-learning/ contests/
│   └── assets/{css,js}/         # 前端分层样式与行为脚本
├── server/                      # 【阶段1新建】后端应用（NestJS）
│   ├── src/
│   │   ├── main.ts              #   启动装配
│   │   ├── app.module.ts        #   根模块
│   │   ├── config/              #   配置层：环境变量注入（零硬编码）
│   │   ├── common/              #   横切：统一日志、异常过滤器、拦截器
│   │   ├── modules/
│   │   │   ├── health/          #   阶段1：健康检查
│   │   │   ├── registrations/   #   阶段2：报名（controller/service/dto/repo）
│   │   │   ├── events/          #   阶段2：活动/赛事管理
│   │   │   ├── auth/            #   阶段3：账号与 JWT
│   │   │   └── admin/           #   阶段3：管理端聚合接口
│   │   └── infrastructure/      #   Prisma client、邮件服务、存储
│   ├── prisma/schema.prisma     #   数据库 schema（契约）
│   ├── test/                    #   单元/接口测试
│   └── Dockerfile
├── deploy/                      # 【阶段1新建】部署配置
│   ├── docker-compose.yml
│   └── nginx.conf               #   同域反代规则（/ → site，/api → app）
└── admin-web/                   # 【阶段3新建】管理后台 SPA（暂不创建）
```

> `server/` 建立前不预创建空目录；上表是目标形态，各阶段只建当期所需。

## 4. 后端分层规范（对齐 agent.md Rule 2）

| 层 | 载体 | 职责 | 禁止 |
| :--- | :--- | :--- | :--- |
| Presentation | `controller.ts` + `dto/` | 参数校验、路由分发、响应格式化 | 写业务逻辑 |
| Service | `*.service.ts` | 纯业务规则（报名校验、名额控制、权限判断） | 直接调数据库驱动/第三方 SDK |
| Infrastructure | `*.repository.ts`、`mail.service.ts` | 数据读写、邮件、存储；向上暴露抽象接口 | 被 Controller 直接调用 |
| Config | `config/` | 端口、数据库路径、邮箱密钥等唯一取值处 | 业务代码出现硬编码配置 |

硬性要求：DTO 先行（接口契约见各阶段章节）；统一 Logger（禁 console.log）；
自定义业务异常带上下文（禁静默吞错）；单文件核心代码 ≤250 行、函数 ≤40 行；
模块间只经接口通信，仓储实例经 DI 注入。

## 5. 前端门户规范（现状维持）

- 现有 `site/assets/js` 四层结构（config/infrastructure/services/组装根）不变，契约见 PHASE1 文档；
- 门户一律**静态展示**，不直接调后端；需要动态数据的页面（如报名表单页）属于阶段2新增页面，
  放在对应板块文件夹内，fetch 同域 `/api/...`；
- 首页新闻/通知：阶段0~2 维持改 HTML（低频）；阶段3 管理后台就绪后切换为 `/api` 读取，
  切换时仅改数据来源，页面结构不动。

## 6. 安全设计（定案原则）

1. `/admin` 页面公网可达是**既定假设**，安全不靠藏路径：
   - 所有管理操作走 `/api/admin/*`，每个请求校验 JWT，未登录一律 401；
   - 角色分级：超级管理员（建账号/删数据）＞普通干事（导名单/编辑活动）；
   - 登录失败限流（如同 IP 5 次/分钟）+ 全站 HTTPS；
   - 可选加固：Nginx 限制 `/admin` 仅校园网 IP 段访问；
   - 管理操作全量审计日志（谁/何时/改了什么）。
2. 报名接口（公开）：限流、蜜罐字段防脚本、邮箱域名校验（@tsinghua.edu.cn 等学校邮箱）。
3. 敏感配置（数据库口令、邮箱密钥）只存服务器 `.env`（已列 .gitignore），永不入库。

## 7. 部署与发布

- 服务器上只运行 **main 分支的构建产物**；dev 分支可选部署到 `dev.域名` 预览；
- Docker Compose 编排 `nginx + server + (db)`；`site/` 与 `admin-web/` 构建产物由 Nginx 托管；
- 发布流程：PR 到 dev → 审核合并 → main 打 tag → 服务器 `git pull && docker compose up -d --build`；
- 备份：数据库文件每日定时备份到异机/对象存储（阶段2起强制）。

## 8. 演进路线与阶段验收要求

### 阶段 0：门户上线【已完成 ✅ 2026-09-27】
- [x] 静态门户（首页 + 七板块占位页）建成，紫色书院风格，本地验证通过
- [x] 仓库建立，dev/main 分支策略确立，第一版推送 dev
- [x] 总体架构定案并写入本文档

### 阶段 1：后端骨架定型【进行中 · 2026-09-27 首批落地】
要求（开工前在此补充细节，完成打勾）：
- [x] 新建 `server/`（NestJS+TS）：config（全局配置模块）/common（统一异常过滤器）/
      infrastructure（banners 文件仓储）/modules（banners 业务模块）四层就绪
- [x] banners 内容接口：GET/PUT `/api/banners`（class-validator DTO 强校验、
      原子写回 site/data/banners.js、统一错误体），本地 curl+浏览器双重验证
- [ ] `deploy/` 部署编排（Dockerfile/compose/nginx）——待服务器环境确定后再创建，本机不预置
- [x] 管理端最初版：`site/admin/` 表单页（四接口编辑，保存即生效，无账号体系）
- [ ] `GET /api/health` 健康检查接口 + 单元测试（jest 待接入）
- [ ] Prisma 接入 SQLite，schema 迁移机制跑通（阶段2 报名系统前完成）
- [ ] 服务器购置/分配，docker compose 上线（HTTPS 证书）
- [x] DTO/接口契约登记到本文档 §9

### 阶段 2：报名系统（第一个业务模块）【未开始】
- [ ] 数据模型：活动/赛事表、报名记录表（含验证状态、时间戳）
- [ ] 公开接口：活动列表、报名提交（限流+邮箱域名校验+防重）、邮箱验证
- [ ] 管理接口（JWT 保护）：名单查询、CSV 导出、报名截止/名额控制
- [ ] 门户新增报名表单页（同域 fetch `/api`）
- [ ] 数据库每日备份脚本上线
- [ ] 契约：DTO 定义与接口清单补充到 §9

### 阶段 3：账号体系与管理后台【未开始】
- [ ] auth 模块：干事账号、JWT 签发/刷新、角色权限
- [ ] `admin-web/` SPA（登录页 + 名单管理 + 活动编辑）
- [ ] 首页新闻切换为 API 数据源（见 §5）
- [ ] 审计日志查询界面
- [ ] （可选）Nginx 校园网 IP 限制

## 9. 接口契约附录（随阶段补充）

> 各阶段开工时在此登记 DTO 与接口清单（方法/路径/入参/出参/错误码），作为前后端与
> 测试的共同依据。

### 9.1 轮播内容（阶段1 · 已上线本地验证）

**数据契约 BannerSlide（四接口，存储于 site/data/banners.js 数据段，标准 JSON）**

| 字段 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| organizer | string ≤100 | 否 | 主办方（顶部胶囊小字，空则不显示该行） |
| title | string ≤60 | 是 | 推送标题（大标语） |
| description | string ≤300 | 否 | 介绍（副文案） |
| link | {label?: string ≤30, href: string ≤500} | 否 | 跳转按钮（空/null 则无按钮） |
| （底色主题） | — | — | 无需填写，前端按顺序自动轮换 s1/s2/s3 |

**HTTP 接口**

| 方法 | 路径 | 入参 | 出参 | 错误 |
| :--- | :--- | :--- | :--- | :--- |
| GET | /api/banners | — | { slides: BannerSlide[] } | 500 统一错误体 |
| PUT | /api/banners | { slides: BannerSlide[1..8] } | { saved: true, count, slides } | 400 校验失败（统一错误体） |

统一错误体：{ code, message, timestamp, path }；写入为原子写（临时文件+改名）。

## 10. Git 工作流（定案）

- `dev`：日常开发与内容补充，PR 审核后合并；
- `main`：只收发行版本，服务器只部署 main 产物；
- 内容（门户文案/板块文档）与代码走同一 PR 流程；
- 本机专用文件（cloudflared.exe、start-tunnel.ps1 等）不入库（见 .gitignore）。
