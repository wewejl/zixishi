# 多智能体并发开发任务书

本文档用于后续把「静谧空间」MVP 拆给多个智能体并发实现。所有 worker 必须先读本文档，再读各自任务包指定的输入文档。

## 1. 总体原则

1. 文档口径优先：接口路径、字段名、状态枚举、错误码、认证方式以 `API_CONTRACT.md`、`DATA_MODEL.md`、`FRONTEND_PAGE_MAP.md` 当前版本为准；如三份文档仍有不一致，先同步契约和任务书再落地实现。
2. 文件边界优先：每个 worker 只能修改任务包列出的可修改文件范围。没有写入授权的文件一律只读，不要顺手重构、格式化或覆盖。
3. 小步验收：每个任务包先交付最小可运行版本，再补业务细节。每次提交前至少跑本任务包建议验收命令。
4. 不要互相覆盖：多人并发时不要抢改同一个 `.vue`、同一个 service、同一个后端路由模块或同一个迁移文件。前端页面壳先完成并冻结空壳，页面 A/B 后接手业务实现；如发现边界冲突，先停下同步任务书或契约。
5. 保留兼容：当前已存在 `GET /api/health`，响应里的 `ok` 和 `service` 字段不得删除或改名。
6. 数据一致性优先：预约冲突、订单支付、权益发放、学习会话结算、门禁授权必须放在 repository 或 service 的事务边界内处理。
7. Mock 边界清晰：MVP 可 mock 微信登录、微信支付、门禁硬件和部分统计，但接口形态必须保留真实接入所需字段。

## 2. 并发批次规划

### 第 0 批：契约同步

目标：所有 worker 对齐三份输入文档和文件边界，不直接写业务代码。

可并发：只读验收、任务拆解、接口映射表整理可以并发。

必须完成后才能进入后续批次：

- 确认后端接口以 `API_CONTRACT.md` 为准。
- 确认数据表、种子数据和事务要求以 `DATA_MODEL.md` 为准。
- 确认前端页面、组件拆分和目录边界以 `FRONTEND_PAGE_MAP.md` 为准。
- 确认当前任务书是后续 worker 的并发边界依据。

建议验收命令：

```sh
sed -n '1,220p' API_CONTRACT.md
sed -n '1,220p' DATA_MODEL.md
sed -n '1,220p' FRONTEND_PAGE_MAP.md
```

### 第 1 批：工程基础

目标：建立后端模块化基础、数据库迁移框架、前端路由壳、API SDK 和登录态骨架。

可并发：

- 工程基建与前端路由壳可并发。
- 前端 API SDK 与前端登录态可与工程基建并发；API SDK 负责创建全部 service，登录态只改 stores 和 login 页面。

依赖：

- 后端业务 API 任务必须等工程基建确定路由、repository、错误响应和认证中间件约定后再全面展开。
- 前端页面 A/B 必须等路由壳完成并冻结页面空壳、API SDK 基本函数命名稳定后再进入主实现。

### 第 2 批：后端数据/API

目标：按数据模型完成 SQLite 迁移、repository、种子数据和契约 API。

可并发：

- 后端迁移完成后，`auth/me/stores/seats`、`reservations/study-session`、`packages/orders/access` 三个后端业务包可以并发。

依赖：

- 所有后端业务包必须等待后端迁移包完成主表、索引、种子数据和基础 repository 边界。
- `reservations/study-session` 依赖用户、门店、区域、座位、权益表。
- `packages/orders/access` 依赖套餐、订单、权益、门禁表；订单支付发放权益要与 reservation 支付确认规则对齐。

### 第 3 批：前端壳/API SDK/页面

目标：按页面地图实现 uni-app 微信小程序页面、组件、请求封装和登录态。

可并发：

- 页面 A 与页面 B 可以真正并发，因为文件边界互不重叠。
- 静态资源可与页面 A/B 并发，但资源路径要提前约定。

依赖：

