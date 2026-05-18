# 视觉基线文档

本文档冻结后续“一比一接近还原”所需的视觉标准。基线来源以 `stitch-export-4039027564478172202/html/*.html` 中的 Tailwind config 和页面样式为主，并参考当前 `frontend/src/uni.scss`、`frontend/src/components/common/*` 的小程序实现现状。

## 1. 设计目标

- 视觉优先级：以 Stitch 原型视觉为主，前端页面应尽量还原其色值、层级、圆角、阴影、排版和首屏布局。
- 兼容边界：实现必须符合 uni-app / 小程序能力，不能依赖浏览器专用 CDN、远程 Google 字体、Material Symbols 字体或 Google 托管图片。
- 业务边界：接口 loading、empty、error、fallback、权限不足等状态不能改变原型首屏结构。业务状态只替换内容区文本、局部提示或按钮禁用态，不应重排 TopBar、Hero、主卡片、底部导航的位置和层级。
- 交互气质：整体是“静谧、克制、高级学习空间”。避免高饱和大色块、强边框、硬阴影、营销式夸张组件。

## 2. 颜色 Token

### 核心色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `background` | `#fbf9f9` | 默认页面背景，同 Stitch `background` / `surface` |
| `background-warm` | `#F9F7F2` | 部分原型 body 的暖米背景，可用于首页、个人页的大背景 |
| `surface` | `#fbf9f9` | 顶栏、底层 surface |
| `surface-lowest` | `#ffffff` | 主卡片、套餐卡、状态卡 |
| `surface-low` | `#f5f3f3` | 卡片内嵌块、次级容器 |
| `surface-container` | `#efeded` | 普通浅灰容器 |
| `surface-high` | `#e9e8e7` | 座位可选块、时间未选中块 |
| `surface-highest` | `#e4e2e2` | chip 未选中背景、弱分隔背景 |
| `surface-dim` | `#dbdad9` | 禁用/压暗 surface |

### 文本与边框

| Token | 色值 | 用途 |
| --- | --- | --- |
| `on-background` | `#1b1c1c` | 默认正文深色 |
| `on-surface` | `#1b1c1c` | 卡片主文本 |
| `on-surface-variant` | `#44474d` | 说明文字、未选中导航、次级正文 |
| `outline` | `#75777e` | 图标、弱文本、轮廓 |
| `outline-variant` | `#c5c6ce` | 分隔线、细边框 |

### 品牌与辅助色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `primary` | `#031632` | 主按钮、占用座位、品牌标题、重要数字 |
| `primary-container` | `#1a2b48` | 深色激活底、深色卡片容器 |
| `primary-fixed` | `#d7e2ff` | 深色背景上的浅蓝强调 |
| `primary-fixed-dim` | `#b6c7eb` | 深色背景上的弱蓝 |
| `on-primary` | `#ffffff` | 主按钮文字 |
| `on-primary-container` | `#8293b5` | 深色激活容器上的次级文字 |
| `secondary` | `#6a5d43` | 金棕强调、推荐标签、选中边框 |
| `secondary-container` | `#f0debd` | 选中座位、激活底部导航、标签底色 |
| `secondary-fixed` | `#f3e0c0` | 套餐入口、暖色高亮 |
| `secondary-fixed-dim` | `#d6c4a5` | 暖色阴影/弱高亮 |
| `on-secondary` | `#ffffff` | secondary 深底文字 |
| `on-secondary-container` | `#6e6147` | secondary-container 上文字 |
| `tertiary` | `#161714` | VIP 深色卡 |
| `tertiary-container` | `#2b2b28` | 深色卡容器 |
| `tertiary-fixed` | `#e4e2dd` | 深色场景弱浅色 |
| `on-tertiary` | `#ffffff` | 深色/玻璃页面主文字 |

### 状态色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `success` | `#34C759` | 蓝牙已连接、成功状态图标 |
| `success-bg` | `#e8f5ee` | 成功 pill 背景，沿用 `StatusPill` |
| `success-text` | `#1f7a4d` | 成功 pill 文本 |
| `warning-bg` | `#fff4d8` | 警告 pill 背景 |
| `warning-text` | `#936316` | 警告 pill 文本 |
| `error` | `#ba1a1a` | Stitch 错误色 |
| `error-container` | `#ffdad6` | Stitch 错误容器 |
| `danger-bg` | `#fff1ef` | 小程序 danger pill / error state 背景 |
| `danger-text` | `#c24132` | 小程序 danger 文本 |
| `info-bg` | `#eaf2ff` | 信息 pill 背景 |
| `info-text` | `#2457a7` | 信息 pill 文本 |

