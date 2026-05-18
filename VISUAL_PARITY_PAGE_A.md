# 页面 A 视觉还原清单

范围：`01_home.html`、`02_seat_booking.html`、`03_seat_status.html` 对齐当前实现 `frontend/src/pages/home/index.vue`、`frontend/src/pages/booking/index.vue`、`frontend/src/pages/booking/confirm.vue`、`frontend/src/pages/seat-status/index.vue`。

约束：只改前端视觉层和静态资源，不改后端接口、数据模型、业务状态机、预约/签到/支付逻辑。

## 0. 公共先行任务

这些任务应先完成，首页、预约页、座位状态页再并发接入。

### 0.1 视觉 token

- 文件边界：
  - 改：`frontend/src/uni.scss`
  - 可同步引用：各页面 `<style>`，优先用 CSS 变量或 SCSS 变量替换硬编码颜色。
- 必须还原：
  - 背景从当前 `#f7f3ed` 统一到原型浅暖白 `#fbf9f9` / `#F9F7F2`。
  - 主色统一为原型深蓝 `#031632`，主容器 `#1a2b48`，文字主色 `#1b1c1c`，弱文字 `#44474d`，描边 `#c5c6ce`。
  - 二级暖色为 `#6a5d43`、`#f0debd`、`#f3e0c0`、`#d6c4a5`。
  - 阴影改为原型低透明海军蓝阴影：`0 10px 30/40px rgba(26,43,72,0.04~0.10)`。
  - 页面水平边距移动端 24px 语义，对应 `48rpx`；section gap 48px 语义，对应 `96rpx`，小间距 8/16px 语义。
  - 字体层级按 Inter 原型语义折算 rpx：headline-lg-mobile 28px/36px、headline-md 24px/32px、body-md 16px/24px、label-sm 12px/16px。
- 可接受业务偏离：
  - 小程序端无法直接使用 Google Fonts 时，可保留系统字体栈，但字重、字号、行高和颜色必须贴近。
  - 原型存在负 letter spacing；实现侧按项目规范可保持 `letter-spacing: 0`，但视觉大小需接近。

### 0.2 公共组件

- 文件边界：
  - 改：`frontend/src/components/common/BaseCard.vue`
  - 改：`frontend/src/components/common/SectionHeader.vue`
  - 改：`frontend/src/components/common/PrimaryButton.vue`
  - 改：`frontend/src/components/common/StatusPill.vue`
  - 改：`frontend/src/components/common/BaseState.vue`
  - 新增建议：`frontend/src/components/common/AppTopBar.vue`
  - 新增建议：`frontend/src/components/common/BottomTabShell.vue` 或仅沉淀样式 mixin，按 uni-app tabBar 接入成本决定。
- 必须还原：
  - TopAppBar：固定顶部，高 64px，半透明 `surface/80`，backdrop blur，左侧 menu 图标，中间/左侧品牌“静谧空间”，右侧圆形头像/用户入口。
  - BottomNavBar：固定底部，高约 80px，白色或 lowest surface，顶部柔和阴影，当前 tab 使用 `secondary-container/50` 或 `primary-container` 背景。
  - 卡片圆角改为原型大圆角：主体容器 24px，按钮/小卡 16px，底部浮层 24px。
  - 按钮统一为深蓝主按钮、暖色次级选中、浅灰未选中；按钮需要 active scale/disabled 视觉，但不改变业务逻辑。
  - 状态胶囊支持图标、圆点、填充态、描边态。
- 可接受业务偏离：
  - 如果 uni-app 原生 tabBar 已经提供底部导航，可优先只替换 `frontend/src/static/tabbar/*` 图标和 `pages.json` 色值，不强制自定义 BottomNavBar。
  - Material Symbols 可以用本地图片/iconfont/现有 tabbar png 等价替代；图标语义必须一致。

### 0.3 静态图片与 icon

- 文件边界：
  - 新增：`frontend/src/static/images/home-hero.jpg`
  - 新增：`frontend/src/static/images/seat-window.jpg`
  - 新增：`frontend/src/static/images/seat-quiet.jpg`
  - 可改：`frontend/src/static/tabbar/*.png`
  - 可新增：`frontend/src/static/icons/*`，用于 menu、person、seat、bolt、star、wifi、power、schedule、hourglass 等。
- 必须还原：
  - 首页 hero 必须用真实/拟真学习空间图片，不再使用纯渐变网格背景。
  - 推荐座位卡必须有顶部图片区和状态胶囊。
  - 预约页和状态页图标语义应与原型一致：座位、音量关闭、窗、插座、电源、Wi-Fi、时钟、沙漏、商城/个人。
- 可接受业务偏离：
  - 远程 Google 图片不得作为长期依赖，可落地到本地静态资源；图片内容只需匹配“温暖、极简、安静学习空间”，不必与原型 URL 完全相同。

