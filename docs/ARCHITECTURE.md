# 水木书院科协官网 · 总体架构设计（活文档）

> **文档定位**：本文件是全站架构的唯一权威记录。每个演进阶段开始前在此更新该阶段的
> 详细要求，完成后更新状态标记（`[ ]` → `[x]`），实现与本文不一致时**先改文档再改代码**。
> 前端门户的接口契约细节见 [PHASE1-架构设计.md](PHASE1-架构设计.md)（历史文档，仍有效）。
> 开发行为规范（分层/注释/无行数上限/统一日志等）以仓库根目录 `agent.md` 为准，本文不重复。

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
| 认证 | 账号密码 + 服务端令牌会话（2026-09-28 已落地：`api/user` 与 `api/administrator`，scrypt 哈希 + 文件会话，双体系前缀隔离）；JWT 暂不引入 | 复用现成方案，零新依赖；报名环节后续叠加学校邮箱验证 | FastAPI——若团队 Python 力量明显更强 |

## 3. 仓库目录结构（现状 + 规划）

```
shuimu-web/
├── agent.md                     # 开发主协议
├── README.md
├── package.json                 # 根工作区：TypeScript 依赖 + typecheck/build 脚本
├── .gitignore / .gitattributes  # 产物忽略规则 / 钩子脚本 LF 强制
├── hooks/pre-push               # 版本化 Git 钩子：推送前 TS 类型检查硬门禁
├── docs/
│   ├── ARCHITECTURE.md          # 本文档（总体架构·活文档）
│   └── PHASE1-架构设计.md        # 前端门户接口契约（历史，仍有效）
├── tests/
│   └── selftest.html            # 前端纯函数自测页
├── site/                        # 【现状·阶段0产物】官网门户（静态，部署单元）
│   ├── tsconfig.json            #   前端 TS 编译配置（strict，原位产出 .js）
│   ├── index/                   #   首页板块（自包含：index.html + assets/banner.service.ts
│   │                            #   + data/banners.js 轮播数据——2026-09-28 归位）
│   ├── user/                    #   用户板块（2026-09-28）：signin.html / signup.html
│   │                            #   + assets/{auth.service,avatar.service,signin,signup}.ts
│   │                            #   （登录注册 + 头像：悬停菜单/圆形裁剪上传）
│   ├── administrator/           #   管理员登录页（2026-09-28，深色控制台，独立工具页）
│   ├── admin/                   #   轮播管理页（需管理员登录；index.html + assets/admin.ts）
│   ├── <板块>/index.html         # 【2026-09-28 纯资料站】languages/ tools/ web/
│   │                            # essentials/（学校资源）about/（关于我们）
│   └── assets/                  #   共享资源区：
│       ├── css/{common,<板块>}/ #     样式分层；js/ 行为层（.ts 源码入库，
│       │                        #     types.d.ts 声明 window.SMSK 命名空间契约）
│       ├── img/                 #     图片素材库（2026-09-29 官网镜像 319 张分类归位：
│       │                        #     logo/slides/banner/icons/qrcode/texture/deco/
│       │                        #     photos/{people,events,campus}/illustration/
│       │                        #     diagram/poster + thu-logo.png）
│       ├── fonts/               #     字体（方正光钉粗简体 / DINCond-Black）
│       └── reference/           #     原站参考物（官网 CSS/HTML，不可直接渲染，
│                                #     仅供设计语言参考；检索工具在根 assets/）
├── user_data/                   # 普通用户运行时数据（服务端自动创建，不入库）
├── administrator_data/          # 管理员运行时数据（服务端自动创建，不入库）
├── server/                      # 【阶段1新建】后端应用（NestJS）
│   ├── src/
│   │   ├── main.ts              #   启动装配
│   │   ├── app.module.ts        #   根模块
│   │   ├── config/              #   配置层：环境变量注入（零硬编码）
│   │   ├── common/              #   通用横切件：统一异常过滤器（将来日志/拦截器）
│   │   └── api/                 #   【2026-09-28 重构】按前端使用的 API 板块
│   │       │                    #   垂直切分（package-by-feature）：
│   │       │                    #   一个 API 的 controller/service/repository/dto
│   │       │                    #   全部收拢在同目录，加新 API = 加新文件夹
│   │       ├── banners/         #     已上线：轮播（文件仓储，PUT 需管理员令牌；
│   │       │                    #     阶段2 换 Prisma 仅改此夹）
│   │       ├── user/            #     已上线：普通用户注册/登录/登出/会话（文件仓储）
│   │       ├── administrator/   #     已上线：管理员登录/登出/会话（与 user 核心类
│   │       │                    #     完全独立实现，令牌 "a."/"u." 前缀隔离，防提权）
│   │       ├── health/          #     阶段1：健康检查
│   │       ├── registrations/   #     阶段2：报名
│   │       ├── events/          #     阶段2：活动/赛事管理
│   │       └── admin/           #     阶段3：管理端聚合接口
│   ├── prisma/schema.prisma     #   数据库 schema（契约）
│   ├── test/                    #   单元/接口测试
│   └── Dockerfile
├── deploy/                      # 【阶段1新建】部署配置
│   ├── docker-compose.yml
│   └── nginx.conf               #   同域反代规则（/ → site，/api → app）
└── admin-web/                   # 【阶段3新建】管理后台 SPA（暂不创建）
```