- 页面 A/B 必须等前端路由壳创建并冻结页面路径和空壳后再实现，页面壳和页面 A/B 不并行改同一 `.vue`。
- 页面 A/B 必须调用 API SDK 暴露的 service 函数，不直接散落 `uni.request`。
- API SDK 可先按契约写函数，后端没完成时用示例数据或错误态兜底，但不得改接口路径。

### 第 4 批：联调验收

目标：端到端跑通登录、首页摘要、预约、签到/结束学习、套餐下单/mock 支付、门禁开门、长期通行码、个人中心和订单记录。

依赖：

- 必须等待第 2 批后端 API 和第 3 批前端页面主流程完成。
- 验收 worker 只读或只提交明确的测试/文档修复；不要重写业务实现。

## 3. 全局接口映射提醒

后端必须实现的 MVP 契约路径包括：

- `GET /api/health`
- `POST /api/auth/wechat-login`
- `GET /api/me`
- `GET /api/stores/{storeId}/summary`
- `GET /api/stores/{storeId}/seat-availability`
- `POST /api/reservations`
- `GET /api/reservations/current`
- `GET /api/reservations`
- `GET /api/reservations/{reservationId}`
- `POST /api/reservations/{reservationId}/cancel`
- `GET /api/study-session/current`
- `POST /api/study-session/check-in`
- `POST /api/study-session/{sessionId}/end`
- `GET /api/packages`
- `POST /api/orders`
- `POST /api/orders/{orderId}/mock-pay`
- `GET /api/orders`
- `POST /api/access/unlock`
- `GET /api/access/long-term-code`
- `POST /api/access/long-term-code/refresh`

前端服务命名可以使用业务语义，例如 `bookingService.createReservation()`，但内部路径必须调用上述契约路径。示例数据中的套餐 ID 使用 `plan_20h`、`plan_month`，门店 ID 使用 `store_default`。

## 4. 智能体任务包

### 任务包 1：工程基建

批次：第 1 批。

目标：

- 为后端建立可扩展的 Express 模块结构。
- 统一错误响应格式、requestId、认证中间件、路由挂载方式和基础工具函数。
- 保持 `GET /api/health` 兼容。

可修改文件范围：

- `backend/src/server.js`
- `backend/src/middleware/**`
- `backend/src/routes/**`
- `backend/src/services/**`
- `backend/src/repositories/**`
- `backend/src/utils/**`
- `backend/src/config/**`
- `backend/package.json`
- `backend/package-lock.json`
- 必要时新增 `backend/src/app.js`

不可修改文件范围：

- `API_CONTRACT.md`
- `DATA_MODEL.md`
- `FRONTEND_PAGE_MAP.md`
- `PARALLEL_DEVELOPMENT_PLAN.md`
- `frontend/**`
- `stitch-export-4039027564478172202/**`
- `backend/data/zixishi.sqlite`，除非任务明确要求重建本地开发库

输入文档：

- `API_CONTRACT.md` 第 1 章、第 3.1 节、第 5 章
- `DATA_MODEL.md` 第 2 章、第 5 章

完成标准：

- `npm start` 能启动后端。
- `GET /api/health` 返回至少 `{ "ok": true, "service": "zixishi-backend" }`。
- 未认证业务接口有统一 `401` 错误结构。
- 业务错误符合 `{ error: { code, message, requestId, details } }`。
- 路由、service、repository 的目录约定可供后端业务包直接接入。

建议验收命令：

```sh
cd backend && npm start
curl -s http://localhost:3000/api/health
curl -s -i http://localhost:3000/api/me
```

### 任务包 2：后端迁移

批次：第 1 批到第 2 批之间，属于后端业务的前置任务。

目标：

- 按 `DATA_MODEL.md` 建立 SQLite MVP 表、索引、外键、种子数据。
- 开启 `PRAGMA foreign_keys = ON`、建议补充 WAL 和 `busy_timeout`。
- 提供 repository 基础查询能力和事务封装。

可修改文件范围：

- `backend/src/db.js`
- `backend/src/migrations/**`
- `backend/src/repositories/**`
- `backend/src/seed/**`
- `backend/src/utils/id.js`
- `backend/src/utils/time.js`
- 必要时修改 `backend/src/server.js` 中的迁移初始化调用

