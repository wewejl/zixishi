# Page B 视觉还原清单

范围：

- 原型：`stitch-export-4039027564478172202/html/04_smart_access.html`、`05_long_term_password.html`、`06_profile.html`、`07_purchase_package.html`
- 当前实现：`frontend/src/pages/access/index.vue`、`frontend/src/pages/long-term-password/index.vue`、`frontend/src/pages/profile/index.vue`、`frontend/src/pages/packages/index.vue`、`frontend/src/pages/packages/detail.vue`、`frontend/src/pages/orders/index.vue`

目标是在保留现有接口、鉴权、支付、刷新通行码、订单列表等业务逻辑的前提下，把页面 B 相关页面拆成可并发执行的视觉还原任务。不要改后端。

## 0. 公共基础任务

### 0.1 设计 token

改动边界：

- 建议新增或补齐 `frontend/src/styles/` 下的公共 token 文件，或在现有全局样式入口中补齐变量。
- 页面内样式可先局部落地，但最终应沉淀为公共变量，避免四个页面重复散落色值。

必须还原：

- 颜色：`#fbf9f9` / `#F9F7F2` 背景、`#031632` 主色、`#1a2b48` 深色容器、`#f0debd` / `#f3e0c0` 次级金色、`#c5c6ce` 分割线、`#44474d` 次文本。
- 字体层级：标题约 `56rpx` / `48rpx` / `44rpx`，正文 `32rpx` / `28rpx` / `24rpx`，标签 `22rpx` 到 `26rpx`。
- 间距：页面左右 `48rpx`，移动端首屏顶部 bar `128rpx` 高度附近，section gap 约 `96rpx`，卡片内边距 `48rpx` 或 `64rpx`。
- 圆角：原型卡片是 24px，uni-app 中对应约 `48rpx`；胶囊按钮和状态标签使用 `999rpx`。
- 阴影：浅色页卡片使用 `0 20rpx 80rpx rgba(26,43,72,0.04~0.08)`；深色页玻璃卡使用 blur、半透明边框和柔光。

可接受业务偏离：

- 当前单位使用人民币、套餐天数、真实权益字段，不需要改成原型里的 `$15/$65/$190/$350`。
- 当前数据来自后端接口或 fallback，不需要写死原型文案。

### 0.2 公共组件

改动边界：

- 可修改：`frontend/src/components/common/BaseCard.vue`、`PrimaryButton.vue`、`StatusPill.vue`、`SectionHeader.vue`
- 建议新增：
  - `frontend/src/components/common/AppTopBar.vue`
  - `frontend/src/components/common/AppBottomNav.vue`
  - `frontend/src/components/common/MaterialIcon.vue` 或统一 icon text wrapper
  - `frontend/src/components/common/GlassCard.vue`
  - `frontend/src/components/common/PackagePlanCard.vue`

必须还原：

- `BaseCard` 支持 `variant="surface|dark|glass|profile|package|vip"`，圆角默认提升到 `48rpx`，保留小圆角选项给非原型页面。
- `PrimaryButton` 支持 `tone="primary|light|outline|secondary"`，高度约 `88rpx`，胶囊形。
- `StatusPill` 增加左侧小圆点或 icon slot，用于门禁蓝牙状态、会员徽章、订单状态。
- `AppTopBar` 支持：
  - 深色门禁页：半透明 blur、左返回、中间「静谧空间」、右头像。
  - 浅色商城页：左返回、中间「商城」、右头像。
  - 个人中心移动端：居中「静谧空间」。
- `AppBottomNav` 支持五项：`首页 / 预约 / 控制或扫码 / 商城 / 我的`，当前项有淡色圆角高亮。

静态图片 / icon：

- Material Symbols 当前原型依赖在线字体。uni-app 里建议公共 `MaterialIcon` 先使用 text glyph 名称或现有图标方案兜底，视觉上至少恢复图标位置、尺寸和颜色。
- 需要静态图片：
  - 门禁背景图：`frontend/src/static/visual/access-bg.jpg`
  - 头像占位图：`frontend/src/static/visual/avatar-default.jpg`
  - VIP 木纹背景：`frontend/src/static/visual/vip-wood.jpg`
- 如资产策略智能体另有统一产物，页面任务只引用最终路径，不重复生成。

## 1. 智能门禁 `frontend/src/pages/access/index.vue`

### 原型首屏结构