> `server/` 建立前不预创建空目录；上表是目标形态，各阶段只建当期所需。

## 4. 后端组织与分层规范（对齐 agent.md Rule 2）

**组织方式（2026-09-28 重构定案）**：`src/api/<板块>/` 按前端使用的 API 垂直切分，
板块内四类文件同目录（`*.controller.ts` / `*.service.ts` / `*.repository.ts` / `*.dto.ts`），
不再拆 modules/ + infrastructure/ 两个顶层目录；跨板块复用的横切件进 `common/`，
配置进 `config/`。分层是**逻辑上的**（文件各司其职），物理上按板块收拢。
依据用户新规则：无单文件/函数行数上限，不为拆而拆。

| 层（逻辑） | 载体（物理位置） | 职责 | 禁止 |
| :--- | :--- | :--- | :--- |
| Presentation | `api/<板块>/*.controller.ts` + `*.dto.ts` | 参数校验、路由分发、响应格式化 | 写业务逻辑 |
| Service | `api/<板块>/*.service.ts` | 纯业务规则（报名校验、名额控制、权限判断） | 直接调数据库驱动/第三方 SDK |
| Infrastructure | `*.repository.ts`、`mail.service.ts` | 数据读写、邮件、存储；向上暴露抽象接口 | 被 Controller 直接调用 |
| Config | `config/` | 端口、数据库路径、邮箱密钥等唯一取值处 | 业务代码出现硬编码配置 |

硬性要求：DTO 先行（接口契约见各阶段章节）；统一 Logger（禁 console.log）；
自定义业务异常带上下文（禁静默吞错）；
模块间只经接口通信，仓储实例经 DI 注入。
（2026-09-28 起：按用户新规则取消单文件 ≤250 行/函数 ≤40 行上限——
不必为拆而拆，同类强关联代码可合并在板块目录内。）

## 5. 前端门户规范（现状维持）

- 现有 `site/assets/js` 四层结构（config/infrastructure/services/组装根）不变，契约见 PHASE1 文档；
- 门户一律**静态展示**，不直接调后端；需要动态数据的页面（如报名表单页）属于阶段2新增页面，
  放在对应板块文件夹内，fetch 同域 `/api/...`；
- 首页新闻/通知：阶段0~2 维持改 HTML（低频）；阶段3 管理后台就绪后切换为 `/api` 读取，
  切换时仅改数据来源，页面结构不动。

### 5.1 前端 TypeScript 工具链（2026-09-27 起）

前端行为脚本全面 TypeScript 化，**不引入打包器**（Vite/Webpack），纯 `tsc` 原位编译：

| 环节 | 约定 |
| :--- | :--- |
| 源码 | 全站 `.ts` 入库：`site/assets/js/**/*.ts`（公用层）+ 各板块 `site/<板块>/assets/*.ts`（index/user/administrator/admin）；`types.d.ts` 集中声明 `window.SMSK` 命名空间与共享契约（经典全局脚本、无 import/export，跨文件靠 `window.SMSK` 挂载 + 全局类型契约） |
| 编译 | `npm run build:site`（根 `package.json`，TypeScript 5.9，strict 全开 + `noEmitOnError`），`.ts` 原位产出同名 `.js`，**所有 HTML 的 `<script src>` 引用名不变** |
| 产物 | 编译 `.js` **不入库**（`.gitignore` 拦截）；克隆/拉取后需先构建才能本地预览（README 有说明）。例外：`site/index/data/banners.js` 是数据文件（后端读写、管理员维护），正常入库 |
| 检查 | `npm run typecheck` = site + server 双工程 `--noEmit` |
| 门禁 | `hooks/pre-push`（仓库已设 `core.hooksPath=hooks`，随克隆生效）：推送前跑双工程类型检查，**任何错误硬拦截**；`.gitattributes` 强制钩子 LF，防 Windows CRLF 破坏 sh 解析 |
| 迁移取舍 | 管理页内联 `<script>` 同步抽出为 `admin.ts`（纳入类型检查）；运行逻辑迁移前后逐行等价，仅类型化与 `var`→`const/let` |