不可修改文件范围：

- `API_CONTRACT.md`
- `DATA_MODEL.md`
- `FRONTEND_PAGE_MAP.md`
- `PARALLEL_DEVELOPMENT_PLAN.md`
- `frontend/**`
- 非本任务需要的后端业务路由文件

输入文档：

- `DATA_MODEL.md` 全文，重点第 3、4、6、7 章
- `API_CONTRACT.md` 通用对象和状态枚举

完成标准：

- 创建 `users`、`wechat_identities`、`stores`、`store_areas`、`seats`、`reservations`、`study_sessions`、`plans`、`orders`、`order_items`、`user_entitlements`、`entitlement_ledger`、`access_devices`、`access_codes`、`access_events`、`daily_store_stats` 等 MVP 表。
- 默认门店、区域、座位、套餐、mock 用户和可选权益种子数据可重复执行且幂等。
- 外键和关键唯一索引生效。
- repository 支持显式事务，供预约冲突、订单支付、权益扣减使用。

建议验收命令：

```sh
cd backend && npm start
node -e "import('./src/db.js').then(({db})=>{console.log(db.prepare(\"select name from sqlite_master where type='table' order by name\").all())})"
node -e "import('./src/db.js').then(({db})=>{console.log(db.prepare('select id,name,status from stores').all())})"
```

### 任务包 3：后端 auth/me/stores/seats

批次：第 2 批。

目标：

- 实现 mock 微信登录、当前用户、门店摘要、座位可用性 API。
- 为前端首页、预约页和个人中心提供最小可用数据。

可修改文件范围：

- `backend/src/routes/auth*.js`
- `backend/src/routes/me*.js`
- `backend/src/routes/stores*.js`
- `backend/src/services/auth*.js`
- `backend/src/services/user*.js`
- `backend/src/services/store*.js`
- `backend/src/services/seat*.js`
- `backend/src/repositories/UserRepository*.js`
- `backend/src/repositories/StoreRepository*.js`
- `backend/src/repositories/SeatRepository*.js`
- 相关测试文件，如 `backend/test/**`

不可修改文件范围：

- 前端文件
- 迁移文件，除非先与后端迁移 worker 同步
- 预约、订单、门禁业务路由文件
- 三份契约文档和本文档

输入文档：

- `API_CONTRACT.md` 第 1、2、3.2、3.3、3.4、3.5 节
- `DATA_MODEL.md` `users`、`wechat_identities`、`stores`、`store_areas`、`seats`、`user_entitlements`、`study_sessions`、`daily_store_stats`

完成标准：

- `POST /api/auth/wechat-login` 接受任意非空 `code`，返回 mock token、Bearer 类型、过期时间和用户对象。
- `GET /api/me` 需要认证，返回 user、stats、entitlement。
- `GET /api/stores/{storeId}/summary` 返回门店、可用座位数、学习人数、福利和推荐座位。
- `GET /api/stores/{storeId}/seat-availability` 支持 `date/startAt/endAt/features` 查询，座位状态与有效预约冲突一致。
- 错误状态使用契约错误格式。

建议验收命令：

```sh
cd backend && npm start
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/wechat-login -H 'Content-Type: application/json' -d '{"code":"dev"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).accessToken))")
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/me
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/stores/store_default/summary
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/stores/store_default/seat-availability?date=2026-05-18"
```

### 任务包 4：后端 reservations/study-session

批次：第 2 批。

目标：

- 实现预约创建、详情、取消、当前学习会话、签到、结束学习会话。
- 保证座位冲突、用户重叠预约、权益锁定/释放/扣减的事务一致性。

可修改文件范围：

- `backend/src/routes/reservations*.js`
- `backend/src/routes/study-session*.js`
- `backend/src/services/reservation*.js`
- `backend/src/services/studySession*.js`
- `backend/src/services/entitlement*.js` 中与预约扣减相关的函数
- `backend/src/repositories/ReservationRepository*.js`
- `backend/src/repositories/StudySessionRepository*.js`
- `backend/src/repositories/EntitlementRepository*.js`
- 相关测试文件，如 `backend/test/**`