- 全屏深色照片背景，body 不滚动，底部为固定 tabbar。
- 顶部 64px 高半透明 top app bar：左返回 icon，中间「静谧空间」，右头像圆形。
- 主内容垂直居中：
  - 标题「静谧空间 · 智能门禁」
  - 副标题「静谧空间 A 区」
  - 蓝牙连接胶囊
  - 中央 192px 圆形玻璃开门按钮，内含 `lock_open` 图标和「一键开门」
  - 下方玻璃时间卡「当前可使用至 22:00」
  - 「进入密码管理」outline 胶囊按钮
- 底部深色 blur tabbar，当前项「控制」高亮。

### 当前结构差异

- 当前首屏是业务状态页：顶部为「静谧空间 A 区 / 智能门禁」和状态 pill，不是原型 top app bar。
- 中央按钮已经接近圆形玻璃按钮，但尺寸、文案层级、背景图、ambient 光效与原型不一致。
- 当前在首屏下方加入「通行方式」列表和安全提示，原型首屏只显示时间卡与密码管理按钮。
- 当前没有底部 tabbar，也没有头像区。
- 当前 icon 多为中文字符「开 / 约 / 学 / 码」，未恢复 Material Symbols 视觉。

### 具体改法

改页面：

- `frontend/src/pages/access/index.vue`
  - 保留 `loadAccessState()`、`unlockDoor()`、`canOpenDoor`、`permissionText`、`lastUnlock`、`errorMessage` 等业务逻辑。
  - template 改为原型层级：`AppTopBar`、居中 hero、圆形 unlock button、usable-until glass card、password button、`AppBottomNav`。
  - 把当前 `accessMethods` 列表移到首屏之后或折叠到非首屏区，避免破坏一比一首屏。
  - `statusText` 在视觉上映射为「蓝牙已连接 / 设备在线 / 无通行权限」胶囊；可以继续由 `canOpenDoor` 决定状态。
  - `lastUnlock.usableUntil` 映射到时间卡；无值时显示「当前可使用至 --:--」或业务 fallback。

需要公共组件：

- `AppTopBar` 深色模式。
- `AppBottomNav` 深色模式，当前 tab 为 `access`。
- `GlassCard` 用于时间卡和按钮玻璃效果。
- `MaterialIcon` 用于 `arrow_back_ios_new`、`person`、`bluetooth_connected`、`lock_open`、`schedule`、`password`。

需要静态图片 / icon：

- `access-bg.jpg`。必须铺满全屏，`background-size: cover`，`background-position: center`。
- 如不能及时接入 Material Symbols，至少用同尺寸 icon 占位，不再使用中文字符作为按钮图标。

必须还原：

- 深色照片背景、半透明 topbar、底部 tabbar。
- 中央圆形玻璃开门按钮的尺寸、光晕、居中布局。
- 标题、副标题、蓝牙胶囊、时间卡、密码管理按钮的首屏顺序。

可接受业务偏离：

- 按钮禁用、开门中、失败 toast、成功授权文案可以保留。
- 「通行方式」和「安全提示」可以保留在首屏下方或折叠区，但不能挤占原型首屏。

## 2. 长期通行码 `frontend/src/pages/long-term-password/index.vue`

### 原型首屏结构

- 深蓝径向渐变背景，整体居中，不显示底部 tabbar。
- 顶部仅左侧圆形返回按钮，视觉上弱化导航标题。
- 主体最大宽度居中：
  - `shield_lock` 金色图标
  - 标题「长期通行码」
  - 描述「长期会员专享，可在门口触控屏直接输入。」
  - 玻璃卡片，内部大号分组数字 `8862 1095`
  - 有效期胶囊
  - 白色主按钮「复制密码」

### 当前结构差异

- 当前有中间导航标题，原型只有左返回按钮。
- 当前盾牌 icon 是中文「盾」方块，不是原型线性/填充 icon。
- 当前卡片圆角、玻璃渐变、内部 ambient blur、数字字号和分组不够接近原型。
- 当前业务上有「刷新并显示新码」「复制本次明文码」两个动作，原型只有复制按钮。
- 当前有安全说明 notice，原型首屏没有。

### 具体改法

改页面：

- `frontend/src/pages/long-term-password/index.vue`
  - 保留 `loadCode()`、`refreshCode()`、`copyCode()`、`forbidden`、`oneTimeDisplayCode` 等安全逻辑。
  - template 视觉改为原型：返回按钮固定左上，主内容居中，盾牌 icon、标题、说明、玻璃码卡、主按钮。
  - `displayCodeText` 渲染时按 4 位分组，样式使用大号数字与宽字距；掩码也保持两组宽视觉。
  - forbidden 状态仍用同一玻璃卡显示「暂无长期通行权限」，按钮跳商城可以保留，但放在原型按钮位置。
  - 安全说明移动到首屏下方，或作为较弱的二级说明，不影响首屏还原。

