# 前端页面地图与并发开发边界

本文档用于指导 `frontend/` 下 uni-app 微信小程序实现。当前前端骨架只有 `frontend/src/pages/index/index.vue` 和 `frontend/src/pages.json`，Stitch 原型位于 `stitch-export-4039027564478172202/html/`。本文只定义页面地图、组件拆分、状态、接口预期和多人并发边界，不修改后端契约文件。

## 1. 页面路由规划

### 1.1 tabBar 5 个主入口

建议小程序 tabBar 固定为 5 个主入口，覆盖用户高频路径：看空间、订座、开门、商城、我的。

| tab | uni-app 页面路径 | 页面标题 | 对应 Stitch 原型 HTML | 主要职责 |
| --- | --- | --- | --- | --- |
| 首页 | `pages/home/index` | 静谧空间 | `stitch-export-4039027564478172202/html/01_home.html`，`08_quiet_focus_study_space_app.html` 作为同屏备选参考 | 展示门店/空间概览、今日营业状态、座位余量、快速入口、当前订单摘要 |
| 预约 | `pages/booking/index` | 座位预约 | `stitch-export-4039027564478172202/html/02_seat_booking.html` | 选择日期、时段、区域和座位，创建预约 |
| 门禁 | `pages/access/index` | 智能门禁 | `stitch-export-4039027564478172202/html/04_smart_access.html` | 展示可用通行方式、短时开门按钮、当前门禁状态 |
| 商城 | `pages/packages/index` | 商城 | `stitch-export-4039027564478172202/html/07_purchase_package.html` | 展示套餐、余额/权益、购买和支付入口 |
| 我的 | `pages/profile/index` | 个人中心 | `stitch-export-4039027564478172202/html/06_profile.html` | 用户资料、会员状态、订单/预约/通行记录入口、设置入口 |

`frontend/src/pages.json` 后续应配置上述 5 个页面为 tabBar 页面，并使用 `static/tabbar/` 下本地图标，不能使用远程图标或 Material Symbols 字体。

### 1.2 非 tab 页面

| uni-app 页面路径 | 页面标题 | 对应 Stitch 原型 HTML | 进入方式 | 主要职责 |
| --- | --- | --- | --- | --- |
| `pages/seat-status/index` | 座位状态 | `stitch-export-4039027564478172202/html/03_seat_status.html` | 首页当前订单卡片、预约成功页、我的预约记录 | 展示当前预约/使用中的座位、倒计时、续时、取消、离席、结束使用 |
| `pages/long-term-password/index` | 长期通行码 | `stitch-export-4039027564478172202/html/05_long_term_password.html` | 门禁页、我的权益入口 | 展示长期通行码、有效期、刷新/复制/说明 |
| `pages/booking/confirm` | 确认预约 | 基于 `02_seat_booking.html` 延展 | 预约页提交前 | 展示所选门店/日期/时段/座位/费用，确认创建订单 |
| `pages/packages/detail` | 套餐详情 | 基于 `07_purchase_package.html` 延展 | 商城套餐卡片 | 展示套餐规则、适用门店、有效期、购买须知 |
| `pages/orders/index` | 订单记录 | 基于 `06_profile.html` 延展 | 我的页 | 展示套餐购买、预约、退款等记录 |
| `pages/login/index` | 登录授权 | 无独立 Stitch 原型，沿用全局视觉 | 首次进入、接口返回未登录 | 微信授权登录、手机号授权、隐私协议确认 |
| `pages/webview/index` | 协议/公告 | 无独立 Stitch 原型 | 登录页、我的设置 | 展示合法业务域名下的协议或公告 |

## 2. 页面组件拆分、状态与 API

接口路径以 `API_CONTRACT.md` 为准。前端实现时应集中封装到 `frontend/src/api/services/`，页面不能直接散落 `uni.request`。未契约化接口只能作为后置扩展记录，MVP 页面不要列为必调 API。

### 2.1 首页 `pages/home/index`

组件建议：

- `HomeHero`：空间主视觉、门店名称、营业状态。
- `SpaceSummaryCard`：今日座位余量、营业时间、当前位置/门店。
- `CurrentBookingCard`：当前预约或使用中的座位摘要。
- `QuickActionGrid`：预约、开门、购卡、查看座位等快捷入口。
- `NoticeList`：公告、入场须知、活动提示。