## 3. 字体、字号、行高

### 字体替代

- Stitch 使用 `Inter`，但小程序不能依赖 Google Fonts。
- 小程序字体栈统一使用：`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`。
- 若 Inter 不可用，以系统字体为准，不额外引入远程字体文件。中文页面重点保证字号、字重、行高接近原型。

### 字体层级

| 层级 | px | rpx 建议 | 行高 | 字重 | 字距 | 用途 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `display-lg` | 48 | 96 | 56px / 112rpx | 600 | `-0.02em` | 套餐价格、大数字 |
| `headline-lg` | 32 | 64 | 40px / 80rpx | 600 | `-0.01em` | 桌面大标题 |
| `headline-lg-mobile` | 28 | 56 | 36px / 72rpx | 600 | `-0.01em` | 移动端页面主标题 |
| `headline-md` | 24 | 48 | 32px / 64rpx | 500-600 | `0` | 卡片标题、TopBar 标题、按钮大文案 |
| `body-lg` | 18 | 36 | 28px / 56rpx | 400 | `0.01em` | Hero/页面说明 |
| `body-md` | 16 | 32 | 24px / 48rpx | 400 | `0.01em` | 默认正文、卡片描述 |
| `label-md` | 14 | 28 | 20px / 40rpx | 500-600 | `0.05em` | 主按钮、chip、导航文字 |
| `label-sm` | 12 | 24 | 16px / 32rpx | 500-600 | `0.03em` | pill、辅助标签、底部导航 |

现有 `uni.scss` 的 `.app-title 36rpx`、`.app-subtitle 26rpx` 偏小且色值偏旧；后续页面还原时应按上表向 Stitch 层级靠拢。

## 4. 间距、圆角、阴影

### 间距

| Token | px | rpx 建议 | 用途 |
| --- | ---: | ---: | --- |
| `unit` | 8 | 16 | 基础步进 |
| `gutter` | 16 | 32 | 卡片内小间距、行列 gap |
| `container-margin-mobile` | 24 | 48 | 页面左右边距 |
| `container-margin-desktop` | 64 | 128 | 桌面原型边距；小程序通常不使用 |
| `section-gap` | 48 | 96 | 页面大 section 间距 |
| `card-padding` | 24-32 | 48-64 | 主卡片内边距 |
| `inline-gap` | 8-12 | 16-24 | 图标与文字、pill 内部间距 |

移动端页面主结构通常为：`pt 80-96rpx` 顶栏避让，左右 `48rpx`，内容纵向 gap `48-96rpx`，底部预留 `160-220rpx` 给 fixed 操作区和 BottomNav。

### 圆角

| Token | px | rpx 建议 | 用途 |
| --- | ---: | ---: | --- |
| `radius-default` | 16 | 32 | 小卡片、chip、座位块 |
| `radius-lg` | 24 | 48 | 主状态卡、套餐卡、个人信息卡 |
| `radius-xl` | 32 | 64 | 大 Hero、浮动确认区 |
| `radius-full` | 9999 | 999 | 主按钮、pill、头像 |

注意：Stitch Tailwind config 中 `lg=2rem`、`xl=3rem`，但页面大量直接使用 `rounded-[24px]`、`rounded-xl`。小程序实现优先按页面实际观感：主卡 `48rpx`，按钮/pill 全圆。

### 阴影

| Token | CSS 原型值 | rpx 实现建议 |
| --- | --- | --- |
| `shadow-ambient` | `0 10px 40px -10px rgba(26,43,72,0.08)` | 首页卡片、Hero、推荐座位 |
| `shadow-card` | `0 10px 40px rgba(26,43,72,0.04-0.05)` | 个人页、状态卡、菜单卡 |
| `shadow-panel` | `0 20px 50px rgba(26,43,72,0.04)` | 座位图大面板 |
| `shadow-bottom-nav` | `0 -10px 40px rgba(3,22,50,0.04)` | 底部导航 |
| `shadow-selected` | `0 4px 12px rgba(106,93,67,0.15-0.2)` | 选中时间/座位 |
| `shadow-glow` | `0 0 40px rgba(229,211,179,0.15), inset 0 0 20px rgba(229,211,179,0.05)` | 门禁圆形按钮 |