需要公共组件：

- `GlassCard` 深色渐变玻璃版本。
- `PrimaryButton` 的 `tone="light"`。
- `MaterialIcon`：`arrow_back`、`shield_lock`、`content_copy`。

需要静态图片 / icon：

- 不需要背景图片；使用 CSS 径向渐变即可。
- 需要统一 icon 渲染能力。

必须还原：

- 无底部 tabbar的沉浸式居中结构。
- 深蓝径向背景、金色盾牌 icon、玻璃码卡、大号分组数字、白色胶囊复制按钮。

可接受业务偏离：

- 由于安全策略，默认展示掩码、刷新后才展示明文可以保留。
- 按钮文案可根据状态为「刷新并显示新码 / 复制本次明文码」，但默认视觉位置和样式应接近原型主按钮。

## 3. 个人中心 `frontend/src/pages/profile/index.vue`

### 原型首屏结构

- 浅暖背景 `#F9F7F2`，移动端顶部固定居中品牌「静谧空间」，底部 mobile tabbar。
- 桌面端有 64px topbar、左 menu + 品牌、右导航和头像；移动端隐藏桌面导航。
- 主体最大宽度约 3xl，顶部留白后依次为：
  - 个人资料大卡：头像 96/128px，姓名「陈默」，金色会员徽章，专注时长。
  - 2x/3x stats grid：剩余时长、今日排名、坚持天数，其中第三块在桌面为深色强调卡。
  - 菜单列表卡：我的订单、签到记录、设置、帮助中心，每项左 icon、文字、右 chevron。

### 当前结构差异

- 当前没有 topbar 和底部 tabbar。
- 当前 profile 卡结构相似，但圆角只有 `16rpx`，头像尺寸较小，会员 badge 与原型细节不一致。
- 当前 stats grid 文案为「连续到店」，原型为「坚持天数」；卡片圆角和阴影偏小。
- 当前额外有「会员权益」卡，原型首屏没有这一块。
- 当前菜单项是业务入口：当前预约、订单记录、门禁开门、长期通行码；原型是我的订单、签到记录、设置、帮助中心，且有 icon。

### 具体改法

改页面：

- `frontend/src/pages/profile/index.vue`
  - 保留 `loadProfile()`、`guest`、`user`、`stats`、`entitlement`、`currentReservation`、`recentOrder` 等业务逻辑。
  - 添加移动端 `AppTopBar` 简版与 `AppBottomNav(current="profile")`。
  - profile card 按原型恢复：卡片 `48rpx` 圆角、`64rpx` padding、头像 `192rpx` 移动端、badge 内含 star icon。
  - stats grid：保留真实 `remainingMinutes`、`todayRank`、`streakDays`，视觉恢复原型三块 bento；第三块文案改为「坚持天数」。
  - 菜单列表首屏恢复原型视觉和入口顺序：我的订单、签到记录、设置、帮助中心。
  - 业务入口可映射：
    - 我的订单 -> `/pages/orders/index`
    - 签到记录 -> 当前没有独立页面时可暂指向座位/学习记录相关入口或禁用态
    - 设置 / 帮助中心 -> 可保留占位 toast 或待接页面，但视觉必须存在
  - 「会员权益」卡移到菜单之后，或折叠为资料卡内一句，不放在原型首屏主序列中间。

需要公共组件：

- `AppTopBar` 浅色移动/桌面模式。
- `AppBottomNav` 浅色模式，当前 tab 为 `profile`。
- `BaseCard` 的 profile/bento 视觉 variant。
- `StatusPill` 支持 icon slot。
- `MaterialIcon`：`star`、`schedule`、`military_tech`、`calendar_today`、`receipt_long`、`fact_check`、`settings`、`help`、`chevron_right`。

需要静态图片 / icon：

- `avatar-default.jpg`，用于无 `user.avatarUrl` 时替代纯文字首字。
- 如接口返回头像，继续优先展示真实头像。

必须还原：

- 浅暖背景、固定顶部品牌、底部 tabbar、profile 大卡、三块 stats、菜单列表卡。
- 卡片 24px 风格圆角、轻阴影、icon + 文本 + chevron 的列表项。

可接受业务偏离：

- 姓名、会员等级、专注时长、剩余时长、排名、坚持天数使用真实数据。
- guest 未登录卡可以保留，但需要使用同一浅色卡片体系。
- 菜单项的具体跳转可按现有页面能力处理，不新增后端。

## 4. 商城列表 `frontend/src/pages/packages/index.vue`

### 原型首屏结构