页面状态：

- `loading`：首页聚合数据加载中。
- `emptyBooking`：当前无预约。
- `hasCurrentReservation`：存在待支付、已确认或已签到的当前预约。
- `guest` / `loggedIn`：未登录时只展示基础信息和登录入口。
- `error`：聚合接口失败，展示重试。

需要调用的 API：

- `GET /api/health`：启动阶段或调试页可用，生产首页不应依赖。
- `GET /api/stores/{storeId}/summary`：当前门店信息、营业状态、座位余量、今日概览。
- `GET /api/reservations/current`：当前预约摘要，包含待支付、已确认、已签到等当前相关预约。
- `GET /api/study-session/current`：当前学习会话/使用中座位。
- 公告列表接口 `GET /api/notices` 未在 `API_CONTRACT.md` 定义，MVP 前端不应依赖独立公告接口；如需公告先使用本地配置或门店摘要中的文案字段。

### 2.2 预约页 `pages/booking/index`

组件建议：

- `DateStrip`：日期横向选择。
- `TimeRangeSelector`：开始/结束时间或时段选择。
- `ZoneSelector`：区域筛选。
- `SeatMap`：座位平面图，后端状态使用 `physicalStatus` + `availabilityStatus`，当前选中仅为前端本地 `selected` UI 状态。
- `SeatLegend`：状态图例。
- `BookingBottomBar`：选择结果、价格、确认按钮。

页面状态：

- `loadingSeats`：座位图加载中。
- `selectedDate` / `selectedStartTime` / `selectedEndTime` / `selectedZoneId` / `selectedSeatId`。
- `seatUnavailable`：提交前座位被抢占，需要刷新。
- `insufficientBalance`：余额或权益不足，引导商城。
- `submitting`：创建预约中，防重复提交。

需要调用的 API：

- `GET /api/stores/{storeId}/seat-availability`：按日期、时段、特性查询座位可用性，响应中包含时段和座位状态。
- `POST /api/reservations`：创建预约。
- 费用与是否需要支付以 `POST /api/reservations` 响应中的 `reservation` 和 `order` 为准；`API_CONTRACT.md` 未定义独立费用试算接口，MVP 不调用后置扩展 `GET /api/pricing/quote`。
- 如果 `POST /api/reservations` 返回 `order`，确认页应继续调用 `POST /api/orders/{orderId}/mock-pay`；支付完成后再刷新 `GET /api/reservations/current`、`GET /api/reservations/{reservationId}` 或座位可用性/座位状态页数据。
- `GET /api/me`：用户资料与权益摘要，前端从响应的 `entitlement` 字段读取可用权益、余额、套餐剩余。

### 2.3 门禁页 `pages/access/index`

组件建议：

- `AccessStatusPanel`：当前门禁可用状态、门店在线状态。
- `OpenDoorButton`：短时开门主按钮，需明确 loading 和冷却状态。
- `AccessMethodList`：预约通行、长期密码、会员权益等方式。
- `AccessLogPreview`：最近通行记录。
- `SafetyNotice`：门禁使用提示。

页面状态：

- `checkingPermission`：校验是否有通行权限。
- `canOpenDoor` / `cannotOpenDoor`：根据预约、权益和门店状态决定。
- `opening`：开门请求中。
- `cooldown`：开门成功后的短时冷却。
- `offline`：门禁设备不可用。

需要调用的 API：

- `POST /api/access/unlock`：触发开门，后端校验预约、学习会话或长期会员权益；请求参数使用 `deviceId` 标识门禁设备，不使用 `doorId`。
- `GET /api/study-session/current`：辅助判断当前学习会话通行权限。
- `GET /api/me`：辅助读取会员和权益摘要，前端从 `entitlement` 字段判断长期权益展示。

### 2.4 商城页 `pages/packages/index`

组件建议：

- `BenefitSummary`：当前余额、有效套餐、剩余时长/次数。
- `PackageTabs`：按时长卡、次卡、月卡等分类。
- `PackageCard`：套餐名称、价格、权益、推荐标记、购买按钮。
- `PurchaseConfirmSheet`：购买确认弹层。
- `PaymentResultToast`：支付结果反馈。