不可修改文件范围：

- 前端文件
- 迁移文件，除非先与后端迁移 worker 同步
- auth、门店、套餐订单、门禁路由的非必要实现
- 三份契约文档和本文档

输入文档：

- `API_CONTRACT.md` 第 3.6 到 3.11 节
- `DATA_MODEL.md` `reservations`、`study_sessions`、`user_entitlements`、`entitlement_ledger`、第 4.1 和 4.2 节

完成标准：

- `POST /api/reservations` 能创建 `confirmed` 或 `pending_payment` 预约。
- 同一座位重叠时间返回 `409 SEAT_NOT_AVAILABLE`。
- 同一用户重叠有效预约被阻止。
- `GET /api/reservations/current` 返回当前用户待支付、已确认或已签到的当前预约，无当前预约时返回空对象或契约约定的空值。
- `GET /api/reservations` 返回当前用户预约记录并支持契约分页结构。
- `GET /api/reservations/{reservationId}` 只允许查看本人预约。
- `POST /api/reservations/{reservationId}/cancel` 能释放未使用权益并置为 `cancelled`。
- `GET /api/study-session/current` 无会话返回 `{ "session": null }`。
- `POST /api/study-session/check-in` 对同一预约重复调用幂等。
- `POST /api/study-session/{sessionId}/end` 结束会话、释放座位并结算权益。

建议验收命令：

```sh
cd backend && npm start
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/wechat-login -H 'Content-Type: application/json' -d '{"code":"dev"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).accessToken))")
curl -s -X POST http://localhost:3000/api/reservations -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"storeId":"store_default","seatId":"seat_q01","startAt":"2026-05-18T10:00:00+08:00","endAt":"2026-05-18T12:00:00+08:00","useEntitlement":true}'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/study-session/current
```

### 任务包 5：后端 packages/orders/access

批次：第 2 批。

目标：

- 实现套餐列表、创建订单、mock 支付、订单列表、一键开门、长期通行码和刷新。
- 保证订单支付幂等、权益发放事务一致、门禁事件可审计。

可修改文件范围：

- `backend/src/routes/packages*.js`
- `backend/src/routes/orders*.js`
- `backend/src/routes/access*.js`
- `backend/src/services/package*.js`
- `backend/src/services/order*.js`
- `backend/src/services/payment*.js`
- `backend/src/services/access*.js`
- `backend/src/services/entitlement*.js` 中与订单发放相关的函数
- `backend/src/repositories/PlanRepository*.js`
- `backend/src/repositories/OrderRepository*.js`
- `backend/src/repositories/EntitlementRepository*.js`
- `backend/src/repositories/AccessRepository*.js`
- 相关测试文件，如 `backend/test/**`

不可修改文件范围：

- 前端文件
- 迁移文件，除非先与后端迁移 worker 同步
- auth、stores、reservations、study-session 路由的非必要实现
- 三份契约文档和本文档

输入文档：

- `API_CONTRACT.md` 第 3.12 到 3.18 节、第 4 章
- `DATA_MODEL.md` `plans`、`orders`、`order_items`、`user_entitlements`、`entitlement_ledger`、`access_devices`、`access_codes`、`access_events`、第 4.3 到 4.5 节

完成标准：

- `GET /api/packages` 返回上架套餐，字段为契约的 `priceCent`、`durationDays`、`includedMinutes` 等。
- `POST /api/orders` 支持 `type=package` 和 `type=reservation`。
- `POST /api/orders/{orderId}/mock-pay` 幂等，套餐订单支付后发放权益，预约订单支付后确认预约。
- `GET /api/orders` 只返回当前用户订单并支持契约分页结构。
- `POST /api/access/unlock` 校验有效预约、当前会话或长期权益，并写入门禁事件。
- `GET /api/access/long-term-code` 和 `POST /api/access/long-term-code/refresh` 仅长期会员或有效长期权益可用。

