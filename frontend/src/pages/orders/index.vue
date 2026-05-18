<template>
  <view class="page">
    <view class="app-topbar">
      <view class="back" @click="goBack">
        <AppIcon name="arrow_back_ios_new" :size="42" color="#031632" />
      </view>
      <text class="title">我的订单</text>
      <button class="refresh" :disabled="loading" @click="refresh">刷新</button>
    </view>

    <view class="filters">
      <text v-for="item in filters" :key="item.value" class="filter" :class="{ active: status === item.value }" @click="changeStatus(item.value)">
        {{ item.label }}
      </text>
    </view>

    <view v-if="loading && orders.length === 0" class="state-card">正在加载订单...</view>
    <view v-else-if="errorMessage && orders.length === 0" class="state-card error">{{ errorMessage }}</view>
    <view v-else-if="orders.length === 0" class="state-card">暂无订单记录</view>

    <view class="order-list">
      <view v-for="order in orders" :key="order.id" class="order-card">
        <view class="order-top">
          <view>
            <text class="subject">{{ order.subject || typeText(order.type) }}</text>
            <text class="created">{{ formatDateTime(order.createdAt) }}</text>
          </view>
          <text class="status" :class="order.status">{{ statusText(order.status) }}</text>
        </view>
        <view class="order-bottom">
          <text class="amount">¥{{ money(order.payAmountCent) }}</text>
          <button v-if="order.status === 'pending_payment'" class="pay-button" :disabled="payingId === order.id" @click="payOrder(order)">
            {{ payingId === order.id ? '支付中' : '继续支付' }}
          </button>
        </view>
      </view>
    </view>

    <button v-if="page.hasMore" class="load-more" :disabled="loadingMore" @click="loadMore">
      {{ loadingMore ? '加载中...' : '加载更多' }}
    </button>

    <AppBottomNav current="profile" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onReachBottom } from '@dcloudio/uni-app';
import orderService from '../../api/services/order';
import AppIcon from '../../components/common/AppIcon.vue';
import AppBottomNav from '../../components/common/AppBottomNav.vue';

const filters = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending_payment' },
  { label: '已支付', value: 'paid' },
  { label: '退款', value: 'refunded' }
];

const status = ref('');
const loading = ref(false);
const loadingMore = ref(false);
const payingId = ref('');
const errorMessage = ref('');
const orders = ref([]);
const page = ref({ nextCursor: '', hasMore: false });

const fallbackOrders = [
  {
    id: 'mock_order_plan_month',
    type: 'package',
    status: 'paid',
    subject: '月卡',
    payAmountCent: 19000,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString()
  }
];

onLoad(() => {
  refresh();
});

onReachBottom(() => {
  if (page.value.hasMore && !loadingMore.value) loadMore();
});

function changeStatus(nextStatus) {
  status.value = nextStatus;
  refresh();
}

async function refresh() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await orderService.listOrders(buildParams());
    orders.value = result.items || [];
    page.value = result.page || { nextCursor: '', hasMore: false };
  } catch (error) {
    errorMessage.value = error?.message || '订单接口暂不可用，已展示本地示例';
    orders.value = status.value ? [] : fallbackOrders;
    page.value = { nextCursor: '', hasMore: false };
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  loadingMore.value = true;
  try {
    const result = await orderService.listOrders(buildParams(page.value.nextCursor));
    orders.value = orders.value.concat(result.items || []);
    page.value = result.page || { nextCursor: '', hasMore: false };
  } catch (error) {
    uni.showToast({ title: error?.message || '加载失败', icon: 'none' });
  } finally {
    loadingMore.value = false;
  }
}

async function payOrder(order) {
  payingId.value = order.id;
  try {
    const result = await orderService.mockPay(order.id, { payResult: 'success' });
    const paidOrder = result.order || {};
    orders.value = orders.value.map((item) => (item.id === order.id ? { ...item, ...paidOrder, status: paidOrder.status || 'paid' } : item));
    uni.showToast({ title: '支付成功', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: error?.message || '支付失败', icon: 'none' });
  } finally {
    payingId.value = '';
  }
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/profile/index' }) });
}

function buildParams(cursor = '') {
  return {
    status: status.value,
    limit: 20,
    cursor
  };
}

function statusText(value) {
  const map = {
    pending_payment: '待支付',
    paid: '已支付',
    closed: '已关闭',
    refunded: '已退款',
    partially_refunded: '部分退款'
  };
  return map[value] || value || '未知';
}

function typeText(value) {
  return value === 'reservation' ? '预约订单' : '套餐订单';
}

function money(value) {
  return ((Number(value) || 0) / 100).toFixed(2);
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
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
.order-top,
.order-bottom {
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
  display: grid;
  grid-template-columns: 88rpx 1fr 112rpx;
  align-items: center;
  gap: 12rpx;
  height: calc(128rpx + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 48rpx 0;
  box-sizing: border-box;
  background: rgba(251, 249, 249, 0.9);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  color: #031632;
  border-radius: 32rpx;
  background: rgba(240, 222, 189, 0.48);
  box-shadow: inset 0 0 0 1rpx rgba(3, 22, 50, 0.06);
}

.title {
  color: #031632;
  font-size: 44rpx;
  font-weight: 600;
  text-align: center;
}

.refresh,
.pay-button,
.load-more {
  border-radius: 32rpx;
  font-size: 26rpx;
}

.refresh,
.pay-button {
  background: #031632;
  color: #ffffff;
}

.refresh {
  min-height: 68rpx;
  padding: 0 18rpx;
  line-height: 68rpx;
}

.filters {
  display: flex;
  gap: 14rpx;
  overflow-x: auto;
  padding: 8rpx 0 4rpx;
}

.filter {
  padding: 14rpx 22rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.82);
  color: #4b5360;
  font-size: 24rpx;
  border: 1rpx solid rgba(3, 22, 50, 0.06);
  white-space: nowrap;
}

.filter.active {
  background: #f3e0c0;
  color: #031632;
  font-weight: 700;
  border-color: rgba(216, 189, 130, 0.64);
}

.state-card,
.order-card {
  margin-top: 28rpx;
  padding: 40rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(3, 22, 50, 0.05);
  box-shadow: 0 18rpx 64rpx rgba(3, 22, 50, 0.06);
}

.state-card.error {
  color: #ba1a1a;
}

.subject {
  display: block;
  color: #031632;
  font-size: 32rpx;
  font-weight: 700;
}

.created {
  display: block;
  margin-top: 8rpx;
  color: #4b5360;
  font-size: 24rpx;
}

.status {
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
  background: rgba(3, 22, 50, 0.06);
  color: #4b5360;
  font-size: 22rpx;
}

.status.paid {
  background: #e8f5ec;
  color: #167c3a;
}

.status.pending_payment {
  background: #fff4d8;
  color: #8a5a00;
}

.status.refunded,
.status.partially_refunded {
  background: #e8eefb;
  color: #315eaa;
}

.order-bottom {
  margin-top: 26rpx;
}

.amount {
  color: #031632;
  font-size: 44rpx;
  font-weight: 600;
}

.load-more {
  width: 100%;
  margin-top: 30rpx;
  background: rgba(255, 255, 255, 0.86);
  color: #031632;
  border: 1rpx solid rgba(3, 22, 50, 0.08);
}

</style>