页面状态：

- `loadingPackages`：套餐列表加载中。
- `selectedCategory` / `selectedPackageId`。
- `creatingOrder`：创建支付订单中。
- `paying`：调用微信支付中。
- `paymentSuccess` / `paymentFailed`。

需要调用的 API：

- `GET /api/packages`：套餐列表。
- `GET /api/me`：我的权益摘要，前端从响应的 `entitlement` 字段读取；`API_CONTRACT.md` 未定义独立权益摘要接口。
- `POST /api/orders`：创建套餐订单。
- `POST /api/orders/{orderId}/mock-pay`：MVP 阶段模拟支付成功。
- `GET /api/orders`：订单记录入口可分页加载。

### 2.5 我的页 `pages/profile/index`

组件建议：

- `ProfileHeader`：头像、昵称、会员状态。
- `MembershipCard`：权益、余额、有效期。
- `ProfileMenuList`：预约记录、订单记录、通行记录、协议设置。
- `LoginPrompt`：未登录状态。
- `LogoutButton`：退出登录或清理本地态。

页面状态：

- `guest`：未登录。
- `loadingProfile`：资料加载中。
- `loggedIn`：已登录。
- `profileError`：资料接口失败。

需要调用的 API：

- `GET /api/me`：用户资料、学习统计与权益摘要；权益从 `entitlement` 字段读取，`API_CONTRACT.md` 未定义独立权益摘要接口。
- `GET /api/reservations/current`：当前预约入口。
- `GET /api/reservations`：我的预约记录入口，可分页展示历史预约。
- `GET /api/study-session/current`：当前学习会话入口。
- `GET /api/orders`：订单记录入口可分页加载。
- 退出登录 MVP 先清理本地 token 和用户态；`API_CONTRACT.md` 未定义后端 logout 接口，页面不要必调后置扩展 `POST /api/auth/logout`。

### 2.6 座位状态页 `pages/seat-status/index`

组件建议：

- `ActiveSeatCard`：座位编号、区域、预约时间。
- `UsageCountdown`：剩余时间或即将开始倒计时。
- `SeatControlActions`：续时、取消、离席、结束使用。
- `AccessShortcut`：跳转门禁开门。

页面状态：

- `loadingBooking`。
- 预约状态统一使用 `pending_payment` / `confirmed` / `checked_in` / `completed` / `cancelled` / `expired` / `no_show`；不要使用 `reserved` / `active` 表示预约。
- `extending` / `cancelling` / `ending`。

需要调用的 API：

- `GET /api/study-session/current`。
- `GET /api/reservations/current`。
- `GET /api/reservations/{reservationId}`。
- `POST /api/reservations/{reservationId}/cancel`。
- `POST /api/study-session/check-in`。
- `POST /api/study-session/{sessionId}/end`。

### 2.7 长期通行码页 `pages/long-term-password/index`

组件建议：

- `PasswordCodeCard`：长期通行码、掩码/明文切换。
- `ValidityInfo`：有效期、适用门店。
- `RefreshCodeButton`：刷新或重新生成。
- `PasswordUsageNotice`：安全提示。

页面状态：

- `loadingCode`。
- `codeAvailable` / `codeUnavailable`。
- `refreshing`。
- `expired`。

需要调用的 API：

- `GET /api/access/long-term-code`。
- `POST /api/access/long-term-code/refresh`。
- `GET /api/me`：读取用户权益摘要，前端从 `entitlement` 字段判断长期通行码入口和状态。
- 普通 `GET /api/access/long-term-code` 可能只返回掩码、后缀或有效期信息；刷新接口创建或轮换通行码时，才返回一次性明文 `displayCode`，前端只在当次结果中展示和提示保存。

### 2.8 登录页 `pages/login/index`

组件建议：

- `WechatLoginButton`：调用 `uni.login` 获取 code。
- `PhoneAuthButton`：微信手机号授权，按产品需要启用。
- `AgreementCheckbox`：隐私协议确认。
- `LoginErrorTip`：登录错误反馈。

页面状态：

- `agreed`。
- `loggingIn`。
- `needPhoneBind`。
- `loginFailed`。

需要调用的 API：