建议验收命令：

```sh
cd backend && npm start
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/wechat-login -H 'Content-Type: application/json' -d '{"code":"dev"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).accessToken))")
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/packages?storeId=store_default"
curl -s -X POST http://localhost:3000/api/orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"type":"package","packageId":"plan_20h","storeId":"store_default"}'
curl -s -X POST http://localhost:3000/api/access/unlock -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"storeId":"store_default","deviceId":"access_device_main","source":"mini_program","clientContext":{"bluetoothConnected":true}}'
```

### 任务包 6：前端路由壳

批次：第 1 批。

目标：

- 按 `FRONTEND_PAGE_MAP.md` 创建 uni-app 页面目录、页面空壳、tabBar 和导航标题。
- 为页面 A/B 提供稳定路由，不实现深层业务逻辑。

可修改文件范围：

- `frontend/src/pages.json`
- `frontend/src/pages/home/index.vue`
- `frontend/src/pages/booking/index.vue`
- `frontend/src/pages/booking/confirm.vue`
- `frontend/src/pages/access/index.vue`
- `frontend/src/pages/packages/index.vue`
- `frontend/src/pages/packages/detail.vue`
- `frontend/src/pages/profile/index.vue`
- `frontend/src/pages/seat-status/index.vue`
- `frontend/src/pages/long-term-password/index.vue`
- `frontend/src/pages/orders/index.vue`
- `frontend/src/pages/login/index.vue`
- `frontend/src/pages/webview/index.vue`
- `frontend/src/static/tabbar/**`，仅限占位 tabBar 图标

不可修改文件范围：

- `frontend/src/api/**`
- `frontend/src/stores/**`
- `frontend/src/components/**` 的业务组件
- `backend/**`
- 三份契约文档和本文档

输入文档：

- `FRONTEND_PAGE_MAP.md` 第 1、3、4、5、7 章
- `API_CONTRACT.md` 仅用于页面命名和接口依赖理解

完成标准：

- `pages.json` 配置 5 个 tabBar：`pages/home/index`、`pages/booking/index`、`pages/access/index`、`pages/packages/index`、`pages/profile/index`。
- 非 tab 页面路径存在并可被 `uni.navigateTo` 访问。
- tabBar 图标引用本地 `frontend/src/static/tabbar/**`，不使用远程图标或 Material Symbols。
- 每个页面空壳可编译，页面内只保留最小布局和插槽位置，不抢业务页面实现。

建议验收命令：

```sh
cd frontend && npm run build:h5
node -e "const p=require('./src/pages.json');console.log(p.pages.map(x=>x.path));console.log(p.tabBar.list.map(x=>x.pagePath))"
```

### 任务包 7A：前端 API SDK

批次：第 1 批到第 3 批。

目标：

- 集中封装 `uni.request`、baseURL、Authorization header 和错误处理。
- 按 `API_CONTRACT.md` 暴露业务 service 函数，供页面调用。

可修改文件范围：

- `frontend/src/api/request.js`
- `frontend/src/api/services/auth.js`
- `frontend/src/api/services/user.js`
- `frontend/src/api/services/store.js`
- `frontend/src/api/services/seat.js`
- `frontend/src/api/services/reservation.js`
- `frontend/src/api/services/studySession.js`
- `frontend/src/api/services/package.js`
- `frontend/src/api/services/order.js`
- `frontend/src/api/services/access.js`
- `frontend/src/utils/date.js`
- `frontend/src/utils/price.js`
- `frontend/src/utils/constants.js`

不可修改文件范围：

- 页面 A/B 的业务页面文件
- `frontend/src/stores/**`
- `frontend/src/pages/login/**`
- `frontend/src/pages.json`，除非与路由壳 worker 明确同步
- `backend/**`
- 三份契约文档和本文档

输入文档：

- `API_CONTRACT.md` 全文
- `FRONTEND_PAGE_MAP.md` 第 2、3、4、6 章

完成标准：

