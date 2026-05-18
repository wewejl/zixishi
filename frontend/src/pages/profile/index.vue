<template>
  <view class="page">
    <view class="mobile-topbar">
      <text class="brand-title">我的会员空间</text>
    </view>

    <view v-if="guest" class="content">
      <view class="login-card">
        <text class="eyebrow">PRIVATE STUDY CLUB</text>
        <text class="title">欢迎来到静谧空间</text>
        <text class="muted">登录后查看会员权益、预约、订单和通行入口。</text>
        <button class="primary-button" @click="goLogin">去登录</button>
      </view>
    </view>

    <view v-else class="content">
      <view class="profile-card">
        <text class="eyebrow">PRIVATE STUDY CLUB</text>
        <view class="avatar">
          <image v-if="user.avatarUrl" :src="user.avatarUrl" mode="aspectFill" class="avatar-img" />
          <image v-else src="/static/images/avatar-placeholder.svg" mode="aspectFill" class="avatar-img" />
        </view>
        <view class="profile-main">
          <text class="name">{{ user.nickname || '静谧会员' }}</text>
          <view class="member"><AppIcon name="star" :size="22" color="#6a5d43" /><text>{{ user.isLongTermMember ? '长期会员' : membershipText }}</text></view>
          <text class="muted">专注时长 {{ studyHours }} 小时</text>
        </view>
      </view>

      <view v-if="loading" class="state-card">正在同步个人资料...</view>
      <view v-if="errorMessage" class="state-card error">{{ errorMessage }}</view>

      <view class="stats-grid">
        <view class="stat-card">
          <AppIcon class="stat-icon" name="hourglass_empty" :size="30" color="#031632" />
          <text class="stat-label">剩余时长</text>
          <text class="stat-value">{{ formatMinutes(entitlement.remainingMinutes) }}</text>
        </view>
        <view class="stat-card">
          <AppIcon class="stat-icon" name="military_tech" :size="30" color="#031632" />
          <text class="stat-label">今日排名</text>
          <text class="stat-value">#{{ stats.todayRank || '--' }}</text>
        </view>
        <view class="stat-card wide">
          <AppIcon class="stat-icon" name="calendar_today" :size="30" color="#031632" />
          <text class="stat-label">坚持天数</text>
          <text class="stat-value">{{ stats.streakDays || 0 }} 天</text>
        </view>
      </view>

      <view class="menu-card">
        <view v-for="item in menuItems" :key="item.title" class="menu-item" @click="go(item.url, item.switchTab)">
          <view class="menu-icon"><AppIcon :name="item.icon" :size="34" color="#031632" /></view>
          <view class="menu-main">
            <text class="menu-title">{{ item.title }}</text>
          </view>
          <AppIcon name="chevron_right" :size="34" color="#4b5360" />
        </view>
      </view>
    </view>

    <AppBottomNav current="profile" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import userService from '../../api/services/user';
import reservationService from '../../api/services/reservation';
import studySessionService from '../../api/services/studySession';
import orderService from '../../api/services/order';
import AppIcon from '../../components/common/AppIcon.vue';
import AppBottomNav from '../../components/common/AppBottomNav.vue';

const loading = ref(true);
const guest = ref(false);
const errorMessage = ref('');
const user = ref({});
const stats = ref({});
const entitlement = ref({});
const currentReservation = ref(null);
const currentSession = ref(null);
const recentOrder = ref(null);

const menuItems = computed(() => [
  {
    icon: 'fact_check',
    title: '座位与签到状态',
    url: '/pages/seat-status/index'
  },
  {
    icon: 'receipt_long',
    title: '我的订单',
    url: '/pages/orders/index'
  },
  {
    icon: 'shopping_bag',
    title: '套餐与权益',
    url: '/pages/packages/index',
    switchTab: true
  },
  {
    icon: 'lock_open',
    title: '门禁开门',
    url: '/pages/access/index',
    switchTab: true
  },
  {
    icon: 'password',
    title: '长期通行码',
    url: '/pages/long-term-password/index'
  },
  {
    icon: 'settings',
    title: '账号登录',
    url: '/pages/login/index'
  },
  {
    icon: 'help',
    title: '帮助中心',
    url: '/pages/webview/index'
  }
]);

const membershipText = computed(() => {
  if (user.value.membershipLevel === 'premium') return '高级会员';
  if (user.value.membershipLevel) return user.value.membershipLevel;
  return '普通用户';
});
const studyHours = computed(() => Math.floor((Number(stats.value.totalStudyMinutes) || 0) / 60));

onShow(() => {
  loadProfile();
});

