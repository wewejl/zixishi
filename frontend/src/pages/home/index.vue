<template>
  <view class="page">
    <AppTopBar
      title="静谧空间"
      :subtitle="store.location"
      theme="warm"
      left-type="menu"
      :center-title="false"
      show-avatar
      @menu="loadHome"
      @right="goSeatStatus"
    />

    <view v-if="loading" class="state-card">正在加载空间状态...</view>
    <view v-else-if="error" class="state-card error">
      <text>{{ error }}</text>
      <button class="small-button" @tap="loadHome">重试</button>
    </view>

    <template v-else>
      <view v-if="usingFallback" class="notice">当前展示本地示例数据，服务可用后会自动切换为实时数据。</view>

      <view class="hero-banner">
        <image class="hero-image" src="/static/images/home-hero-study.svg" mode="aspectFill"></image>
        <view class="hero-overlay">
          <view class="hero-kicker">
            <AppIcon name="diamond" :size="30" color="#f3e0c0" />
            <text>PRIVATE STUDY CLUB</text>
          </view>
          <text class="hero-title">静奢会员空间</text>
          <text class="hero-subtitle">为深度专注预留一席安静、明亮、稳定的日常。</text>
          <view class="hero-meta">
            <view class="hero-meta-item">
              <text class="hero-meta-value">{{ metrics.availableSeatCount }}</text>
              <text class="hero-meta-label">席位可约</text>
            </view>
            <view class="hero-divider"></view>
            <view class="hero-meta-item">
              <text class="hero-meta-value">{{ store.statusText }}</text>
              <text class="hero-meta-label">{{ store.closeText }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="member-panel">
        <view>
          <text class="member-label">会员礼遇</text>
          <text class="member-title">{{ benefit.title }}</text>
          <text class="member-desc">{{ benefit.description }}</text>
        </view>
        <button class="member-button" @tap="goPackages">领取</button>
      </view>

      <view class="quick-grid">
        <button class="quick-card quick-card--primary" @tap="goBooking">
          <AppIcon class="quick-icon" name="seat" :size="40" color="#ffffff" />
          <text class="quick-title">预约席位</text>
          <text class="quick-desc">选择今日专注区</text>
        </button>
        <button class="quick-card" @tap="goAccess">
          <AppIcon class="quick-icon" name="shield_lock" :size="40" color="#031632" />
          <text class="quick-title">门禁通行</text>
          <text class="quick-desc">进入会员空间</text>
        </button>
        <button class="quick-card" @tap="goPackages">
          <AppIcon class="quick-icon" name="shopping_bag" :size="40" color="#031632" />
          <text class="quick-title">会员商城</text>
          <text class="quick-desc">查看套餐权益</text>
        </button>
      </view>

      <view class="bento">
        <view class="today-card">
          <view class="today-head">
            <view>
              <text class="section-label">今日状态</text>
              <view class="status-line">
                <text class="status-dot"></text>
                <text class="status-text">{{ store.statusText }}</text>
              </view>
            </view>
            <text class="time-pill">{{ store.closeText.replace('营业', '') }}</text>
          </view>
          <view class="metric-grid">
            <view class="metric-card">
              <AppIcon class="metric-icon" name="seat" :size="32" color="#031632" />
              <text class="metric-value">{{ metrics.availableSeatCount }}</text>
              <text class="metric-label">剩余座位</text>
            </view>
            <view class="metric-card">
              <AppIcon class="metric-icon" name="group" :size="32" color="#031632" />
              <text class="metric-value">{{ metrics.studyingUserCount }}</text>
              <text class="metric-label">正在学习</text>
            </view>
          </view>
        </view>

        <view class="action-stack">
          <button class="book-card" @tap="goBooking">
            <view>
              <text class="book-label">RESERVE</text>
              <text class="book-title">立即预约</text>
            </view>
            <AppIcon class="action-icon" name="chevron_right" :size="38" color="#ffffff" />
          </button>
          <button class="benefit-card" @tap="goPackages">
            <view class="benefit-icon">
              <AppIcon name="star" :size="36" color="#9c7836" />
            </view>
            <view class="benefit-copy">
              <text class="benefit-title">{{ benefit.title }}</text>
              <text class="benefit-text">{{ benefit.description }}</text>
            </view>
            <AppIcon class="benefit-arrow" name="chevron_right" :size="32" color="#9c7836" />
          </button>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">推荐座位</text>
        <button class="link-button" @tap="goBooking">查看全部</button>
      </view>
      <scroll-view class="seat-scroll" scroll-x>
        <view class="seat-row">
          <view
            v-for="seat in recommendedSeats"
            :key="seat.id"
            class="seat-card"
            @tap="goBookingWithSeat(seat)"
          >
            <view :class="['seat-image', seatImageClass(seat)]">
              <image class="seat-photo" :src="seatImageSrc(seat)" mode="aspectFill"></image>
              <text :class="['seat-status', seat.availabilityStatus]">{{ seatStatusText(seat.availabilityStatus) }}</text>
            </view>
            <view class="seat-copy">
              <text class="seat-title">{{ seat.title || seat.area || seat.code }}</text>
              <text class="seat-desc">{{ seat.area }} · {{ seat.description || formatFeatures(seat.features) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view v-if="hasCurrentStatus" class="current-tip" @tap="goSeatStatus">
        <view>
          <text class="tip-label">{{ currentTitle }}</text>
          <text class="tip-main">{{ currentMain }}</text>
          <text class="tip-sub">{{ currentSub }}</text>
        </view>
        <AppIcon class="tip-arrow" name="chevron_right" :size="36" color="#9c7836" />
      </view>
    </template>

    <AppBottomNav current="home" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { reservationService } from '../../api/services/reservation';
import { storeService } from '../../api/services/store';
import { studySessionService } from '../../api/services/studySession';
import { DEFAULT_STORE_ID } from '../../utils/constants';
import { formatTime } from '../../utils/date';
import { ROUTES } from '../../utils/route';
import AppIcon from '../../components/common/AppIcon.vue';
import AppBottomNav from '../../components/common/AppBottomNav.vue';
import AppTopBar from '../../components/common/AppTopBar.vue';

const fallbackSummary = {
  store: {
    id: DEFAULT_STORE_ID,
    name: '静谧空间 A 区',
    status: 'open',
    todayCloseAt: new Date(new Date().setHours(23, 0, 0, 0)).toISOString(),
    location: '近窗安静区'
  },
  metrics: {
    availableSeatCount: 24,
    studyingUserCount: 18
  },
  benefit: {
    title: '新人专享福利',
    description: '首次到店可使用 2 小时体验权益',
    claimable: true
  },
  recommendedSeats: [
    { id: 'seat_a1', code: 'A1', title: '阳光窗边位', area: 'A区', description: '自然采光 · 插座', features: ['window', 'power'], availabilityStatus: 'available' },
    { id: 'seat_b3', code: 'B3', title: '深度专注区', area: '安静区', description: '低噪 · 独立隔板', features: ['quiet', 'power'], availabilityStatus: 'available' },
    { id: 'seat_c2', code: 'C2', title: '短时学习位', area: '开放区', description: '靠近入口 · 快速入座', features: ['power'], availabilityStatus: 'reserved' }
  ]
};

const loading = ref(true);
const error = ref('');
const usingFallback = ref(false);
const summary = ref(fallbackSummary);
const currentReservation = ref(null);
const currentSession = ref(null);

const store = computed(() => {
  const source = summary.value.store || fallbackSummary.store;
  const statusMap = {
    open: '正在营业',
    closed: '今日闭店',
    maintenance: '维护中'
  };
  return {
    ...source,
    statusText: statusMap[source.status] || '营业状态待确认',
    closeText: source.todayCloseAt ? `营业至 ${formatTime(source.todayCloseAt)}` : '营业时间待确认',
    location: source.location || '默认门店'
  };
});

const metrics = computed(() => summary.value.metrics || fallbackSummary.metrics);
const benefit = computed(() => summary.value.benefit || fallbackSummary.benefit);
const recommendedSeats = computed(() => {
  const seats = summary.value.recommendedSeats || [];
  return seats.length ? seats : fallbackSummary.recommendedSeats;
});

const currentTitle = computed(() => {
  if (currentSession.value) return '学习中';
  if (currentReservation.value) return '当前预约';
  return '当前无预约';
});

const currentMain = computed(() => {
  if (currentSession.value) return `${currentSession.value.seatLabel || currentSession.value.seatCode || '已入座'} · 已开始学习`;
  if (currentReservation.value) return `${currentReservation.value.seatCode || '已选座位'} · ${statusText(currentReservation.value.status)}`;
  return '选择一个适合今天的座位';
});

const currentSub = computed(() => {
  const item = currentSession.value || currentReservation.value;
  if (!item) return '可从预约页查看实时座位图';
  const start = item.startedAt || item.startAt;
  const end = item.endsAt || item.endAt;
  return `${formatTime(start)}-${formatTime(end)}`;
});

const hasCurrentStatus = computed(() => Boolean(currentSession.value || currentReservation.value));

function normalizeResult(result, key) {
  return result?.[key] || result || null;
}

async function loadHome() {
  loading.value = true;
  error.value = '';
  usingFallback.value = false;

  try {
    const [summaryResult, reservationResult, sessionResult] = await Promise.allSettled([
      storeService.getSummary(DEFAULT_STORE_ID),
      reservationService.getCurrent(),
      studySessionService.getCurrent()
    ]);

    if (summaryResult.status === 'fulfilled') {
      summary.value = { ...fallbackSummary, ...summaryResult.value };
    } else {
      summary.value = fallbackSummary;
      usingFallback.value = true;
    }

    currentReservation.value = reservationResult.status === 'fulfilled'
      ? normalizeResult(reservationResult.value, 'reservation')
      : null;
    currentSession.value = sessionResult.status === 'fulfilled'
      ? normalizeResult(sessionResult.value, 'session')
      : null;

    if (summaryResult.status === 'rejected' && reservationResult.status === 'rejected' && sessionResult.status === 'rejected') {
      usingFallback.value = true;
    }
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
}

function statusText(status) {
  const map = {
    pending_payment: '待支付',
    confirmed: '待签到',
    checked_in: '已签到',
    completed: '已完成',
    cancelled: '已取消',
    expired: '已过期',
    no_show: '未到场'
  };
  return map[status] || '待确认';
}

function seatStatusText(status) {
  const map = {
    available: '可预约',
    reserved: '已预约',
    occupied: '使用中',
    locked: '锁定',
    maintenance: '维护',
    disabled: '停用'
  };
  return map[status] || '待确认';
}

function formatFeatures(features = []) {
  const map = { quiet: '安静', window: '窗边', power: '插座' };
  return features.map((item) => map[item] || item).join(' · ') || '舒适学习位';
}

function seatImageClass(seat) {
  const features = seat.features || [];
  return features.includes('quiet') ? 'quiet' : 'window';
}

function seatImageSrc(seat) {
  return seatImageClass(seat) === 'quiet'
    ? '/static/images/seat-quiet-pod.svg'
    : '/static/images/seat-window.svg';
}

function goBooking() {
  uni.switchTab({ url: ROUTES.booking });
}

function goBookingWithSeat(seat) {
  uni.setStorageSync('zixishi_preferred_seat_id', seat.id);
  uni.switchTab({ url: ROUTES.booking });
}

function goSeatStatus() {
  uni.navigateTo({ url: ROUTES.seatStatus });
}

function goAccess() {
  uni.switchTab({ url: ROUTES.access });
}

function goPackages() {
  uni.switchTab({ url: ROUTES.packages });
}

onShow(loadHome);
onPullDownRefresh(loadHome);
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(160rpx + env(safe-area-inset-top)) 48rpx calc(260rpx + env(safe-area-inset-bottom));
  background: #fbf9f9;
  color: #1b1c1c;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}

.top-bar {
  position: fixed;
  z-index: 50;
  top: 0;
  left: 0;
  right: 0;
  height: calc(128rpx + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 48rpx 0;
  box-sizing: border-box;
  background: rgba(251, 249, 249, 0.94);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;
}

.brand-pin {
  display: flex;
}

.brand-title {
  color: #031632;
  font-size: 40rpx;
  line-height: 56rpx;
  font-weight: 600;
}

.icon-button,
.avatar-button,
.small-button,
.link-button,
.book-card,
.benefit-card {
  margin: 0;
  border: 0;
  padding: 0;
}

.icon-button,
.avatar-button {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: #e4e2e2;
  color: #44474d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-banner {
  position: relative;
  height: 480rpx;
  border-radius: 56rpx;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(3, 22, 50, 0.86), rgba(106, 93, 67, 0.28)),
    linear-gradient(120deg, #d6c4a5, #f5f3f3 45%, #1a2b48);
  box-shadow: 0 10rpx 40rpx rgba(26, 43, 72, 0.08);
}

.hero-image,
.seat-photo {
  width: 100%;
  height: 100%;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  padding: 48rpx;
  background:
    linear-gradient(180deg, transparent 15%, rgba(3, 22, 50, 0.18) 45%, rgba(3, 22, 50, 0.82) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-sizing: border-box;
}

.hero-title {
  display: block;
  color: #ffffff;
  font-size: 56rpx;
  line-height: 72rpx;
  font-weight: 600;
  letter-spacing: 0;
}

.hero-subtitle {
  display: block;
  margin-top: 12rpx;
  color: rgba(245, 243, 243, 0.9);
  font-size: 32rpx;
  line-height: 48rpx;
}

.state-card,
.notice,
.today-card,
.metric-card,
.current-tip,
.seat-card {
  border: 1rpx solid rgba(197, 198, 206, 0.42);
  background: #ffffff;
  box-shadow: 0 10rpx 40rpx rgba(26, 43, 72, 0.06);
}

.state-card {
  padding: 40rpx;
  border-radius: 32rpx;
  color: #44474d;
  font-size: 28rpx;
  line-height: 44rpx;
}

.state-card.error {
  color: #ba1a1a;
  background: #ffdad6;
}

.small-button {
  margin-top: 20rpx;
  padding: 18rpx 28rpx;
  border-radius: 999rpx;
  background: #031632;
  color: #ffffff;
  font-size: 24rpx;
}

.notice {
  margin-bottom: 24rpx;
  padding: 18rpx 24rpx;
  border-radius: 999rpx;
  color: #6a5d43;
  background: rgba(240, 222, 189, 0.42);
  font-size: 24rpx;
}

.bento {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 48rpx;
}

.today-card {
  min-height: 316rpx;
  border-radius: 48rpx;
  padding: 40rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.today-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.section-label,
.tip-label,
.metric-label,
.seat-desc {
  display: block;
  color: #44474d;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 500;
  letter-spacing: 0;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.status-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #6a5d43;
}

.status-text {
  color: #031632;
  font-size: 40rpx;
  line-height: 52rpx;
  font-weight: 600;
}

.time-pill {
  flex: 0 0 auto;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid #f0debd;
  background: rgba(240, 222, 189, 0.32);
  color: #6a5d43;
  font-size: 24rpx;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.metric-card {
  min-height: 152rpx;
  border: 0;
  border-radius: 32rpx;
  padding: 24rpx;
  background: #f5f3f3;
  box-shadow: none;
  box-sizing: border-box;
}

.metric-icon {
  display: flex;
}

.metric-value {
  display: block;
  margin-top: 8rpx;
  color: #031632;
  font-size: 44rpx;
  line-height: 54rpx;
  font-weight: 600;
}

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.book-card {
  min-height: 168rpx;
  border-radius: 48rpx;
  background: #031632;
  color: #ffffff;
  box-shadow: 0 10rpx 40rpx rgba(26, 43, 72, 0.08);
  font-size: 40rpx;
  line-height: 52rpx;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.action-icon {
  display: flex;
}

.benefit-card {
  min-height: 124rpx;
  border-radius: 40rpx;
  padding: 24rpx;
  background: #f3e0c0;
  color: #231a06;
  box-shadow: none;
  display: flex;
  align-items: center;
  gap: 18rpx;
  text-align: left;
}

.benefit-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #6a5d43;
  display: flex;
  align-items: center;
  justify-content: center;
}

.benefit-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.benefit-title {
  color: #231a06;
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 700;
}

.benefit-text {
  margin-top: 4rpx;
  color: rgba(35, 26, 6, 0.72);
  font-size: 22rpx;
  line-height: 30rpx;
}

.benefit-arrow {
  flex: 0 0 auto;
}

.current-tip {
  margin-top: 24rpx;
  padding: 24rpx 28rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.tip-main {
  display: block;
  color: #031632;
  margin-top: 8rpx;
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 600;
}

.tip-sub {
  display: block;
  margin-top: 4rpx;
  color: #44474d;
  font-size: 24rpx;
}

.tip-arrow {
  flex: 0 0 auto;
}

.section-head {
  margin-top: 52rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #031632;
  font-size: 48rpx;
  line-height: 64rpx;
  font-weight: 500;
}

.link-button {
  background: transparent;
  color: #6a5d43;
  font-size: 28rpx;
}

.seat-scroll {
  width: 100%;
  margin-top: 24rpx;
}

.seat-row {
  display: flex;
  gap: 32rpx;
  width: max-content;
  padding: 0 2rpx 18rpx;
}

.seat-card {
  width: 520rpx;
  box-sizing: border-box;
  border-radius: 48rpx;
  overflow: hidden;
}

.seat-image {
  position: relative;
  height: 320rpx;
  background:
    linear-gradient(135deg, rgba(214, 196, 165, 0.72), rgba(245, 243, 243, 0.92)),
    #e9e8e7;
}

.seat-image.quiet {
  background:
    linear-gradient(135deg, rgba(26, 43, 72, 0.82), rgba(240, 222, 189, 0.42)),
    #1a2b48;
}

.seat-title {
  display: block;
  color: #031632;
  font-size: 36rpx;
  line-height: 48rpx;
  font-weight: 500;
}

.seat-copy {
  padding: 28rpx 32rpx 32rpx;
}

.seat-status {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #031632;
  font-size: 22rpx;
  font-weight: 600;
}

.seat-status.reserved,
.seat-status.occupied,
.seat-status.locked,
.seat-status.maintenance,
.seat-status.disabled {
  background: rgba(245, 243, 243, 0.94);
  color: #7b8190;
}

@media (max-width: 360px) {
  .page {
    padding-left: 36rpx;
    padding-right: 36rpx;
  }
}

@media (min-width: 768px) {
  .bento {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 32rpx;
  }

  .book-card {
    flex: 1;
  }
}
</style>

<style>
.page {
  padding: calc(154rpx + env(safe-area-inset-top)) 40rpx calc(256rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #fffdf8 0%, #f7f1e8 48%, #fffaf2 100%);
  color: #031632;
}

.app-topbar--warm {
  border-bottom: 1rpx solid rgba(156, 120, 54, 0.1);
  background: rgba(255, 253, 248, 0.9);
  box-shadow: 0 18rpx 52rpx rgba(3, 22, 50, 0.04);
}

.small-button::after,
.link-button::after,
.member-button::after,
.quick-card::after,
.book-card::after,
.benefit-card::after {
  border: 0;
}

.hero-banner {
  height: 548rpx;
  border-radius: 32rpx;
  background: #081a33;
  box-shadow: 0 28rpx 72rpx rgba(3, 22, 50, 0.18);
}

.hero-overlay {
  padding: 44rpx;
  background:
    linear-gradient(90deg, rgba(3, 22, 50, 0.88) 0%, rgba(3, 22, 50, 0.62) 48%, rgba(3, 22, 50, 0.12) 100%),
    linear-gradient(180deg, rgba(3, 22, 50, 0.04) 0%, rgba(3, 22, 50, 0.74) 100%);
}

.hero-kicker {
  align-self: flex-start;
  margin-bottom: auto;
  padding: 12rpx 18rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.38);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: #f3e0c0;
  font-size: 20rpx;
  line-height: 28rpx;
  font-weight: 700;
}

.hero-kicker text {
  color: currentColor;
  letter-spacing: 0;
}

.hero-title {
  max-width: 520rpx;
  font-size: 64rpx;
  line-height: 78rpx;
  font-weight: 700;
}

.hero-subtitle {
  max-width: 520rpx;
  margin-top: 16rpx;
  color: rgba(255, 250, 242, 0.88);
  font-size: 28rpx;
  line-height: 42rpx;
}

.hero-meta {
  width: 100%;
  margin-top: 34rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.24);
  border-radius: 28rpx;
  background: rgba(5, 18, 38, 0.46);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.hero-meta-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.hero-meta-value {
  color: #ffffff;
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-meta-label {
  color: rgba(243, 224, 192, 0.86);
  font-size: 22rpx;
  line-height: 30rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-divider {
  width: 1rpx;
  height: 56rpx;
  margin: 0 24rpx;
  background: rgba(243, 224, 192, 0.26);
}

.member-panel {
  margin-top: 28rpx;
  padding: 30rpx;
  border: 1rpx solid rgba(156, 120, 54, 0.2);
  border-radius: 28rpx;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(250, 242, 228, 0.9)),
    #fffaf2;
  box-shadow: 0 18rpx 54rpx rgba(84, 60, 22, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.member-label,
.book-label {
  display: block;
  color: #9c7836;
  font-size: 20rpx;
  line-height: 28rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.member-title {
  display: block;
  margin-top: 8rpx;
  color: #031632;
  font-size: 34rpx;
  line-height: 44rpx;
  font-weight: 700;
}

.member-desc {
  display: block;
  margin-top: 6rpx;
  color: #596172;
  font-size: 24rpx;
  line-height: 34rpx;
}

.member-button {
  flex: 0 0 auto;
  margin: 0;
  padding: 16rpx 28rpx;
  border: 0;
  border-radius: 999rpx;
  background: #031632;
  color: #ffffff;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.quick-grid {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
}

.quick-card {
  min-height: 188rpx;
  margin: 0;
  padding: 22rpx 16rpx;
  border: 1rpx solid rgba(156, 120, 54, 0.16);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 14rpx 42rpx rgba(3, 22, 50, 0.06);
  color: #031632;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8rpx;
  text-align: left;
}

.quick-card--primary {
  border-color: rgba(3, 22, 50, 0.86);
  background: linear-gradient(145deg, #031632, #17345b);
  color: #ffffff;
  box-shadow: 0 20rpx 56rpx rgba(3, 22, 50, 0.18);
}

.quick-icon {
  margin-bottom: auto;
  display: flex;
}

.quick-title {
  display: block;
  color: currentColor;
  font-size: 26rpx;
  line-height: 34rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.quick-desc {
  display: block;
  color: #747b87;
  font-size: 20rpx;
  line-height: 28rpx;
}

.quick-card--primary .quick-desc {
  color: rgba(243, 224, 192, 0.82);
}

.state-card,
.notice,
.today-card,
.metric-card,
.current-tip,
.seat-card {
  border: 1rpx solid rgba(156, 120, 54, 0.14);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18rpx 54rpx rgba(3, 22, 50, 0.06);
}

.state-card {
  border-radius: 28rpx;
  color: #596172;
}

.notice {
  border-radius: 24rpx;
  color: #8a6427;
  background: rgba(243, 224, 192, 0.52);
}

.bento {
  margin-top: 32rpx;
}

.today-card {
  border-radius: 28rpx;
  padding: 34rpx;
}

.section-label,
.tip-label,
.metric-label,
.seat-desc {
  color: #596172;
}

.status-dot {
  background: #c79b4b;
  box-shadow: 0 0 0 8rpx rgba(199, 155, 75, 0.16);
}

.time-pill {
  border-color: rgba(156, 120, 54, 0.22);
  background: rgba(243, 224, 192, 0.44);
  color: #8a6427;
}

.metric-card {
  border: 1rpx solid rgba(156, 120, 54, 0.1);
  border-radius: 24rpx;
  background: #fffaf2;
}

.book-card {
  min-height: 168rpx;
  padding: 28rpx 32rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #031632, #15335a 72%, #23476f);
  box-shadow: 0 18rpx 52rpx rgba(3, 22, 50, 0.18);
  flex-direction: row;
  justify-content: space-between;
  gap: 24rpx;
  text-align: left;
}

.book-title {
  display: block;
  margin-top: 6rpx;
  color: #ffffff;
  font-size: 40rpx;
  line-height: 52rpx;
  font-weight: 700;
}

.action-icon {
  flex: 0 0 auto;
}

.benefit-card {
  border: 1rpx solid rgba(156, 120, 54, 0.2);
  border-radius: 28rpx;
}

.current-tip {
  border-radius: 28rpx;
}

.tip-sub {
  color: #596172;
}

.section-title {
  font-size: 42rpx;
  line-height: 56rpx;
  font-weight: 700;
}

.link-button {
  color: #9c7836;
}

.seat-card {
  border-radius: 28rpx;
}

.seat-image {
  background:
    linear-gradient(135deg, rgba(243, 224, 192, 0.72), rgba(255, 250, 242, 0.92)),
    #fffaf2;
}

.seat-copy {
  background: rgba(255, 255, 255, 0.78);
}

.seat-status {
  background: rgba(255, 250, 242, 0.94);
}

@media (max-width: 360px) {
  .page {
    padding-left: 32rpx;
    padding-right: 32rpx;
  }

  .quick-grid {
    gap: 14rpx;
  }

  .quick-card {
    min-height: 176rpx;
    padding: 20rpx 14rpx;
  }
}
</style>