- 页面内不需要直接写 `uni.request` 即可调用全部 MVP API。
- `request.js` 能读取外部登录态提供的 token，并在登录过期时抛出统一错误；token 持久化、清理和页面跳转由登录态任务负责。
- `authService.wechatLogin()` 调用 `POST /api/auth/wechat-login`。
- `userService.getMe()` 调用 `GET /api/me`，不要调用未契约化的 `/api/users/me`。
- `reservationService` 使用 `/api/reservations`，不要使用未契约化的 `/api/bookings`。
- `reservationService.getCurrent()` 调用 `GET /api/reservations/current`。
- `reservationService.listReservations()` 调用 `GET /api/reservations`。
- 错误对象保留 `code/message/requestId/details` 供页面展示。

建议验收命令：

```sh
cd frontend && npm run build:h5
rg "uni.request" src/pages src/components
rg "/api/bookings|/api/users/me|/api/spaces/current" src || true
```

### 任务包 7B：前端登录态

批次：第 1 批到第 3 批。

目标：

- 实现 token 持久化、读取、清理、登录过期处理、用户资料 store 和登录页交互。
- 调用 API SDK 已暴露的 `authService`、`userService`，不自行创建或修改 service。

可修改文件范围：

- `frontend/src/stores/auth.js`
- `frontend/src/stores/user.js`
- `frontend/src/stores/booking.js`
- `frontend/src/pages/login/**`

不可修改文件范围：

- `frontend/src/api/services/**`
- `frontend/src/api/request.js`，除非与 API SDK worker 明确同步
- 页面 A/B 的业务页面文件
- `frontend/src/pages.json`
- `backend/**`
- 三份契约文档和本文档

完成标准：

- 登录页通过 `authService.wechatLogin()` 完成登录，不直接写 `uni.request`。
- 登录成功后保存 token，并通过 `userService.getMe()` 拉取用户资料。
- 退出登录只清本地 token 和用户态，MVP 不调用未契约化的 `POST /api/auth/logout`。
- 登录态代码不修改 `api/services/`，避免与 API SDK worker 冲突。

### 任务包 8：前端页面 A

批次：第 3 批。

目标：

- 实现首页、预约页、确认预约页、座位状态页及相关局部组件。
- 覆盖门店摘要、座位可用性、创建预约、取消预约、签到、结束学习会话等主流程。

可修改文件范围：

- `frontend/src/pages/home/**`
- `frontend/src/pages/booking/**`
- `frontend/src/pages/seat-status/**`
- `frontend/src/components/home/**`
- `frontend/src/components/booking/**`
- `frontend/src/components/seat-status/**`
- 必要时新增 `frontend/src/components/common/**` 中本页面专用但可复用的展示组件，需避免覆盖公共组件 worker 已有文件

不可修改文件范围：

- `frontend/src/pages/access/**`
- `frontend/src/pages/long-term-password/**`
- `frontend/src/pages/packages/**`
- `frontend/src/pages/profile/**`
- `frontend/src/pages/orders/**`
- `frontend/src/api/**`，除非与 API SDK worker 同步
- `frontend/src/pages.json`
- `backend/**`
- 三份契约文档和本文档

输入文档：

- `FRONTEND_PAGE_MAP.md` 第 1.1、1.2、2.1、2.2、2.6、3、4、5 章
- `API_CONTRACT.md` 第 3.4 到 3.11 节
- Stitch 原型：`01_home.html`、`02_seat_booking.html`、`03_seat_status.html`、`08_quiet_focus_study_space_app.html`

完成标准：

- 首页展示门店营业状态、可用座位、推荐座位、当前预约/会话摘要和快捷入口。
- 预约页支持日期、时间、特性筛选、座位状态、选中座位和提交预约。
- 确认预约页展示所选门店、日期、时段、座位、价格和确认按钮；`POST /api/reservations` 返回 `order` 时调用 `POST /api/orders/{orderId}/mock-pay`，支付后刷新当前预约/座位状态。
- 座位状态页展示当前预约或会话、倒计时、取消、签到、结束学习入口。
- 所有 API 调用通过 SDK，不直接写 `uni.request`。
- 加载态、空态、错误态、未登录态均有基本表现。

