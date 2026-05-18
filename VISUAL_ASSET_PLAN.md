# 视觉资产和图标替代方案

## 范围和结论

本文只覆盖 Stitch 原型到小程序近似一比一还原所需的视觉资产、图标替代和实现拆分。输入来源为：

- Stitch HTML：`stitch-export-4039027564478172202/html/*.html`
- 当前静态资源：`frontend/src/static/**`
- tabBar 配置：`frontend/src/pages.json`
- 当前页面实现：`frontend/src/pages/**`

当前 `frontend/src/static` 只有 `static/tabbar/*.png` 共 10 个 24x24 PNG。Stitch 原型中的首页 hero、推荐座位图、门禁背景图、头像、商城 VIP 木纹图均来自远程图片，当前小程序页面大多用 CSS 渐变、色块或用户头像 URL 替代。为了小程序稳定还原，不建议继续依赖 Stitch 中的 `lh3.googleusercontent.com/aida-public` 临时图片。

## 原型视觉资产清单

| 资产 | 原型来源 | 当前是否有 | 建议替代方式 | 建议路径/命名 |
| --- | --- | --- | --- | --- |
| 首页 hero 自习空间图 | `01_home.html` / `08_quiet_focus_study_space_app.html`，`img alt="Cozy study corner"`，远程 `lh3.googleusercontent.com/aida-public/...`；画面是暖光、浅木桌、极简自习空间 | 没有本地图片；`frontend/src/pages/home/index.vue` 当前用深色 CSS 渐变和网格背景 | 优先本地生成 PNG/JPG，不下载原图；生成与原型语义一致的横向图，叠加深色半透明遮罩以保证文字可读。若包体压力大，可只保留低体积 JPG/WebP，同时用纯 CSS 渐变作为 fallback | `frontend/src/static/images/home-hero-study.jpg` |
| 首页推荐座位图 1：窗边座 | `01_home.html` / `08_quiet_focus_study_space_app.html`，`img alt="Window Seat"`，远程 `lh3.googleusercontent.com/aida-public/...`；画面是窗边木桌、暖光 | 没有；当前推荐座位卡是信息卡/色块 | 本地生成小尺寸 JPG/PNG；需要与 hero 统一暖光、木质、安静氛围。卡片展示建议裁切为 4:3 或 16:10 | `frontend/src/static/images/seat-window.jpg` |
| 首页推荐座位图 2：静音舱/安静区 | `01_home.html` / `08_quiet_focus_study_space_app.html`，`img alt="Quiet Zone Seat"`，远程 `lh3.googleusercontent.com/aida-public/...`；画面是深蓝吸音毡、桌灯、白色桌面 | 没有；当前推荐座位卡是信息卡/色块 | 本地生成小尺寸 JPG/PNG；色调保留深蓝/暖灯对比，避免和整体浅色页面割裂 | `frontend/src/static/images/seat-quiet-pod.jpg` |
| 门禁背景图 | `04_smart_access.html`，`body style="background-image: url(...)"`，远程 `lh3.googleusercontent.com/aida-public/...`；暗色空间背景 | 没有；`frontend/src/pages/access/index.vue` 当前用径向渐变背景 | 优先本地生成暗色 JPG 背景，保留大面积暗部和轻微空间层次；再叠加 `radial-gradient` 或遮罩。若不想增加位图，可接受纯 CSS，但还原度低于原型 | `frontend/src/static/images/access-bg.jpg` |
| 商城 VIP 木纹图 | `07_purchase_package.html`，`bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?...')]`；深色胡桃木纹 overlay | 没有；`frontend/src/pages/packages/index.vue` / `detail.vue` 当前用纯色深蓝和金色点缀 | 不下载 Unsplash 原图。可本地生成/绘制一张低对比木纹 PNG/JPG，或用合法 CDN 但需配置小程序 downloadFile 合法域名。为稳定和审核，推荐本地生成纹理图；轻量方案是 CSS 多层线性渐变模拟木纹 | `frontend/src/static/images/vip-wood-texture.jpg` 或 `frontend/src/static/patterns/vip-wood.png` |
| 头像占位 | `02_seat_booking.html`、`06_profile.html`、`07_purchase_package.html` 中多个 `img alt="User profile/avatar"`，均为远程人物头像 | 只有业务头像：`profile/index.vue` 使用 `user.avatarUrl`；无本地默认头像 | 不建议用真人图占位。使用本地 SVG/PNG 抽象头像，圆形浅底、深色人形轮廓，和个人中心大头像、顶部小头像共用。用户真实头像仍走业务 URL | `frontend/src/static/images/avatar-placeholder.svg` 或 `.png` |
| tabBar 图标体系 | Stitch 使用 Material Symbols：`home`/`home_max`、`event_seat`/`calendar_month`、`qr_code_scanner`/`bolt`、`shopping_bag`/`local_mall`、`person`。`pages.json` 已配置 5 组 PNG | 已有：`frontend/src/static/tabbar/home.png`、`home-active.png`、`booking.png`、`booking-active.png`、`access.png`、`access-active.png`、`packages.png`、`packages-active.png`、`profile.png`、`profile-active.png` | 保留 PNG，因为原生 tabBar 不适合动态字体图标。需要统一风格到 Material Symbols 轮廓/填充：未选中灰色线性，选中深蓝填充或加粗。若当前图标视觉偏差大，由静态资产 worker 重绘 24x24/48x48 PNG | 继续使用 `frontend/src/static/tabbar/*.png` |