> 迁移动机与边界：强类型收益在编译期（IDE 提示 + 门禁拦截），运行产物仍是经典脚本——
> 保持零运行时依赖、`file://` 可开、后续成员免打包概念。若未来门户复杂化（组件化/状态管理），
> 再评估升级 Vite + 框架整体重构。

## 6. 安全设计（定案原则）

> **2026-09-28 实况**：账号体系已按「服务端令牌会话」落地（非 JWT）：普通用户
> `u.` 令牌 / 管理员 `a.` 令牌，双体系核心类独立实现、会话分文件存储，
> `PUT /api/banners` 等写接口已挂管理员令牌强校验（401 拒绝）；密码 scrypt 加盐哈希，
> 运行时数据目录（user_data/、administrator_data/）已 gitignore 永不入库。
> 下文 JWT/角色分级/限流等为阶段 2~3 的目标形态，届时按需引入。

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
      （注：七板块为阶段0 形态；2026-09-28 按"纯资料站"方案精简为首页 + 五板块 + 关于我们）
- [x] 仓库建立，dev/main 分支策略确立，第一版推送 dev
- [x] 总体架构定案并写入本文档

### 阶段 1：后端骨架定型【进行中 · 2026-09-27 首批落地】
要求（开工前在此补充细节，完成打勾）：
- [x] 新建 `server/`（NestJS+TS）：config（全局配置模块）/common（统一异常过滤器）/
      infrastructure（banners 文件仓储）/modules（banners 业务模块）四层就绪
- [x] banners 内容接口：GET/PUT `/api/banners`（class-validator DTO 强校验、
      原子写回 site/index/data/banners.js、统一错误体），本地 curl+浏览器双重验证
- [ ] `deploy/` 部署编排（Dockerfile/compose/nginx）——待服务器环境确定后再创建，本机不预置
- [x] 管理端最初版：`site/admin/` 表单页（四接口编辑，保存即生效；2026-09-28 起挂管理员登录门槛）
- [x] 账号体系基础版（2026-09-28）：`api/user`（注册即登录/登录/登出/me，scrypt 加盐哈希、
      "u." 前缀令牌 7 天有效，数据落 user_data/）+ `api/administrator`（默认管理员
      admin/admin123456 首次运行种子，"a." 前缀令牌，数据落 administrator_data/；
      两套核心类完全独立，PUT /api/banners 仅认管理员令牌）；
      前端 `site/user/`（登录/注册极简卡 + 全站页头登录态）+ `site/administrator/`（深色登录页）
- [x] 头像上传（2026-09-28）：`api/user` 增 GET/PUT `/api/user/avatar`（魔数校验
      仅 PNG/JPEG、解码 ≤1MB、存 user_data/avatars/）；前端 avatar.service.ts 提供
      页头头像展示 + 悬停下拉菜单 + 拖拽/滚轮缩放的圆形裁剪编辑器（输出 256×256 PNG）
- [x] 前端全量 TypeScript 化：公用层 9 个源文件迁 `.ts`，随后板块专属脚本
      （index/user/administrator/admin 共 7 个）一并纳入，**现为 16 个 `.ts` 源文件**
      + `types.d.ts` 命名空间契约 +
      管理页脚本抽出；`hooks/pre-push` 类型检查硬门禁上线（详见 §5.1）
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

### 阶段 3：账号体系与管理后台【基础账号已上线 · 2026-09-28，见阶段1清单与 §9.2/9.3】
- [ ] 账号体系进阶：管理员创建管理员/默认口令更换、令牌刷新与角色权限
- [ ] `admin-web/` SPA（登录页 + 名单管理 + 活动编辑）
- [ ] 首页新闻切换为 API 数据源（见 §5）
- [ ] 审计日志查询界面
- [ ] （可选）Nginx 校园网 IP 限制

## 9. 接口契约附录（随阶段补充）