建议验收命令：

```sh
cd frontend && npm run build:h5
rg "uni.request" src/pages/home src/pages/booking src/pages/seat-status src/components/home src/components/booking src/components/seat-status || true
rg "reservations|seat-availability|study-session" src/pages/home src/pages/booking src/pages/seat-status src/components/home src/components/booking src/components/seat-status
```

### 任务包 9：前端页面 B

批次：第 3 批。

目标：

- 实现门禁、长期通行码、商城、套餐详情、我的、订单记录页面及相关局部组件。
- 覆盖套餐购买、mock 支付、订单列表、一键开门、长期通行码刷新、个人中心展示等主流程。

可修改文件范围：

- `frontend/src/pages/access/**`
- `frontend/src/pages/long-term-password/**`
- `frontend/src/pages/packages/**`
- `frontend/src/pages/profile/**`
- `frontend/src/pages/orders/**`
- `frontend/src/components/access/**`
- `frontend/src/components/packages/**`
- `frontend/src/components/profile/**`
- `frontend/src/components/orders/**`
- 必要时新增 `frontend/src/components/common/**` 中本页面专用但可复用的展示组件，需避免覆盖公共组件 worker 已有文件

不可修改文件范围：

- `frontend/src/pages/home/**`
- `frontend/src/pages/booking/**`
- `frontend/src/pages/seat-status/**`
- `frontend/src/api/**`，除非与 API SDK worker 同步
- `frontend/src/pages.json`
- `backend/**`
- 三份契约文档和本文档

输入文档：

- `FRONTEND_PAGE_MAP.md` 第 1.1、1.2、2.3、2.4、2.5、2.7、3、4、5 章
- `API_CONTRACT.md` 第 3.3、3.12 到 3.18 节
- Stitch 原型：`04_smart_access.html`、`05_long_term_password.html`、`06_profile.html`、`07_purchase_package.html`

完成标准：

- 门禁页展示权限状态、一键开门按钮、最近状态和错误反馈。
- 长期通行码页支持查看和刷新，处理 `403 FORBIDDEN`。
- 商城页展示套餐、权益摘要、创建订单和 mock 支付流程。
- 我的页展示用户资料、会员/权益、预约/订单/通行入口和登录提示。
- 订单记录页支持订单分页列表和状态展示。
- 所有 API 调用通过 SDK，不直接写 `uni.request`。
- 加载态、空态、错误态、未登录态均有基本表现。

建议验收命令：

```sh
cd frontend && npm run build:h5
rg "uni.request" src/pages/access src/pages/long-term-password src/pages/packages src/pages/profile src/pages/orders src/components/access src/components/packages src/components/profile src/components/orders || true
rg "packages|orders|access|long-term-code|mock-pay" src/pages/access src/pages/long-term-password src/pages/packages src/pages/profile src/pages/orders src/components/access src/components/packages src/components/profile src/components/orders
```

### 任务包 10：验收联调

批次：第 4 批。

目标：

- 只读或最小修复方式验收端到端 MVP 主链路。
- 输出问题清单，按接口契约、数据一致性、前端流程、构建运行四类归档。

可修改文件范围：

- 默认只读。
- 如需要补充自动化验收脚本，可新增 `scripts/**` 或 `backend/test/**`、`frontend/test/**`，但必须先确认没有其它 worker 正在使用同一路径。
- 如需要修复 bug，只能改明确归属任务包文件，并在提交说明中写明原因。

不可修改文件范围：

- 不得重写 `API_CONTRACT.md`、`DATA_MODEL.md`、`FRONTEND_PAGE_MAP.md`、`PARALLEL_DEVELOPMENT_PLAN.md`。
- 不得大范围格式化 `backend/**` 或 `frontend/**`。
- 不得覆盖页面 A/B 或后端业务 worker 的未完成文件。

输入文档：

- `API_CONTRACT.md`
- `DATA_MODEL.md`
- `FRONTEND_PAGE_MAP.md`
- 本文档