- 浅暖背景，顶部 sticky top app bar：左返回、中间「商城」、右头像。
- 主体最大宽度桌面 `7xl`，移动端左右 24px，顶部 32px。
- 标题区：「选择您的专注卡」+ 描述。
- 套餐卡 grid：移动端 1 列，桌面 2/4 列。
- 四张卡：
  - 日卡、周卡：白底卡，价格大号，权益列表，outline 选择按钮。
  - 月卡：白底，金色边框，右上推荐角标，主按钮深色。
  - VIP：深色卡，木纹背景 overlay，金色 diamond icon，金色按钮。
- 底部移动端 tabbar，当前「商城」高亮。

### 当前结构差异

- 当前顶部是业务 header「商城 / 选择专注套餐 / 订单」，不是原型 sticky topbar。
- 当前首屏多了「当前权益」卡和分类 tabs，原型首屏没有。
- 当前套餐卡是纵向业务列表，不是原型 card grid；卡片圆角、padding、权益 icon、价格层级不一致。
- 当前卡片有「详情 / 购买」两个按钮，原型每张卡只有一个主选择按钮。
- 当前没有底部 tabbar。
- 当前没有 VIP 深色木纹卡视觉。

### 具体改法

改页面：

- `frontend/src/pages/packages/index.vue`
  - 保留 `loadPage()`、`buyPackage()`、`filteredPackages`、fallback packages、支付成功状态等业务逻辑。
  - 顶部改为 `AppTopBar(title="商城", current="packages")`，订单入口可放到右侧头像旁 icon 或标题区次级链接，不改接口。
  - 首屏顺序恢复为：topbar -> 标题区 -> grid 套餐卡 -> bottom nav。
  - 「当前权益」卡和 tabs 移到标题区之后但弱化，或移到套餐 grid 下方；如果必须保留，不能占用原型首屏最重要位置。
  - `PackagePlanCard` 根据真实套餐字段渲染：
    - `item.badge` 或 `includedMinutes === null` 映射为推荐月卡样式。
    - 可按套餐名称包含 `VIP` / `会员` 映射为深色 VIP 样式；若后端没有 VIP，fallback 可补一个纯前端展示卡，但购买需按业务能力处理为禁用或咨询。
    - features 使用 check/cancel icon，不使用纯文本 `✓ / ×`。
  - 卡片主按钮仍调用 `buyPackage(item)`；详情入口可以保留为卡片点击或长按，不在首屏按钮区抢视觉。

需要公共组件：

- `AppTopBar` 浅色商城模式。
- `AppBottomNav` 浅色模式，当前 tab 为 `packages`。
- `PackagePlanCard`，支持 `variant="default|recommended|vip"`。
- `MaterialIcon`：`arrow_back`、`shopping_bag`、`check_circle`、`cancel`、`diamond`。

需要静态图片 / icon：

- `vip-wood.jpg`，用于 VIP 卡片 overlay。
- 头像默认图。

必须还原：

- 原型的 sticky topbar、标题区、套餐卡 grid、月卡推荐边框、VIP 深色木纹卡、底部 tabbar。
- 卡片内大号价格、权益列表、单一主 CTA 的视觉。

可接受业务偏离：

- 价格、套餐名、权益列表用真实接口。
- 支付流程继续使用 mock pay。
- 当前权益、分类 tabs、订单入口可以保留，但应降级到首屏次要位置或首屏之后。

## 5. 套餐详情 `frontend/src/pages/packages/detail.vue`

原型未提供独立详情页，但当前商城有详情入口。此页应服务于商城视觉体系，不需要做成新的后端流程。

当前结构差异：

- 当前详情页是浅色卡片 + 深色主卡，视觉接近但圆角、topbar、按钮和商城列表不统一。
- 没有使用商城 topbar / bottom nav，也没有与推荐/VIP 卡一致的样式变体。

具体改法：

- 保留 `loadDetail()`、`buyPackage()`、`currentPackage` 逻辑。
- 使用 `AppTopBar(title="套餐详情")`。
- 主卡复用 `PackagePlanCard` 的 header/price/feature 样式，详情页展开「权益内容」「购买须知」。
- 购买按钮使用 `PrimaryButton(tone="primary")` 固定在内容下方或移动端底部安全区上方。

必须还原：

- 与商城列表共享圆角、阴影、价格字体、按钮样式。

可接受业务偏离：

- 详情页不是原型范围，允许比原型多展示购买须知和 mock 支付说明。

## 6. 订单记录 `frontend/src/pages/orders/index.vue`

原型未提供独立订单页，但个人中心和商城会跳转到订单页。此页只需对齐 Page B 公共视觉系统。

当前结构差异：