## Material Symbols 替代策略

Stitch HTML 依赖 Google Fonts 的 `Material Symbols Outlined`，小程序内不能直接稳定使用这套远程字体。不要把 Material Symbols 名称作为文本直接渲染，也不要依赖 Google Fonts CDN。策略如下：

### 不建议用文本/emoji 替代

以下图标承担导航、状态、操作或品牌质感，文本/emoji 会造成平台差异、尺寸不稳和视觉降级，应做本地 icon：

- 导航/tab：`home`、`home_max`、`event_seat`、`calendar_month`、`qr_code_scanner`、`bolt`、`shopping_bag`、`local_mall`、`person`
- 主要操作：`menu`、`arrow_back`、`arrow_back_ios_new`、`arrow_forward`、`chevron_right`、`content_copy`
- 门禁/座位状态：`lock_open`、`shield_lock`、`power`、`bluetooth_connected`、`wifi`、`password`、`volume_off`、`window`
- 会员/商城/权益：`star`、`diamond`、`check_circle`、`cancel`
- 个人中心/统计/列表：`schedule`、`calendar_today`、`military_tech`、`receipt_long`、`fact_check`、`settings`、`help`、`hourglass_empty`、`location_on`、`group`

### 可以考虑纯文本或 CSS 处理

- 单纯的箭头装饰如果不是按钮，例如“查看全部”的右箭头，可用文本字符 `>` 或 CSS border 绘制；但为了一致性，仍建议纳入公共 icon 组件。
- 席位状态小徽标、在线绿点、连接状态点可用纯 CSS 圆点/线条，不必做位图。
- 大面积背景光效、渐变、卡片阴影继续用 CSS，比位图更稳定。

### 本地图标组织建议

建议新增统一命名，而不是沿用 Material Symbols 原始名称直接散落页面：

- 公共图标源文件：`frontend/src/static/icons/*.svg`
- tabBar 位图：继续放 `frontend/src/static/tabbar/*.png`
- 页面通用组件：`frontend/src/components/AppIcon.vue`

建议命名：

- `ic-home.svg`、`ic-seat.svg`、`ic-access.svg`、`ic-shop.svg`、`ic-user.svg`
- `ic-menu.svg`、`ic-chevron-right.svg`、`ic-arrow-left.svg`、`ic-copy.svg`
- `ic-lock-open.svg`、`ic-shield-lock.svg`、`ic-power.svg`、`ic-bluetooth.svg`、`ic-wifi.svg`
- `ic-star.svg`、`ic-diamond.svg`、`ic-check-circle.svg`、`ic-cancel.svg`
- `ic-clock.svg`、`ic-calendar.svg`、`ic-rank.svg`、`ic-receipt.svg`、`ic-task.svg`、`ic-settings.svg`、`ic-help.svg`、`ic-location.svg`、`ic-group.svg`

