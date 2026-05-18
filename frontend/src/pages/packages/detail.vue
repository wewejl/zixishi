<template>
  <view class="page">
    <view class="app-topbar">
      <view class="back" @click="goBack">
        <AppIcon name="arrow_back_ios_new" :size="36" color="#031632" />
      </view>
      <text class="header-title">套餐详情</text>
      <text class="spacer"></text>
    </view>

    <view v-if="loading" class="card">正在加载套餐详情...</view>
    <view v-else class="card main-card">
      <text class="eyebrow">MEMBER PACKAGE</text>
      <text v-if="currentPackage.badge" class="badge">{{ currentPackage.badge }}</text>
      <text class="name">{{ currentPackage.name }}</text>
      <text class="desc">{{ currentPackage.description }}</text>
      <view class="price-row">
        <text class="price">¥{{ money(currentPackage.priceCent) }}</text>
        <text class="duration">/{{ currentPackage.durationDays || 1 }}天</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">权益内容</text>
      <view v-for="feature in currentPackage.features" :key="feature" class="row"><AppIcon name="check_circle" :size="32" color="#6a5d43" /><text>{{ feature }}</text></view>
      <view v-for="feature in currentPackage.disabledFeatures" :key="feature" class="row muted"><AppIcon name="cancel" :size="32" color="#75777e" /><text>{{ feature }}</text></view>
    </view>

    <view class="card">
      <text class="section-title">购买须知</text>
      <text class="row">适用门店：静谧空间 A 区</text>
      <text class="row">购买后通过 mock 支付立即发放权益。</text>
      <text class="row">有效期从支付成功时开始计算。</text>
    </view>

    <button class="buy-button" :disabled="buying || currentPackage.purchaseEnabled === false" @click="buyPackage">
      {{ currentPackage.purchaseEnabled === false ? '暂不可买' : buying ? '处理中...' : '立即购买' }}
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import packageService from '../../api/services/package';
import orderService from '../../api/services/order';
import { DEFAULT_STORE_ID } from '../../utils/constants';
import AppIcon from '../../components/common/AppIcon.vue';

const loading = ref(true);
const buying = ref(false);
const packageId = ref('');
const currentPackage = ref({
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
});

onLoad((query = {}) => {
  packageId.value = query.id || 'plan_month';
  loadDetail();
});

async function loadDetail() {
  loading.value = true;
  try {
    const result = await packageService.listPackages({ storeId: DEFAULT_STORE_ID });
    const found = (result.items || []).find((item) => item.id === packageId.value);
    if (found) currentPackage.value = found;
  } catch (error) {
    // Keep local fallback visible when the backend package list is not ready.
  } finally {
    loading.value = false;
  }
}

async function buyPackage() {
  buying.value = true;
  try {
    const orderResult = await orderService.createOrder({
      type: 'package',
      packageId: currentPackage.value.id,
      storeId: DEFAULT_STORE_ID
    });
    const order = orderResult.order || orderResult;
    await orderService.mockPay(order.id, { payResult: 'success' });
    uni.showToast({ title: '支付成功', icon: 'success' });
    setTimeout(() => uni.navigateTo({ url: '/pages/orders/index' }), 500);
  } catch (error) {
    uni.showToast({ title: error?.message || '支付失败', icon: 'none' });
  } finally {
    buying.value = false;
  }
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/packages/index' }) });
}

function money(value) {
  return ((Number(value) || 0) / 100).toFixed(0);
}
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(160rpx + env(safe-area-inset-top)) 48rpx calc(72rpx + env(safe-area-inset-bottom));
  background: #fbf9f9;
  color: #031632;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back,
.spacer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.back {
  border-radius: 32rpx;
  background: rgba(240, 222, 189, 0.48);
  color: #031632;
  box-shadow: inset 0 0 0 1rpx rgba(3, 22, 50, 0.06);
}

.header-title {
  color: #031632;
  font-size: 32rpx;
  font-weight: 700;
}

.card {
  margin-top: 24rpx;
  padding: 44rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(3, 22, 50, 0.05);
  box-shadow: 0 18rpx 64rpx rgba(3, 22, 50, 0.06);
}

.main-card {
  position: relative;
  overflow: hidden;
  background: #031632;
  color: #ffffff;
  box-shadow: 0 30rpx 90rpx rgba(3, 22, 50, 0.22);
}

.main-card::after {
  position: absolute;
  top: -120rpx;
  right: -120rpx;
  width: 320rpx;
  height: 320rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.24);
  border-radius: 50%;
  content: '';
}

.eyebrow {
  display: block;
  color: #f3e0c0;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.badge {
  display: inline-block;
  margin-top: 18rpx;
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
  background: #f3e0c0;
  color: #031632;
  font-size: 24rpx;
  font-weight: 700;
}

.name {
  display: block;
  margin-top: 22rpx;
  font-size: 52rpx;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.desc,
.duration,
.row {
  color: #4b5360;
  font-size: 26rpx;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.main-card .desc,
.main-card .duration {
  color: rgba(255, 255, 255, 0.74);
}

.desc {
  display: block;
  margin-top: 10rpx;
}

.price-row {
  margin-top: 34rpx;
}

.price {
  font-size: 88rpx;
  font-weight: 600;
}

.section-title {
  display: block;
  margin-bottom: 18rpx;
  color: #031632;
  font-size: 32rpx;
  font-weight: 700;
}

.row {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
  color: #031632;
}

.row + .row {
  margin-top: 14rpx;
}

.row.muted {
  opacity: 0.55;
  text-decoration: line-through;
}

.buy-button {
  width: 100%;
  margin-top: 36rpx;
  border-radius: 32rpx;
  background: #031632;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  min-height: 96rpx;
}
</style>