- `POST /api/auth/wechat-login`：提交 `code`。
- 手机号绑定接口 `POST /api/auth/bind-phone` 未在 `API_CONTRACT.md` 定义，MVP 不应假定存在独立绑定接口。
- `GET /api/me`：登录后拉取用户资料。

## 3. 小程序落地注意事项

- 不能直接搬运 Stitch HTML 中的 Tailwind CDN、Tailwind class、Material Symbols 字体、Google Fonts、远程 Google 图片。
- 样式应转换为 uni-app 可维护写法：`<view>`、`<text>`、`<image>`、`<button>`、`<scroll-view>` 等 uni 组件，尺寸优先使用 `rpx`。
- tabBar 图标必须放在 `frontend/src/static/tabbar/` 或 `frontend/src/static/` 下，并在 `pages.json` 中使用本地相对路径。
- 原型中的远程图片需要替换为本地静态资源、合法 CDN 资源，或由产品确认后上传到微信小程序合法域名。
- 所有网络请求域名必须配置到微信小程序后台合法域名；开发环境可使用本地代理或微信开发者工具合法调试配置。
- 微信登录使用 `uni.login`，支付使用 `uni.requestPayment`，分享/订阅消息等能力必须通过微信小程序能力封装，不能照搬 H5 API。
- 页面导航使用 `uni.switchTab`、`uni.navigateTo`、`uni.redirectTo` 等，tab 页面之间不能用 `navigateTo`。
- 避免依赖浏览器 DOM、`window`、`document`、CSS fixed 复杂层级和 hover 效果；小程序端按触摸交互重建。
- 图片、图标、字体和接口错误态都要考虑弱网、无权限、未登录、接口超时。

## 4. 前端目录建议

建议在 `frontend/src/` 下按以下结构扩展：

```text
frontend/src/
  pages/
    home/
    booking/
    access/
    packages/
    profile/
    seat-status/
    long-term-password/
    orders/
    login/
    webview/
  components/
    common/
    home/
    booking/
    access/
    packages/
    profile/
  api/
    request.js
    services/
      auth.js
      user.js
      store.js
      seat.js
      reservation.js
      study-session.js
      access.js
      package.js
      order.js
  stores/
    auth.js
    user.js
    reservation.js
    study-session.js
  utils/
    date.js
    price.js
    route.js
    constants.js
  static/
    tabbar/
    images/
    icons/
```

目录边界：

- `pages/` 只承载页面编排、生命周期、路由参数和页面级状态。
- `components/` 只承载可复用展示和局部交互，不直接写全局登录逻辑。
- `api/request.js` 统一处理 baseURL、token、错误码、登录过期、loading 策略。
- `api/services/` 按业务域封装接口函数。
- `stores/` 存放登录态、用户资料、当前预约/学习会话等跨页面状态。
- `utils/` 存放无副作用工具函数和常量。
- `static/` 存放本地图片、tabBar 图标、通用图标，不放业务代码。

## 5. 并发任务包与文件边界

为了避免多个智能体冲突，建议按任务包拆分，并严格遵守文件边界。

| 任务包 | 负责人工作内容 | 可修改文件边界 | 不应修改 |
| --- | --- | --- | --- |
| 页面壳/路由 | 创建页面目录、空页面、`pages.json` tabBar 和导航标题 | `frontend/src/pages.json`，`frontend/src/pages/**/index.vue` 的页面壳 | `api/services/`，业务组件内部实现，后端文件 |
| 公共组件 | 基础按钮、空状态、错误态、加载态、导航/卡片等 | `frontend/src/components/common/**`，必要的 `frontend/src/uni.scss` 变量 | 具体页面业务逻辑、接口契约文档 |
| API SDK | 统一请求封装和 services | `frontend/src/api/request.js`，`frontend/src/api/services/**` | 页面视觉实现、`API_CONTRACT.md` |
| 登录态 | 微信登录、token 管理、用户 store、路由守卫辅助 | `frontend/src/stores/auth.js`，`frontend/src/stores/user.js`，`frontend/src/pages/login/**` | `api/services/`，其它页面布局，后端实现 |
| 页面 A：首页/预约/座位状态 | 实现首页、预约、座位状态相关页面和局部组件 | `frontend/src/pages/home/**`，`frontend/src/pages/booking/**`，`frontend/src/pages/seat-status/**`，`frontend/src/components/home/**`，`frontend/src/components/booking/**` | 门禁、商城、我的页面文件 |
| 页面 B：门禁/商城/我的 | 实现门禁、长期通行码、商城、我的、订单相关页面和局部组件 | `frontend/src/pages/access/**`，`frontend/src/pages/long-term-password/**`，`frontend/src/pages/packages/**`，`frontend/src/pages/profile/**`，`frontend/src/pages/orders/**`，对应 `components/` 子目录 | 首页、预约、座位状态页面文件 |
| 静态资源 | tabBar、本地图片、图标资源替换 | `frontend/src/static/**` | 页面逻辑、接口服务、后端文件 |