如果小程序构建链对 SVG 支持不稳定，则公共 icon 组件可退回 PNG sprite 或每个 icon 输出 2x/3x PNG。tabBar 仍使用独立 PNG，因为 `pages.json` 原生 tabBar 只能配置图片路径，不能使用组件。

## 小程序环境限制

- 远程域名：图片、接口、web-view、downloadFile 都需要在微信公众平台配置合法域名。`lh3.googleusercontent.com`、`fonts.googleapis.com`、`fonts.gstatic.com`、`cdn.tailwindcss.com`、`images.unsplash.com` 不应作为生产依赖。
- web-view：只适合协议/公告等外部网页；不能用来承载核心页面还原。web-view 域名也需要单独配置业务域名。
- 字体：远程 Google Fonts 不稳定且需域名配置；小程序端优先使用系统字体。Material Symbols 字体不要远程加载，转为本地 SVG/PNG。
- 图标：原生 tabBar 只能使用图片路径；页面内可使用本地 SVG、PNG 或组件。不要用 emoji 替代功能图标，emoji 在不同系统渲染差异明显。
- 背景图：CSS `background-image: url(...)` 在不同小程序端和 uni-app 编译目标上有兼容差异，页面大背景建议用 `<image mode="aspectFill">` 绝对定位或确认当前编译链支持本地静态 URL。
- 包体大小：微信小程序主包通常有严格大小限制。建议首屏必需资产放主包，非首屏大图可放分包或合法 CDN。图片控制尺寸：hero/门禁背景约 750-1200px 宽，推荐座位图约 500-800px 宽，纹理图可压到很小并平铺/覆盖。
- 版权和审核：Stitch 的 `aida-public` 临时图和 Unsplash 示例图不要直接下载进仓库。生产资产应本地生成、授权采购、自有拍摄，或使用已确认授权和备案域名的 CDN。

## 后续实现任务拆分

### 1. 静态资产 worker

- 生成或绘制本地图片：`home-hero-study.jpg`、`seat-window.jpg`、`seat-quiet-pod.jpg`、`access-bg.jpg`、`vip-wood-texture.jpg`、`avatar-placeholder.svg/png`。
- 统一导出尺寸、压缩质量和命名，写入 `frontend/src/static/images/` 或 `frontend/src/static/patterns/`。
- 根据当前 `pages.json` 校验并必要时重绘 `frontend/src/static/tabbar/*.png`，保持 24x24 透明 PNG，选中/未选中颜色与 tabBar 配置一致。

### 2. 公共 icon 组件 worker

- 建立 `frontend/src/static/icons/` 的 SVG/PNG 图标集。
- 新增 `AppIcon` 或等价公共组件，支持 `name`、`size`、`color`、`filled`。
- 建立 Material Symbols 到本地命名的映射表，覆盖 Stitch 中出现的 37 个图标：`arrow_back`、`arrow_back_ios_new`、`arrow_forward`、`bluetooth_connected`、`bolt`、`calendar_month`、`calendar_today`、`cancel`、`check_circle`、`chevron_right`、`content_copy`、`diamond`、`event_seat`、`fact_check`、`group`、`help`、`home`、`home_max`、`hourglass_empty`、`local_mall`、`location_on`、`lock_open`、`menu`、`military_tech`、`password`、`person`、`power`、`qr_code_scanner`、`receipt_long`、`schedule`、`settings`、`shield_lock`、`shopping_bag`、`star`、`volume_off`、`wifi`、`window`。

### 3. 页面替换 worker

- 首页：把 hero 和推荐座位卡替换为本地图片资产，并保留文字遮罩和加载失败 fallback。
- 门禁：用本地背景图替代纯径向渐变或作为渐变下方图层，保留暗色遮罩。
- 商城/VIP：替换 VIP 会员卡木纹 overlay，保留深色底和金色权益文字。
- 个人中心/预约/商城顶部：统一头像占位图，用户头像为空或加载失败时使用本地占位。
- 全页面：把散落的文本符号、临时箭头和功能 icon 改为公共 icon 组件；tabBar 继续走 `pages.json` 图片。

## 输出文件

- `VISUAL_ASSET_PLAN.md`