小程序中阴影要轻，避免当前 `BaseCard` 的 `rgba(33,28,24,0.08)` 变成偏棕重阴影；后续应统一转为海军蓝 tint。

## 5. 组件 Token

### TopBar

- 高度：`64px` / `128rpx`。
- 位置：固定顶部；背景 `surface` 80%-90% 透明感，能用 `backdrop-filter` 时使用 blur，不能时用实色 `#fbf9f9` 或 `#F9F7F2`。
- 左右边距：`24px` / `48rpx`。
- 标题：`headline-md`，颜色 `primary`，字重 600。
- 左侧菜单/返回图标：`primary`，24px；头像 32px / 64rpx，圆形，背景 `surface-variant`，细边框 `outline-variant` 30%。

### BottomNav

- 高度：`80px` / `160rpx`，底部 safe-area 额外适配。
- 背景：`surface`，阴影 `shadow-bottom-nav`，顶部圆角约 `16px` / `32rpx`。
- 结构：5 个 item：首页、预约、扫码/控制、商城、我的。每项竖排图标 + `label-sm`。
- 未选中：`on-surface-variant`。
- 选中：文字/图标 `primary`，背景 `secondary-container` 50% 或深色页使用 `primary-container`，圆角 `16px` / `32rpx`，内边距约 `16-20rpx 32rpx`。
- 不因业务状态隐藏或改变顺序；不可用功能应禁用或提示，不改变底部导航结构。

### Hero

- 首页 Hero：图片卡，宽 100%，高约 `240px` / `480rpx`，圆角 `32-48rpx`，`overflow:hidden`，`shadow-ambient`。
- 图片内容应为真实/本地替代的静谧自习空间，不使用远程 Google 图片。图片上可保留暗色渐变层和文字，但首屏结构不变。
- 暗色门禁页 Hero/背景：底色 `#0b0e14`，可使用本地背景图或深色渐变替代；文字 `on-tertiary`，弱文本 `outline-variant`。

### StatusCard

- 容器：`surface-lowest`，圆角 `48rpx`，内边距 `48-64rpx`，阴影 `shadow-card`。
- 首页今日状态卡：标题 `label-md` + uppercase/弱字距，主数值 `headline-md` 或更大，状态 pill 使用 `secondary-container/30` + `secondary-container` 边框。
- 座位状态主卡：居中布局，顶部圆形图标容器 `96-128rpx`，背景 `secondary-container`，金色 glow；主要座位编号用 `headline-lg-mobile` / `headline-lg`。
- loading/error/empty 只能替换卡内内容，不能把主卡变成普通文本行。

### SeatTile

- 布局：座位图使用 4 列网格，gap x 16px / 32rpx，gap y 24px / 48rpx；保留过道空位，不要把业务 fallback 自动压成密集列表。
- 尺寸：正方形 `aspect-square`，小程序用固定宽高或 grid 计算，避免文字撑开。
- 可选：背景 `surface-high`，边框 `outline-variant` 20%-30%，文字 `on-surface-variant`。
- 已约/不可用：背景 `primary`，文字 `on-primary`，无强边框，禁用态。
- 已选：背景 `secondary-container`，边框 `2px` / `4rpx` `secondary`，文字 `on-secondary-container`，阴影 `shadow-selected`，可轻微放大但小程序中优先保持布局稳定。
- 文本：座位编号 `label-md`，选中可 600。

### PackageCard

- 容器：`surface-lowest`，圆角 `48rpx`，内边距 `64rpx`，阴影 `shadow-ambient`。
- 标题：`headline-md` + `primary`；描述 `body-md` + `on-surface-variant`。
- 价格：`display-lg` + `primary`；单位 `body-md` + `on-surface-variant`。
- 普通按钮：全宽、圆角 full、`border primary` + `primary` 文本。
- 推荐卡：边框 `2px` / `4rpx` `secondary`，右上角推荐条背景 `secondary`、文字 `on-secondary`。
- 主推购买按钮：背景 `primary`、文字 `on-primary`。
- VIP 卡：背景 `tertiary`，文字 `on-tertiary`，强调 `secondary-container`，可用本地纹理图或纯深色渐变替代远程图。

### GlassCard