并发规则：

- 不同任务包不要同时编辑同一个 `.vue`、同一个 service 文件或 `pages.json`。
- 页面壳/路由任务包先创建并冻结页面空壳后，页面 A/B 再接手对应页面；页面壳和页面 A/B 不并行编辑同一个 `.vue`。
- `pages.json` 由“页面壳/路由”任务包统一维护；其它任务包需要新增页面时先在任务说明中声明，不直接抢改。
- `api/services/` 由“API SDK”任务包统一创建接口函数；页面任务包只调用已约定函数，避免重复封装。
- 静态资源命名先约定，例如 `tab_home.png`、`tab_home_active.png`、`hero_study_space.png`，页面只引用稳定路径。
- 公共样式变量集中在 `uni.scss` 或局部组件内，避免多个页面各自复制大段全局样式。

## 6. 与后端 API 契约对齐建议

前端实现前应等待或对齐 `API_CONTRACT.md`，本文中的接口名仅为预计命名。对齐重点如下：

- 统一认证方式：明确 token 放在 `Authorization`、自定义 header 还是 cookie；登录过期错误码必须固定。
- 统一响应结构：建议包含 `code`、`message`、`data`、`requestId`，分页接口包含 `list`、`page`、`pageSize`、`total`。
- 统一时间格式：预约开始/结束、套餐有效期、通行码有效期建议使用 ISO 8601 或明确时区的时间戳。
- 统一金额单位：前端展示元，接口建议传分，字段名明确如 `priceCents`。
- 明确座位状态字段：后端返回 `physicalStatus` + `availabilityStatus`；`selected` 只表示前端本地选择态，不是后端枚举。
- 明确预约状态枚举：统一使用 `pending_payment`、`confirmed`、`checked_in`、`completed`、`cancelled`、`expired`、`no_show`，不要使用 `reserved`、`active` 表示预约。
- 明确支付流程：创建预约返回 `order` 时先调用 `POST /api/orders/{orderId}/mock-pay`，支付后刷新预约和座位状态；创建订单、微信预支付、支付回调后查询订单状态的真实接入规则后置。
- 明确门禁错误码：无权限、无有效预约、设备离线、冷却中、超出营业时间应可区分，便于页面给出准确提示。
- 明确门禁开门参数使用 `deviceId`，不要使用 `doorId`。
- 明确微信登录参数：`code`、手机号授权凭证、昵称头像是否由前端提交，是否需要隐私协议版本。

前端 `api/services/` 建议以业务语言命名函数，例如：

- `authService.wechatLogin()`
- `userService.getMe()`
- `storeService.getSummary()`
- `seatService.getAvailability()`
- `reservationService.createReservation()`
- `studySessionService.getCurrent()`
- `accessService.unlock()`
- `packageService.listPackages()`
- `orderService.createPackageOrder()`
- `orderService.mockPay()`

## 7. 实施顺序建议

1. 先由页面壳/路由任务包创建全部页面空壳和 tabBar，保证路由稳定。
2. API SDK 和登录态任务包并行完成请求封装、登录态 store、用户资料拉取。
3. 公共组件任务包先交付基础加载、错误、空状态、卡片、底部操作栏。
4. 页面 A 与页面 B 按文件边界并行实现，调用 API SDK 约定函数。
5. 静态资源任务包替换 Stitch 远程图、Material Symbols 和 tabBar 图标。
6. 最后做小程序端联调：微信登录、合法域名、支付、门禁权限、页面跳转和弱网错误态。
