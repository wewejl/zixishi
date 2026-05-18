# 设计风格存档：方案 A「静奢会员空间」

本文件用于固定当前项目的统一视觉方向。后续新增或改造页面，应优先遵守这里的颜色、组件和页面边界，避免再出现控制页与其他页面像不同产品的问题。

## 核心定位

- 产品气质：安静、会员感、克制、高级、适合长期使用。
- 页面基调：暖白业务界面为主，深蓝功能卡承载关键操作，暖金只做会员/选中/重点强调。
- 控制页规则：控制页不是独立暗色产品，而是同一暖白体系下的深蓝功能卡页面。

## 颜色规范

- 主背景：`#fbf9f9`
- 暖白渐变辅助：`#fffdf8`、`#f7f1e8`
- 主色深蓝：`#031632`
- 深蓝容器：`#071c3e`、`#12305a`
- 暖金强调：`#f3e0c0`
- 暖金容器：`#f0debd`
- 金棕文字：`#6a5d43`、`#9a7a3d`
- 正文主色：`#031632`
- 弱文字：`#4b5360`
- 错误背景：`#fff1ef`
- 错误文字：`#ba1a1a`

禁止在主业务页新增近似背景色，例如 `#fbf7ef`、`#f7f3ed`、偏蓝灰主色等，除非先更新本文件和 `frontend/src/uni.scss`。

## 组件规范

- 顶部栏：优先使用 `AppTopBar`。
  - 首页使用 `theme="warm"`，`center-title="false"`。
  - 控制页也使用暖色顶部栏，不再使用暗色沉浸式顶部栏。
  - 手写 topbar 只允许作为历史页面过渡，后续应逐步替换。
- 底部导航：统一使用 `AppBottomNav`。
  - 浅色页面使用默认主题。
  - 当前项使用暖金选中态。
  - 控制页不再使用暗色底栏。
- 按钮：优先使用 `PrimaryButton`。
  - 主操作：深蓝底白字。
  - 次操作/选中态：暖金底深蓝字。
  - 胶囊圆角，避免方形按钮。
- 卡片：
  - 默认圆角：`32rpx` 到 `48rpx`。
  - 主功能卡可用深蓝背景。
  - 浅色页卡片使用白色或暖白半透明，不使用强灰。

## 页面规则

- 首页：暖白背景 + 深蓝会员 hero + 暖金会员礼遇。
- 预约页：暖白背景 + 暖金选中态 + 深蓝确认按钮。
- 控制页：暖白背景 + 深蓝门禁主卡 + 暖金状态/按钮强调。
- 长期通行码：暖白背景 + 深蓝安全码卡 + 深蓝主按钮。
- 商城页：暖白背景 + 深蓝套餐卡/按钮 + 暖金推荐/会员强调。
- 我的页：暖白背景 + 深蓝会员资料卡 + 暖金会员标识。

## 已固化源码入口

- 公共 token：`frontend/src/uni.scss`
- 公共顶部栏：`frontend/src/components/common/AppTopBar.vue`
- 公共底部栏：`frontend/src/components/common/AppBottomNav.vue`
- 公共按钮：`frontend/src/components/common/PrimaryButton.vue`
- 首页：`frontend/src/pages/home/index.vue`
- 预约页：`frontend/src/pages/booking/index.vue`
- 控制页：`frontend/src/pages/access/index.vue`
- 长期通行码：`frontend/src/pages/long-term-password/index.vue`
- 商城页：`frontend/src/pages/packages/index.vue`
- 我的页：`frontend/src/pages/profile/index.vue`

## 本地验证截图

当前统一风格的移动端截图已保存在：

- `output/playwright/unified-home.png`
- `output/playwright/unified-access.png`
- `output/playwright/unified-long-term-password-v2.png`
- `output/playwright/scheme-a-booking-single.png`
- `output/playwright/scheme-a-packages-single.png`
- `output/playwright/scheme-a-profile-single.png`

## 最近验证命令

```bash
cd frontend && npm run build:h5
cd backend && npm run access:smoke
```

两项均已通过。
