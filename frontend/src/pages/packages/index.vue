<template>
  <view class="page">
    <view class="app-topbar">
      <view class="back-icon" @click="goBack">
        <AppIcon name="arrow_back_ios_new" :size="42" color="#031632" />
      </view>
      <text class="top-title">商城</text>
      <view class="orders-link" @click="goOrders">
        <AppIcon name="receipt_long" :size="34" color="#031632" />
      </view>
    </view>

    <view class="hero-title-block">
      <text class="eyebrow">QUIET MEMBERSHIP</text>
      <text class="title">选择您的专注卡</text>
      <text class="subtitle">以暖金权益与深蓝服务，为每段专注留出安静坐席。</text>
    </view>

    <view v-if="loading" class="state-card">正在加载套餐...</view>
    <view v-else-if="errorMessage" class="state-card error">{{ errorMessage }}</view>
    <view v-if="!loading && filteredPackages.length === 0" class="state-card">暂无可购买套餐</view>

    <view class="package-grid">
      <view v-for="item in displayPackages" :key="item.id" class="package-card" :class="{ recommended: isRecommended(item), vip: isVip(item) }" @click="goDetail(item)">
        <text v-if="isRecommended(item)" class="badge">{{ item.badge || '推荐' }}</text>
        <view v-if="isVip(item)" class="vip-texture"></view>
        <view class="package-top">
          <view class="package-main">
            <view class="package-name-row">
              <AppIcon v-if="isVip(item)" name="diamond" :size="34" color="#f0debd" />
              <text class="package-name">{{ item.name }}</text>
            </view>
            <text class="package-desc">{{ item.description || '静奢会员空间精选套餐。' }}</text>
          </view>
        </view>

        <view class="price-row">
          <text class="price">¥{{ money(item.priceCent) }}</text>
          <text class="duration">/{{ planUnit(item) }}</text>
        </view>

        <view class="feature-list">
          <view v-for="feature in item.features" :key="feature" class="feature"><AppIcon name="check_circle" :size="32" :color="isVip(item) ? '#f0debd' : '#6a5d43'" /><text>{{ feature }}</text></view>
          <view v-for="feature in item.disabledFeatures" :key="feature" class="feature disabled"><AppIcon name="cancel" :size="32" color="#75777e" /><text>{{ feature }}</text></view>
        </view>

        <button class="buy-button" :class="{ secondary: isVip(item), outline: !isRecommended(item) && !isVip(item) }" :disabled="creatingOrder || item.purchaseEnabled === false" @click.stop="selectPackage(item)">
          {{ packageCta(item) }}
        </button>
      </view>
    </view>

    <view v-if="paymentMessage" class="toast-card">{{ paymentMessage }}</view>

    <AppBottomNav current="packages" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import packageService from '../../api/services/package';
import orderService from '../../api/services/order';
import userService from '../../api/services/user';
import { payOrderWithWechat } from '../../utils/payment';
import { DEFAULT_STORE_ID } from '../../utils/constants';
import AppIcon from '../../components/common/AppIcon.vue';
import AppBottomNav from '../../components/common/AppBottomNav.vue';

const loading = ref(true);
const errorMessage = ref('');
const packages = ref([]);
const entitlement = ref({});
const creatingPackageId = ref('');
const paymentMessage = ref('');

const fallbackPackages = [
  {
    id: 'plan_20h',
    name: '20小时卡',
    description: '适合阶段性自习和周末集中学习。',
    priceCent: 9900,
    durationDays: 30,
    includedMinutes: 1200,
    features: ['开放式座位使用权限', '极速无线网络'],
    disabledFeatures: ['会议室使用权限'],
    badge: '',
    purchaseEnabled: true
  },
  {
    id: 'plan_month',
    name: '月卡',
    description: '深度、无干扰的沉浸式专注。',
    priceCent: 19000,
    durationDays: 30,
    includedMinutes: null,
    features: ['24/7 无限制进入', '优先预约独立舱', '长期门禁权益'],
    disabledFeatures: [],
    badge: '推荐',
    purchaseEnabled: true
  }
];