async function loadProfile() {
  loading.value = true;
  guest.value = false;
  errorMessage.value = '';

  const [meResult, reservationResult, sessionResult, orderResult] = await Promise.allSettled([
    userService.getMe(),
    reservationService.getCurrent(),
    studySessionService.getCurrent(),
    orderService.listOrders({ limit: 1 })
  ]);

  if (meResult.status === 'fulfilled') {
    user.value = meResult.value.user || {};
    stats.value = meResult.value.stats || {};
    entitlement.value = meResult.value.entitlement || {};
  } else if (meResult.reason?.statusCode === 401 || meResult.reason?.code === 'UNAUTHORIZED') {
    guest.value = true;
  } else {
    errorMessage.value = meResult.reason?.message || '个人资料暂不可用，已展示本地占位';
    user.value = { nickname: '静谧会员', membershipLevel: 'guest' };
  }

  if (reservationResult.status === 'fulfilled') currentReservation.value = reservationResult.value;
  if (sessionResult.status === 'fulfilled') currentSession.value = sessionResult.value;
  if (orderResult.status === 'fulfilled') recentOrder.value = orderResult.value.items?.[0] || null;

  loading.value = false;
}

function go(url, useSwitchTab = false) {
  if (useSwitchTab) uni.switchTab({ url });
  else uni.navigateTo({ url });
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function formatMinutes(value) {
  if (value === null) return '不限时';
  if (value === undefined || value === '') return '--';
  return `${Math.floor(Number(value) / 60)}h`;
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 48rpx calc(220rpx + env(safe-area-inset-bottom));
  background: #fbf9f9;
  color: #031632;
}

.mobile-topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 20;
  height: calc(128rpx + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(251, 249, 249, 0.9);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.brand-title {
  color: #031632;
  font-size: 44rpx;
  font-weight: 600;
}

.content {
  padding-top: calc(192rpx + env(safe-area-inset-top));
}

.profile-card,
.login-card,
.menu-card,
.state-card {
  padding: 48rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(3, 22, 50, 0.05);
  box-shadow: 0 18rpx 64rpx rgba(3, 22, 50, 0.06);
}

.profile-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: #031632;
  color: #ffffff;
  box-shadow: 0 30rpx 90rpx rgba(3, 22, 50, 0.22);
}

.profile-card::after {
  position: absolute;
  top: -118rpx;
  right: -118rpx;
  width: 300rpx;
  height: 300rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.24);
  border-radius: 50%;
  content: '';
}

.eyebrow {
  display: block;
  margin-bottom: 28rpx;
  color: #9a7a3d;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.profile-card .eyebrow {
  color: #f3e0c0;
}

.avatar {
  position: relative;
  z-index: 1;
  width: 192rpx;
  height: 192rpx;
  overflow: hidden;
  border-radius: 50%;
  border: 8rpx solid rgba(243, 224, 192, 0.52);
  background: #031632;
  color: #ffffff;
  font-size: 64rpx;
  font-weight: 700;
  line-height: 192rpx;
  text-align: center;
}

.avatar-img {
  width: 192rpx;
  height: 192rpx;
}

.profile-main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  margin-top: 32rpx;
}

.title,
.name {
  display: block;
  color: #031632;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.profile-card .name {
  color: #ffffff;
}

.member {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  max-width: 100%;
  box-sizing: border-box;
  margin: 14rpx 0;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #f3e0c0;
  color: #031632;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.muted,
.stat-label,
.menu-desc {
  color: #4b5360;
  font-size: 24rpx;
  line-height: 1.6;
}

.profile-card .muted {
  color: rgba(255, 255, 255, 0.72);
}

.primary-button {
  width: 100%;
  min-height: 84rpx;
  box-sizing: border-box;
  margin-top: 28rpx;
  padding: 14rpx 28rpx;
  border-radius: 32rpx;
  background: #031632;
  color: #ffffff;
  font-size: 30rpx;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
}

.state-card {
  margin-top: 24rpx;
}

.state-card.error {
  color: #ba1a1a;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32rpx;
  margin-top: 48rpx;
}

.stat-card {
  min-height: 192rpx;
  padding: 36rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(3, 22, 50, 0.05);
  box-shadow: 0 18rpx 64rpx rgba(3, 22, 50, 0.05);
}

.stat-card.wide {
  grid-column: span 2;
  background: #fff8ea;
  color: #031632;
  border-color: rgba(216, 189, 130, 0.42);
}

.stat-icon {
  display: inline-flex;
  vertical-align: -5rpx;
  margin-right: 8rpx;
}

.stat-value {
  display: block;
  margin-top: 18rpx;
  color: #031632;
  font-size: 34rpx;
  font-weight: 800;
}

.wide .stat-value {
  color: #031632;
}

.menu-card {
  margin-top: 48rpx;
}

.section-title,
.menu-title {
  display: block;
  color: #031632;
  font-size: 30rpx;
  font-weight: 700;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 32rpx 0;
  border-bottom: 1rpx solid rgba(3, 22, 50, 0.08);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 56rpx;
}

.menu-main {
  flex: 1;
  min-width: 0;
}

.menu-title,
.menu-desc,
.muted,
.stat-label,
.stat-value {
  overflow-wrap: anywhere;
}

.menu-item:last-child {
  border-bottom: 0;
}

</style>