## 1. 首页 `frontend/src/pages/home/index.vue`

### 1.1 首屏结构差异

- 原型首屏：
  - 固定 TopAppBar：menu、定位图标、“静谧空间”、用户头像。
  - 主内容从顶部 80px 后开始，24px 横向边距，section gap 48px。
  - 首屏最强元素是 240px 圆角图片 banner，覆盖深蓝渐变，标题“寻找专注力”和说明文案。
  - banner 下是两列结构：左侧“今日状态”卡，右侧“立即预约”大按钮和“新人专享福利”入口。
  - 首屏底部露出“推荐座位”标题和横向图片卡。
  - 底部是原型样式 TabBar。
- 当前结构：
  - 无 TopAppBar，首屏直接是深色渐变 hero 卡，含营业状态、门店名、刷新按钮。
  - 统计指标独立为两个卡片，当前预约卡、四宫格快捷入口、福利卡、推荐座位依次纵向堆叠。
  - 推荐座位是纯文字卡，没有图片和浮层状态胶囊。
  - 快捷入口包含门禁、套餐等业务项，原型首屏只突出预约和福利。

### 1.2 具体改法

- 改页面：`frontend/src/pages/home/index.vue`
  - 保留 `loadHome`、fallback、当前预约/学习、路由跳转、推荐座位数据和刷新能力。
  - 模板重排为：`AppTopBar`、图片 banner、今日状态/快捷预约 bento、推荐座位横滑。
  - 将当前 `hero` 替换为原型 `banner`：本地图片 + 底部深蓝渐变遮罩 + 文案。营业状态不要放在 banner 主信息内。
  - 将 `summary-grid` 合并进“今日状态”卡：标题、营业圆点、营业至时间胶囊、两个指标小卡。
  - 将四宫格 `quick-grid` 收敛为原型右侧 bento：
    - 主按钮：`立即预约`，图标 `bolt`，调用 `goBooking`。
    - 福利入口：`新人专享福利`，调用现有 `goPackages` 或权益页入口。
  - 当前预约/学习业务卡可放在今日状态卡下方或推荐座位上方，但样式降级为轻量提示条，不能抢占原型首屏主视觉。
  - 推荐座位卡改为图片顶部 + 状态胶囊 + 标题 + 区域/特性。`goBookingWithSeat` 保留。
  - `usingFallback` notice、loading/error 状态保留，但样式接入 `BaseState`，不改变逻辑。
- 需要公共组件：
  - `AppTopBar`、`BaseCard`、`PrimaryButton`、`StatusPill`、`SectionHeader`。
- 需要静态资源：
  - `home-hero.jpg`
  - `seat-window.jpg`
  - `seat-quiet.jpg`
  - 图标：menu、location、person、event_seat、group、bolt、star、chevron_right。

### 1.3 必须还原 vs 可接受偏离

- 必须还原：
  - 图片 banner 是首屏第一视觉锚点。
  - 今日状态卡与预约/福利 bento 的并列/分组关系。
  - 推荐座位图片卡和横向滚动。
  - 原型浅暖底、深蓝主色、暖色福利入口、大圆角和柔和阴影。
- 可接受业务偏离：
  - 原型“正在学习 188”可继续绑定真实 `metrics.studyingUserCount`，不必硬编码 188。
  - 当前预约/学习提示可以保留，因为它是业务必需信息；但视觉层级必须低于 banner 和预约入口。
  - 刷新按钮可改为 TopAppBar 或状态卡里的轻量 icon，不必保留原 hero 内文字按钮。

## 2. 预约页 `frontend/src/pages/booking/index.vue`

### 2.1 首屏结构差异

- 原型首屏：
  - 固定 TopAppBar：menu、品牌、头像。
  - Header 文案为“选择您的座位” + “寻找最适合您今日学习的静谧环境。”
  - 先展示特性 filter chips：安静区、窗边、插座，带 Material 图标。
  - 时间选择为单独 section：标题“选择时间”，右侧日期标签，横向时间卡。
  - 座位图是“Study Pod”大卡：顶部短横装饰、图例、带过道留白的 4 列网格、底部桌面指示条。
  - 底部浮动确认面板在 tabBar 上方，包含座位/时间、价格、即刻确认提示、确认按钮。
- 当前结构：
  - 无 TopAppBar。
  - 日期 strip 在最前，时间段、座位特性、座位 panel 依次排列。
  - 座位网格是连续 4 列，没有原型过道留白和房间装饰。
  - 底部确认条是横向条，信息密度和圆角/阴影不接近原型。
  - offline banner、错误态业务信息较重。

### 2.2 具体改法