- 当前已有订单列表、筛选、继续支付逻辑，但 header、filter、卡片圆角和按钮与原型浅色系统不一致。
- 没有 topbar / bottom nav。

具体改法：

- 保留 `refresh()`、`loadMore()`、`payOrder()`、筛选状态和分页逻辑。
- 使用 `AppTopBar(title="我的订单")`，保留刷新按钮为右侧 icon/button。
- filter pill 使用 `StatusPill` 或同一 token。
- order card 使用 `BaseCard` 24px 圆角和浅阴影。
- 支付按钮使用 `PrimaryButton(size="small")`。
- 可加 `AppBottomNav(current="profile")` 或不加，取决于路由栈；如果从 profile 进入，视觉应至少有返回。

必须还原：

- 与个人中心菜单卡、商城卡片一致的浅暖背景、圆角、阴影和胶囊筛选。

可接受业务偏离：

- 订单状态、分页、继续支付等业务功能完整保留。

## 7. 推荐并发实现顺序

### 阶段 1：公共 token / 组件

可并发任务：

- A：补齐 Page B 颜色、圆角、阴影、字体、间距 token。
- B：实现 `AppTopBar`、`AppBottomNav`，打通浅色 / 深色 / 当前项高亮。
- C：扩展 `BaseCard`、`PrimaryButton`、`StatusPill`，新增 `GlassCard`。
- D：实现 `MaterialIcon` 包装与静态资源路径约定。
- E：实现 `PackagePlanCard`，先用静态 props 验证三种卡片样式。

验收重点：

- 不改业务接口。
- 公共组件不破坏已接入页面；如有风险，先用新增 variant，不改变默认样式。

### 阶段 2：页面结构还原

建议顺序：

1. `frontend/src/pages/long-term-password/index.vue`：独立沉浸页，无底部 tabbar，结构最单纯。
2. `frontend/src/pages/access/index.vue`：深色背景、topbar、圆形按钮、bottom nav。
3. `frontend/src/pages/profile/index.vue`：浅色 topbar、profile 卡、stats、菜单、bottom nav。
4. `frontend/src/pages/packages/index.vue`：商城 topbar、标题区、套餐 grid、PackagePlanCard。
5. `frontend/src/pages/packages/detail.vue` 和 `frontend/src/pages/orders/index.vue`：跟随公共视觉系统收口。

每页提交边界：

- 只改对应页面和必要公共组件。
- 业务函数、接口服务、常量、后端协议不改。
- 首屏结构优先，还原完成后再处理非首屏业务区。

### 阶段 3：细节 polish

统一检查项：

- 移动端首屏：topbar 是否固定、bottom nav 是否遮挡内容、主要 CTA 是否在原型位置。
- 圆角：大卡 `48rpx`，胶囊 `999rpx`，不要混用旧 `16rpx` 作为主卡圆角。
- 图标：不再用「开 / 盾 / 约 / 学 / 码 / ✓ / ×」等文字替代主视觉 icon。
- 卡片阴影：浅色页轻阴影，深色页玻璃 + blur + 柔光。
- 背景：门禁必须有图片背景；长期码必须是深蓝径向渐变；个人中心和商城必须是暖浅背景。
- 文案：保留业务真实状态，但首屏主文案顺序和层级贴近原型。
- 安全区：底部 tabbar 和固定按钮要给页面 `padding-bottom`，避免遮挡。

## 8. 必须还原 vs 可接受偏离汇总

必须还原：

- 四个原型页面的首屏布局顺序、背景风格、topbar / bottom nav、主要卡片圆角与阴影、主按钮形态、图标位置。
- 门禁：照片背景、玻璃开门圆钮、时间卡、密码管理按钮。
- 长期码：无底部 nav 的居中安全码页、玻璃码卡、大号分组数字。
- 个人中心：profile 大卡、三块 stats、菜单列表、移动底部 nav。
- 商城：套餐卡 grid、推荐月卡、VIP 深色木纹卡、商城底部 nav。

可接受业务偏离：

- 所有页面继续使用当前接口、支付、鉴权、fallback 数据、toast、错误态。
- 金额单位、套餐数量、会员名称、有效期、排名、剩余时长使用真实业务数据。
- 订单页和套餐详情页没有原型，可以只对齐公共视觉系统。
- 安全相关逻辑，如长期码默认掩码、刷新后展示明文，必须保留。

## 9. 不做事项

- 不改后端接口、数据模型、支付协议、鉴权协议。
- 不把原型里的外链图片直接长期依赖到线上实现；应由资产策略产物落到 `frontend/src/static/visual/` 或统一资源目录。
- 不为了视觉还原移除现有关键业务能力；非原型内容应下移、折叠或弱化，而不是删除。