const creatingOrder = computed(() => Boolean(creatingPackageId.value));
const filteredPackages = computed(() => packages.value);
const displayPackages = computed(() => {
  const items = filteredPackages.value.slice();
  if (!items.some(isVip)) {
    items.push({
      id: 'visual_vip',
      name: 'VIP 会员',
      description: '您的专属学习圣地。',
      priceCent: 35000,
      durationDays: 30,
      includedMinutes: null,
      features: ['专属固定座位', '个人储物柜使用', '会议室无限制预约', '高级管家式服务'],
      disabledFeatures: [],
      badge: '',
      purchaseEnabled: false,
      visualOnly: true
    });
  }
  return items;
});

onShow(() => {
  loadPage();
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = '';
  const [packagesResult, meResult] = await Promise.allSettled([
    packageService.listPackages({ storeId: DEFAULT_STORE_ID }),
    userService.getMe()
  ]);

  if (packagesResult.status === 'fulfilled') {
    packages.value = packagesResult.value.items || [];
  } else {
    packages.value = fallbackPackages;
    errorMessage.value = '套餐接口暂不可用，已展示本地示例套餐';
  }

  if (meResult.status === 'fulfilled') {
    entitlement.value = meResult.value.entitlement || {};
  }

  loading.value = false;
}

async function buyPackage(item) {
  creatingPackageId.value = item.id;
  paymentMessage.value = '';
  try {
    const orderResult = await orderService.createOrder({
      type: 'package',
      packageId: item.id,
      storeId: DEFAULT_STORE_ID
    });
    const order = orderResult.order || orderResult;
    const payResult = await payOrderWithWechat(order.id, orderResult.payment);
    if (payResult.entitlement) {
      entitlement.value = payResult.entitlement;
    } else {
      const me = await userService.getMe().catch(() => null);
      entitlement.value = me?.entitlement || entitlement.value;
    }
    paymentMessage.value = `${item.name} 支付成功，权益已更新`;
    uni.showToast({ title: '支付成功', icon: 'success' });
  } catch (error) {
    paymentMessage.value = error?.message || '创建订单或支付失败，请稍后再试';
    uni.showToast({ title: '支付失败', icon: 'none' });
  } finally {
    creatingPackageId.value = '';
  }
}

function goDetail(item) {
  if (item.visualOnly) {
    uni.showToast({ title: '请联系门店申请 VIP', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/packages/detail?id=${encodeURIComponent(item.id)}` });
}

function selectPackage(item) {
  if (item.visualOnly || item.purchaseEnabled === false) {
    uni.showToast({ title: isVip(item) ? '请联系门店申请 VIP' : '暂不可买', icon: 'none' });
    return;
  }
  buyPackage(item);
}

function goOrders() {
  uni.navigateTo({ url: '/pages/orders/index' });
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/home/index' }) });
}

function isVip(item) {
  return /vip|会员/i.test(item.name || '') || item.visualOnly;
}

function isRecommended(item) {
  return Boolean(item.badge) || item.includedMinutes === null && !isVip(item);
}

function planUnit(item) {
  if (item.durationDays >= 28 && item.durationDays <= 31) return '月';
  if (item.durationDays === 7) return '周';
  return `${item.durationDays || 1}天`;
}

function packageCta(item) {
  if (creatingPackageId.value === item.id) return '处理中...';
  if (isVip(item) && (item.visualOnly || item.purchaseEnabled === false)) return '申请 VIP 席位';
  if (item.purchaseEnabled === false) return '暂不可买';
  return `选择${item.name}`;
}

function money(value) {
  return ((Number(value) || 0) / 100).toFixed(0);
}

</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(160rpx + env(safe-area-inset-top)) 48rpx calc(220rpx + env(safe-area-inset-bottom));
  background: #fbf9f9;
  color: #031632;
}

.app-topbar,
.package-top,
.benefit-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 20;
  height: calc(128rpx + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 48rpx 0;
  box-sizing: border-box;
  background: rgba(251, 249, 249, 0.9);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.package-main {
  flex: 1;
  min-width: 0;
}

.benefit-label,
.metric-label,
.package-desc,
.duration,
.feature {
  color: #4b5360;
  font-size: 24rpx;
  line-height: 1.6;
}

.back-icon,
.orders-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  color: #031632;
  font-size: 26rpx;
  font-weight: 700;
}

.orders-link {
  border-radius: 32rpx;
  background: rgba(240, 222, 189, 0.48);
  box-shadow: inset 0 0 0 1rpx rgba(3, 22, 50, 0.06);
}

.top-title {
  color: #031632;
  font-size: 44rpx;
  font-weight: 600;
}

.hero-title-block {
  margin: 0 0 48rpx;
  padding: 36rpx 8rpx 8rpx;
  text-align: left;
}

.eyebrow {
  display: block;
  margin-bottom: 14rpx;
  color: #9a7a3d;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.title {
  display: block;
  color: #031632;
  font-size: 56rpx;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.subtitle {
  display: block;
  margin-top: 16rpx;
  color: #5b6472;
  font-size: 30rpx;
  line-height: 1.5;
}

.package-card,
.state-card,
.toast-card {
  margin-top: 32rpx;
  padding: 44rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18rpx 64rpx rgba(3, 22, 50, 0.06);
  border: 1rpx solid rgba(3, 22, 50, 0.05);
}

.state-card.error {
  color: #ba1a1a;
}

.package-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32rpx;
}

.package-card {
  position: relative;
  overflow: hidden;
}

.package-card.recommended {
  border: 2rpx solid rgba(190, 151, 75, 0.72);
  box-shadow: 0 24rpx 74rpx rgba(122, 91, 35, 0.12);
}

.package-card.vip {
  background: #031632;
  color: #ffffff;
  box-shadow: 0 30rpx 90rpx rgba(3, 22, 50, 0.22);
}

.vip-texture {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background:
    linear-gradient(135deg, rgba(240, 222, 189, 0.24), transparent 42%),
    url('../../static/images/vip-wood-texture.svg');
  background-size: cover;
  background-position: center;
}

.package-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.package-name {
  display: block;
  color: #031632;
  font-size: 42rpx;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.vip .package-name {
  color: #f3e0c0;
}

.vip .package-desc,
.vip .duration {
  color: rgba(255, 255, 255, 0.74);
}

.package-desc,
.feature {
  overflow-wrap: anywhere;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  flex-shrink: 0;
  max-width: 220rpx;
  box-sizing: border-box;
  padding: 8rpx 16rpx;
  border-radius: 0 32rpx 0 28rpx;
  background: #d8bd82;
  color: #031632;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}

.price-row {
  margin-top: 30rpx;
}

.price {
  color: #031632;
  font-size: 88rpx;
  font-weight: 600;
}

.vip .price {
  color: #ffffff;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 40rpx;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  color: #031632;
}

.vip .feature {
  color: #ffffff;
}

.feature.disabled {
  opacity: 0.55;
  text-decoration: line-through;
}

.buy-button {
  width: 100%;
  min-height: 96rpx;
  box-sizing: border-box;
  margin-top: 48rpx;
  padding: 20rpx 28rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
  background: #031632;
  color: #ffffff;
}

.buy-button.outline {
  border: 1rpx solid rgba(3, 22, 50, 0.16);
  background: rgba(3, 22, 50, 0.04);
  color: #031632;
}

.buy-button.secondary {
  background: #f3e0c0;
  color: #031632;
}

.toast-card {
  position: fixed;
  right: 32rpx;
  bottom: calc(184rpx + env(safe-area-inset-bottom));
  left: 32rpx;
  z-index: 70;
  text-align: center;
}

</style>