> 各阶段开工时在此登记 DTO 与接口清单（方法/路径/入参/出参/错误码），作为前后端与
> 测试的共同依据。

### 9.1 轮播内容（阶段1 · 已上线本地验证）

**数据契约 BannerSlide（四接口，存储于 site/index/data/banners.js 数据段，标准 JSON）**

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
| GET | /api/banners | —（可选 ?token=，公开读不校验） | { slides: BannerSlide[] } | 500 统一错误体 |
| PUT | /api/banners | { slides: BannerSlide[1..8], token: 管理员令牌 } | { saved: true, count, slides } | 400 校验失败；401 非管理员令牌/未登录 |

统一错误体：{ code, message, timestamp, path }；写入为原子写（临时文件+改名）。
`message` 为可直接展示的中文文案：DTO 校验失败时由 `common/unified-exception.filter.ts`
聚合全部字段级提示（多条以「；」连接，如「账号须为 4~30 位字母或数字」），
不再回落到框架默认的「Bad Request Exception」（2026-09-29 修正）。

### 9.2 普通用户（2026-09-28 · 已上线本地验证）

**格式契约**（前后端同规则，前端 SMSK.validateCredential 自测覆盖）：
账号 `^[A-Za-z0-9]{4,30}$`；密码 6~64 位。无手机/邮箱等任何验证渠道。
存储：`user_data/accounts.json`（scrypt 盐+哈希，绝不落明文）+ `user_data/sessions.json`
（令牌 "u."+randomBytes(32).hex，7 天有效，登出即删）。

**头像契约**（2026-09-28 新增）：仅 JPG/JPEG/PNG（服务端魔数校验，杜绝伪造扩展名）；
裁剪输出 256×256 PNG，base64 传输（解码后 ≤1MB，JSON body 上限 2MB 见 main.ts）；
存 `user_data/avatars/<account>.{png|jpg}`（换格式上传自动清旧文件，GET 即时 no-store）。
前端 `user/avatar.service.ts`：页头默认字母头像（auth.service 渲染）→ 拉取替换 →
悬停白框菜单"更改头像" → 文件选择（前端预验类型/大小）→ 拖拽平移 + 滚轮/滑杆
缩放的圆形裁剪弹层 → 确认上传即时刷新页头。

| 方法 | 路径 | 入参 | 出参 | 错误 |
| :--- | :--- | :--- | :--- | :--- |
| POST | /api/user/signup | { account, password } | { saved: true, token, account }（注册即登录） | 400 格式非法；409 账号已注册 |
| POST | /api/user/signin | { account, password } | { success: true, token, account } | 401 账号或密码错误 |
| POST | /api/user/signout | { token } | { success: true } | — |
| GET | /api/user/me | ?token= | { account } | 401 令牌无效/过期 |
| GET | /api/user/avatar | ?token= | PNG/JPEG 图片字节（Cache-Control: no-store） | 401 令牌无效；404 尚未设置 |
| PUT | /api/user/avatar | { token, image: base64 } | { saved: true } | 400 非 PNG/JPG 魔数或解码后 >1MB；401 令牌无效 |

### 9.3 管理员（2026-09-28 · 已上线本地验证）

**与 user 板块核心类完全独立实现**（service/repository/会话文件互不共享）：
`administrator_data/accounts.json`（首次运行种子默认管理员 admin/admin123456）+
`administrator_data/sessions.json`（令牌 "a." 前缀，7 天有效）。用户令牌在管理员
校验上永远 401（前缀与会话存储双重隔离，防提权）。无公开注册接口；
"管理员创建管理员"为后续扩展。

| 方法 | 路径 | 入参 | 出参 | 错误 |
| :--- | :--- | :--- | :--- | :--- |
| POST | /api/administrator/signin | { account, password } | { success: true, token, account } | 401 账号或密码错误 |
| POST | /api/administrator/signout | { token } | { success: true } | — |
| GET | /api/administrator/me | ?token= | { account } | 401 令牌无效/过期 |

## 10. Git 工作流（定案）

- `dev`：日常开发与内容补充，PR 审核后合并；
- `main`：只收发行版本，服务器只部署 main 产物；
- 内容（门户文案/板块文档）与代码走同一 PR 流程；
- 推送门禁：`hooks/pre-push` 对 site/server 双工程做 TypeScript 类型检查，
  有错即拦（本地可 `npm run typecheck` 自查）；
- 本机专用文件（cloudflared.exe、start-tunnel.ps1 等）不入库（见 .gitignore）。