- 改页面：`frontend/src/pages/booking/index.vue`
  - 保留 `dateOptions`、`timeSlots`、`selectedFeatures`、`loadSeats`、筛选、选座、`goConfirm` 逻辑。
  - 首屏顺序调整为：`AppTopBar`、标题说明、feature chips、时间选择、Study Pod 座位图、浮动确认面板。
  - 日期选择不删除，但视觉压缩为“选择时间”标题右侧日期标签或一个小型横滑/下拉入口；不要作为首屏第一主控件。
  - feature chips 移到标题下方，样式为圆形胶囊，图标 + 文案。默认选中 `quiet` 可保留。
  - 时间卡按原型改为 `min-width: 160rpx`、大圆角、未选中浅灰、选中暖色并有底部短线，禁用态半透明并可加删除线。
  - 座位图卡：
    - 容器圆角 24px，白底，极轻描边和阴影。
    - 顶部居中短横、图例底部分隔线、底部桌面指示条。
    - 网格保留动态 seats，但渲染为原型布局：每行两座 + 过道 + 一座/两座。可通过 `seat.code` 映射到 layout slots，无法映射的座位追加到下方“其他座位”轻量网格。
    - 状态色：可选 `surface-container-high`，已约/占用 `primary`，已选 `secondary-container` + `secondary` 边框，维护 `surface-variant`。
  - 浮动确认面板改为纵向圆角卡：上半行座位/时间/价格/即刻确认，下方满宽主按钮。
  - `usingFallback` 和错误态保留，但降为 `BaseState` 或小提示，不破坏原型首屏布局。
- 改页面：`frontend/src/pages/booking/confirm.vue`
  - 原型没有单独确认页，但当前业务需要。
  - 视觉上复用预约页 TopAppBar、浅暖底、24px 白卡和深蓝主按钮。
  - `summary-card` 不使用当前深色渐变，改成白底座位确认卡或暖色强调卡，避免偏离预约页风格。
  - 保留创建预约、模拟支付、错误处理、跳转座位状态逻辑。
- 需要公共组件：
  - `AppTopBar`、`BaseCard`、`PrimaryButton`、`StatusPill`、`BaseState`。
- 需要静态资源/icon：
  - menu、person、volume_off、window、power、event_seat、bolt。

### 2.3 必须还原 vs 可接受偏离

- 必须还原：
  - Header + feature chips + 时间选择 + Study Pod + 底部浮动确认面板的层级和顺序。
  - 座位图的过道留白、顶部/底部房间指示、图例位置。
  - 底部确认面板从横条改为圆角浮动卡，主按钮满宽。
- 可接受业务偏离：
  - 原型只展示“今天, 10月24日”；实现必须继续支持 7 天日期，日期入口可以更轻。
  - 原型价格 `$15.00` 可继续使用 `formatPrice` 和真实币种。
  - 原型硬编码 B3 已选；实现必须继续由真实可选座位决定。
  - `confirm.vue` 是业务流程扩展，不要求与不存在的原型完全一比一，但必须继承预约页视觉语言。

## 3. 座位状态页 `frontend/src/pages/seat-status/index.vue`

### 3.1 首屏结构差异

- 原型首屏：
  - 固定 TopAppBar，移动端 menu、品牌、头像；桌面有顶部导航。
  - 标题为“空间控制”，副标题“当前座位：B12 (窗边)”。
  - 核心状态卡是白底 24px 圆角，中心大号暖色电源圆形图标，有淡金径向背景，标题“座位供电：已激活”，下方两个状态胶囊：插座已通电、无线网络已连接。
  - 下方两张详情卡：今日学习时长、剩余套餐时间，左上圆形 icon，超大数字。
  - 只有一个主要动作按钮“结束本次学习”。
  - 移动端底部导航当前项为“控制”。
- 当前结构：
  - 无 TopAppBar，标题为“座位状态”，副标题动态。
  - 首屏核心是深色渐变 active-card，展示状态、座位号、时间。
  - 倒计时卡和进度条占据高层级，设备信息是 2x2 卡。
  - 动作区包含签到、取消、结束、打开门禁多个按钮。
  - 空状态是居中白卡，风格相对接近但文案和导航不一致。

### 3.2 具体改法