完成标准：

- 后端可启动，健康检查通过。
- 登录后可访问 `GET /api/me`。
- 首页摘要、座位可用性、创建预约、取消预约、签到、结束学习会话至少一条 happy path 通过。
- 套餐列表、创建订单、mock 支付、订单列表至少一条 happy path 通过。
- 一键开门、长期通行码查看/刷新按权限返回正确结果。
- 前端 H5 构建通过；页面内没有直接散落 `uni.request`。
- 输出剩余问题清单，标注阻塞/非阻塞和归属任务包。

建议验收命令：

```sh
cd backend && npm start
curl -s http://localhost:3000/api/health
cd frontend && npm run build:h5
rg "uni.request" frontend/src/pages frontend/src/components || true
rg "/api/bookings|/api/users/me|/api/spaces/current" frontend/src || true
```

## 5. 依赖关系总表

| 任务包 | 可真正并发对象 | 必须等待 | 主要阻塞原因 |
| --- | --- | --- | --- |
| 工程基建 | 前端路由壳、前端 API SDK 初版 | 第 0 批契约同步 | 需要先确定错误格式、认证和后端目录约定 |
| 后端迁移 | 前端路由壳、前端 API SDK 初版 | 工程基建的 DB 初始化约定 | 后端业务 API 依赖表结构、种子数据和事务封装 |
| 后端 auth/me/stores/seats | 后端 reservations、后端 packages/orders/access | 后端迁移 | 依赖用户、门店、座位、权益和种子数据 |
| 后端 reservations/study-session | 后端 auth/me/stores/seats、后端 packages/orders/access | 后端迁移；需要认证中间件 | 依赖用户身份、座位冲突、权益事务 |
| 后端 packages/orders/access | 后端 auth/me/stores/seats、后端 reservations | 后端迁移；需要认证中间件 | 依赖套餐、订单、权益、门禁表；预约订单支付需对齐预约状态 |
| 前端路由壳 | 工程基建、后端迁移、API SDK 初版 | 第 0 批契约同步 | 提供页面路径和 tabBar 稳定边界 |
| 前端 API SDK | 工程基建、后端迁移、前端路由壳、前端登录态 | 第 0 批契约同步 | service 函数必须按 API 契约命名和映射 |
| 前端登录态 | 工程基建、后端迁移、前端路由壳、前端 API SDK | 第 0 批契约同步；API SDK 的 auth/user service 函数名稳定 | 只改 stores 和 login 页面，不能改 service |
| 前端页面 A | 前端页面 B、静态资源 | 前端路由壳已完成并冻结；API SDK 函数名稳定 | 页面依赖路由路径和统一请求封装 |
| 前端页面 B | 前端页面 A、静态资源 | 前端路由壳已完成并冻结；API SDK 函数名稳定 | 页面依赖路由路径和统一请求封装 |
| 验收联调 | 无，主要顺序执行 | 第 2 批和第 3 批主流程完成 | 需要端到端可运行系统 |

## 6. 分发给 worker 的通用开场要求

每个 worker 开始前应确认：

1. 我只修改任务包允许的文件范围。
2. 我不会修改 `API_CONTRACT.md`、`DATA_MODEL.md`、`FRONTEND_PAGE_MAP.md` 和 `PARALLEL_DEVELOPMENT_PLAN.md`，除非任务明确要求。
3. 我不会覆盖其它 worker 负责的页面、service、repository、迁移或静态资源。
4. 我会先读本任务包的输入文档，再实现。
5. 我会在完成时说明修改文件、验收命令和未完成风险。

## 7. 推荐总体开发顺序

1. 第 0 批完成契约同步。
2. 第 1 批并发启动工程基建、前端路由壳、前端 API SDK 和前端登录态；登录态只改 stores 与 login 页面，不改 service。
3. 后端迁移完成后，第 2 批三个后端业务包并发。
4. 前端路由和 SDK 稳定后，第 3 批页面 A、页面 B 并发。
5. 第 4 批联调验收，按阻塞程度回派 bug 给对应任务包。