- 用于门禁/长期通行码的深色沉浸页面。
- 背景：`rgba(255,255,255,0.03-0.10)` 或等价半透明白；可用 `linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))`。
- 模糊：浏览器原型为 `backdrop-filter: blur(20px)`；小程序若不稳定，则用半透明背景 + 细边框模拟。
- 边框：`1px solid rgba(255,255,255,0.1)`。
- 圆形开门按钮：`192px` / `384rpx` 正圆，使用 `shadow-glow`，图标/强调色 `secondary-fixed`。
- 深色页底部导航：背景 `#0b0e14` 80%，边框 `outline` 10%，选中项 `primary-container`。

### PrimaryButton

- 默认：背景 `primary #031632`，文字 `on-primary`，圆角 full。
- 高度：普通 `48px` / `96rpx`，小按钮 `40-42px` / `80-84rpx`，大按钮 `56px` / `112rpx`。
- 文本：`label-md`，字重 500-600，不使用过粗 700，避免与 Stitch 偏差。
- 内边距：纵向 `16px` / `32rpx`，横向 `24-32px` / `48-64rpx`。
- plain：白底或透明，边框 `primary` 或 `outline-variant`，文字 `primary`。
- disabled：背景 `surface-dim` 或 `#d7d1cc`，文字白/弱文本；仍保持尺寸不变。

### Pill

- 默认圆角 full，内边距 `6-8px 12-16px` / `12-16rpx 24-32rpx`。
- 文本 `label-sm`，字重 500-600。
- 中性：背景 `surface-low` 或 `#f1ece8`，文字 `on-surface-variant`。
- 选中 chip：背景 `primary`，文字 `on-primary`。
- 暖色状态：背景 `secondary-container` 30%-50%，边框 `secondary-container`，文字 `secondary` / `on-secondary-container`。
- 状态 pill 沿用 `success/warning/danger/info` token，注意色块要浅，不要使用高饱和实底。

## 6. 小程序限制与替代方案

- 不能直接使用 Tailwind CDN。应把 Tailwind config 中的 token 落为 `scss` 变量、公共 class 或组件样式。
- 不能依赖 Material Symbols 字体。图标改用本地 iconfont、内置图片、uni-icons、已有图标库，或以简洁文字/几何占位替代；图标尺寸和颜色按组件 token 保持。
- 不能依赖 Google Fonts。Inter 只作为字体栈首选名，实际以系统字体回退。
- 不能使用远程 Google `lh3.googleusercontent.com` 图片。Hero、头像、座位图、VIP 纹理应替换为本地静态资源、合规 CDN 资源，或由资产 worker 提供的小程序可访问资源。
- `backdrop-filter`、`position: sticky`、复杂 hover、CSS container queries 在小程序中不可作为核心依赖。需要用固定定位、实色半透明背景、轻阴影、active/disabled 状态替代。
- 小程序 `rpx` 换算以 375px 设计宽近似：`1px ≈ 2rpx`。所有关键尺寸应稳定，不因 loading 文案、fallback 数据或按钮文字长度导致卡片/网格跳动。
- hover 效果在小程序中不要求还原；active 缩放如影响布局稳定可省略，优先保持静态视觉一致。

## 7. 验收 Checklist

每个页面修改完成后至少检查：

- 首屏结构：TopBar、主标题/Hero/主卡、关键 CTA、BottomNav 的位置和层级与对应 Stitch 页面一致。
- 色值：背景、主色、surface、弱文本、选中态、状态色使用本文件 token；不得混用旧的 `#243b53`、偏棕阴影或过强灰边框，除非是兼容旧组件的临时说明。
- 字体层级：页面标题、卡片标题、正文、label、价格/数字分别匹配 `headline`、`body`、`label`、`display` 层级。
- 卡片层级：主卡 `surface-lowest + 48rpx 圆角 + 海军蓝轻阴影`；内嵌块用 `surface-low/high`，不要卡片套卡片造成厚重边界。
- 按钮样式：主按钮为 `primary + on-primary + full radius`；次按钮/套餐普通按钮按 plain 规则；禁用态只变色不变尺寸。
- 底部导航：高度、阴影、圆角、选中态、5 项顺序稳定；业务 fallback 不隐藏导航。
- 座位/套餐/状态 fallback：接口失败、空数据、fallback 座位图仍保留原型的面板、网格、卡片尺寸和 CTA 位置，不能退化为普通列表或纯文本。
- 小程序资源：无 Tailwind CDN、Material Symbols、Google Fonts、Google 图片直连；所有图标/图片都有小程序可用替代。
- 文本溢出：按钮、pill、座位 tile、套餐价格、底部导航 label 在常见中文长度下不换出容器、不遮挡相邻元素。