- 改页面：`frontend/src/pages/seat-status/index.vue`
  - 保留 `loadStatus`、倒计时、签到、取消、结束学习、打开门禁、timer 逻辑。
  - 页面标题改为原型“空间控制”；副标题绑定真实座位：`当前座位：${seatCode/seatLabel}${area ? ' (' + area + ')' : ''}`。无 activeItem 时显示“暂无进行中的座位”。
  - 将 `active-card` 深色渐变改为原型白底主状态卡：
    - 中心 `power` 图标圆形底 `secondary-container`。
    - 标题根据业务状态显示：学习中为“座位供电：已激活”；有预约未签到为“座位待激活：待签到”；无会话走空状态。
    - 胶囊显示供电和 Wi-Fi。学习中使用 `currentSession.powerEnabled` / `wifiConnected`，预约未签到可显示“待签到激活”“到店后连接”。
  - 倒计时和进度条不要作为原型主视觉。可移到主状态卡下的小型信息行，或并入详情卡，保留业务信息但降低层级。
  - 详情卡从当前 2x2 改为原型 1/2 列：
    - 今日学习时长：`minutesToHourText(currentSession.todayStudyMinutes)` 或倒计时/已学习时长。
    - 剩余套餐时间：`minutesToHourText(currentSession.remainingPackageMinutes)`。
    - 如无学习会话但有预约，可显示预约时段、距离开始，仍使用同一白卡风格。
  - 动作按钮：
    - 学习中首屏只突出“结束本次学习”主按钮。
    - 待签到时突出“签到入座”，次级操作“取消预约”“打开门禁”降为次级按钮或更多操作，避免破坏原型主 CTA。
    - 取消、打开门禁逻辑保留，不改接口。
  - 空状态保留，但用原型 TopAppBar、浅暖底、24px 白卡、深蓝主按钮；文案可继续说明去预约。
- 需要公共组件：
  - `AppTopBar`、`BaseCard`、`PrimaryButton`、`StatusPill`、`BaseState`。
- 需要静态资源/icon：
  - menu、person、power、wifi、schedule、hourglass、bolt、home、calendar_month、local_mall。

### 3.3 必须还原 vs 可接受偏离

- 必须还原：
  - 页面定位从“座位状态”视觉改为“空间控制”视觉。
  - 白底主状态卡 + 中央电源圆形 icon + 两个状态胶囊。
  - 两张详情卡的大数字层级。
  - 学习中状态下主 CTA 只有“结束本次学习”最高优先级。
- 可接受业务偏离：
  - 预约未签到、待支付、取消等状态是当前业务必须覆盖的额外状态，可在原型框架内扩展。
  - 倒计时/进度条是业务有用信息，可以保留为次级信息，不要求完全删除。
  - 桌面导航可不做第一阶段，只要移动端小程序首屏还原到位。

## 4. 并发实现顺序

### 阶段 1：公共 token/组件

1. 在 `frontend/src/uni.scss` 定义原型色彩、间距、圆角、阴影、文字层级变量。
2. 调整 `BaseCard`、`PrimaryButton`、`StatusPill`、`BaseState` 到原型视觉。
3. 新增 `AppTopBar`，并决定底部导航使用 uni-app 原生 tabBar 主题化还是自定义 `BottomTabShell`。
4. 落地 `frontend/src/static/images/*` 和必要 icon/tabbar 图标。

### 阶段 2：页面结构

1. 首页：先替换首屏结构为 TopAppBar + 图片 banner + 今日状态/预约 bento + 推荐座位图片卡。
2. 预约页：先重排 Header、feature chips、时间选择、Study Pod、底部浮动确认卡。
3. 座位状态页：先替换为“空间控制”结构和白底电源状态卡。
4. 确认页：同步预约页视觉语言，保持业务流转。

### 阶段 3：细节 polish

1. 统一所有圆角、阴影、描边、选中/禁用态颜色。
2. 检查首屏间距：顶部 64px AppBar 后主内容起始，移动端 24px 横向边距，section gap 48px 语义。
3. 检查底部浮动区域与 tabBar/safe-area 不重叠。
4. 检查动态文本不撑破按钮、卡片和座位格；长座位名降级为单行省略。
5. 用真实接口、fallback、loading、error、空状态分别走一遍，不改后端。

## 5. 并发拆分建议

- 公共视觉 agent：
  - `frontend/src/uni.scss`
  - `frontend/src/components/common/*`
  - `frontend/src/static/images/*`
  - `frontend/src/static/icons/*`
  - `frontend/src/static/tabbar/*`
- 首页 agent：
  - `frontend/src/pages/home/index.vue`
  - 依赖公共图片和 `AppTopBar`，不改 API 服务。
- 预约 agent：
  - `frontend/src/pages/booking/index.vue`
  - `frontend/src/pages/booking/confirm.vue`
  - 依赖公共按钮、卡片、状态胶囊和图标。
- 座位状态 agent：
  - `frontend/src/pages/seat-status/index.vue`
  - 依赖公共电源/Wi-Fi/时间图标和状态胶囊。

## 6. 验收要点

- 首页、预约、座位状态三页首屏截图应能一眼对应原型的布局骨架。
- 视觉主色不再是当前偏灰蓝渐变卡片体系，而是原型的浅暖白背景、深蓝主色、暖色选中/福利色。
- 所有业务动作仍调用当前函数：预约、选座、确认、签到、取消、结束学习、打开门禁、刷新。
- 不新增或修改后端接口，不要求后端提供图片或额外字段。

