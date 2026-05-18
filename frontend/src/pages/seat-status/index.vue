<template>
  <view class="page">
    <view class="top-bar">
      <button class="top-icon" @tap="loadStatus">
        <AppIcon name="menu" :size="36" color="#44474d" />
      </button>
      <text class="brand-title">静谧空间</text>
      <button class="avatar-button">
        <AppIcon name="person" :size="34" color="#44474d" />
      </button>
    </view>

    <view class="header">
      <text class="title">空间控制</text>
      <text class="subtitle">{{ headerSubtitle }}</text>
    </view>

    <view v-if="loading" class="state-card">正在同步当前座位...</view>
    <view v-else-if="error" class="state-card error">
      <text>{{ error }}</text>
      <button class="small-button" @tap="loadStatus">重试</button>
    </view>

    <template v-else-if="activeItem">
      <view class="power-card">
        <view class="power-glow"></view>
        <view class="power-icon">
          <AppIcon name="power" :size="82" color="#6a5d43" />
        </view>
        <text class="power-title">{{ powerTitle }}</text>
        <text class="time-range">{{ timeRange }}</text>
        <view class="status-pills">
          <view class="status-pill">
            <AppIcon name="power" :size="24" color="#6a5d43" />
            <text>{{ powerPillText }}</text>
          </view>
          <view class="status-pill">
            <AppIcon name="wifi" :size="24" color="#6a5d43" />
            <text>{{ wifiPillText }}</text>
          </view>
        </view>
      </view>

      <view class="detail-grid">
        <view class="device-card">
          <view class="detail-icon">
            <AppIcon name="schedule" :size="34" color="#031632" />
          </view>
          <text class="device-label">今日学习</text>
          <text class="device-value">{{ todayStudyText }}</text>
        </view>
        <view class="device-card">
          <view class="detail-icon">
            <AppIcon name="hourglass_empty" :size="34" color="#031632" />
          </view>
          <text class="device-label">套餐剩余</text>
          <text class="device-value">{{ remainingPackageText }}</text>
        </view>
      </view>

      <view v-if="actionError" class="state-card error">{{ actionError }}</view>

      <view class="action-stack">
        <button v-if="canCheckIn" class="action primary" :disabled="acting" @tap="checkIn">签到入座</button>
        <button v-if="canEnd" class="action primary" :disabled="acting" @tap="endSession">结束本次学习</button>
        <view class="secondary-actions">
          <button v-if="canCancel" class="action secondary danger" :disabled="acting" @tap="cancelReservation">取消预约</button>
          <button class="action tertiary" :disabled="acting" @tap="goAccess">
            <AppIcon name="lock_open" :size="28" color="#6a5d43" />
            <text>打开门禁</text>
          </button>
        </view>
      </view>
    </template>

    <view v-else class="empty-card">
      <text class="empty-title">当前没有预约或学习会话</text>
      <text class="empty-sub">预约座位后，可在这里查看倒计时、签到和结束学习。</text>
      <button class="confirm-button" @tap="goBooking">去预约</button>
    </view>

    <AppBottomNav current="access" />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { reservationService } from '../../api/services/reservation';
import { studySessionService } from '../../api/services/studySession';
import { formatTime, getDurationMinutes, toDate } from '../../utils/date';
import { ROUTES } from '../../utils/route';
import AppBottomNav from '../../components/common/AppBottomNav.vue';

const loading = ref(true);
const error = ref('');
const actionError = ref('');
const acting = ref(false);
const currentReservation = ref(null);
const currentSession = ref(null);
const now = ref(Date.now());
let timer = null;

const activeItem = computed(() => currentSession.value || currentReservation.value);
const activeSeatText = computed(() => {
  const item = activeItem.value;
  if (!item) return '暂无进行中的座位';
  const code = item.seatLabel || item.seatCode || '已选座位';
  const area = item.seatArea || item.area;
  return area ? `当前座位：${code} (${area})` : `当前座位：${code}`;
});
const headerSubtitle = computed(() => activeSeatText.value);
const modeLabel = computed(() => currentSession.value ? '学习中' : statusText(currentReservation.value?.status));
const canCheckIn = computed(() => currentReservation.value?.status === 'confirmed' && !currentSession.value);
const canCancel = computed(() => ['pending_payment', 'confirmed'].includes(currentReservation.value?.status));
const canEnd = computed(() => Boolean(currentSession.value?.id));
const powerTitle = computed(() => currentSession.value ? '座位供电：已激活' : `座位待激活：${modeLabel.value}`);
const powerPillText = computed(() => {
  if (!currentSession.value) return '待签到激活';
  return currentSession.value.powerEnabled ? '插座已通电' : '插座未通电';
});
const wifiPillText = computed(() => {
  if (!currentSession.value) return '到店后连接';
  return currentSession.value.wifiConnected ? '无线网络已连接' : '无线网络待连接';
});
const todayStudyText = computed(() => {
  if (currentSession.value) return minutesToHourText(currentSession.value.todayStudyMinutes);
  return timeRange.value || '待开始';
});
const remainingPackageText = computed(() => {
  if (currentSession.value) return minutesToHourText(currentSession.value.remainingPackageMinutes);
  return countdownText.value;
});

const timeRange = computed(() => {
  const item = activeItem.value;
  if (!item) return '';
  const start = item.startedAt || item.startAt;
  const end = item.endsAt || item.endAt;
  return `${formatTime(start)}-${formatTime(end)}`;
});

const countdownLabel = computed(() => {
  if (currentSession.value) return '剩余学习时间';
  const start = toDate(currentReservation.value?.startAt)?.getTime() || 0;
  return start > now.value ? '距离开始' : '预约剩余时间';
});

const countdownText = computed(() => {
  const item = activeItem.value;
  if (!item) return '--:--';
  const target = currentSession.value
    ? item.endsAt
    : ((toDate(item.startAt)?.getTime() || 0) > now.value ? item.startAt : item.endAt);
  const diff = Math.max(0, (toDate(target)?.getTime() || now.value) - now.value);
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const progressWidth = computed(() => {
  const item = activeItem.value;
  if (!item) return '0%';
  const start = toDate(item.startedAt || item.startAt)?.getTime() || now.value;
  const end = toDate(item.endsAt || item.endAt)?.getTime() || now.value;
  const total = Math.max(1, end - start);
  const used = Math.min(total, Math.max(0, now.value - start));
  return `${Math.round((used / total) * 100)}%`;
});

async function loadStatus(query = {}) {
  loading.value = true;
  error.value = '';
  actionError.value = '';

  try {
    const [sessionResult, reservationResult] = await Promise.allSettled([
      studySessionService.getCurrent(),
      query.reservationId
        ? reservationService.getReservation(query.reservationId)
        : reservationService.getCurrent()
    ]);

    currentSession.value = sessionResult.status === 'fulfilled'
      ? (sessionResult.value.session || null)
      : null;
    currentReservation.value = reservationResult.status === 'fulfilled'
      ? (reservationResult.value.reservation || null)
      : null;

    if (sessionResult.status === 'rejected' && reservationResult.status === 'rejected') {
      error.value = '座位状态加载失败，请稍后重试。';
      currentSession.value = null;
      currentReservation.value = null;
    }
  } catch (err) {
    error.value = err?.message || '座位状态加载失败。';
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
}

function getActionError(err, fallback) {
  if (err?.statusCode === 401 || err?.code === 'UNAUTHORIZED') return '登录状态不可用，请登录后重试。';
  return err?.message || fallback;
}

async function cancelReservation() {
  if (!currentReservation.value?.id || acting.value) return;
  acting.value = true;
  actionError.value = '';
  try {
    await reservationService.cancelReservation(currentReservation.value.id, { reason: 'user_cancelled' });
    currentReservation.value = null;
    uni.showToast({ title: '已取消', icon: 'success' });
  } catch (err) {
    actionError.value = getActionError(err, '取消预约失败。');
  } finally {
    acting.value = false;
  }
}

async function checkIn() {
  if (!currentReservation.value?.id || acting.value) return;
  acting.value = true;
  actionError.value = '';
  try {
    const result = await studySessionService.checkIn({
      reservationId: currentReservation.value.id,
      checkInSource: 'mini_program'
    });
    currentSession.value = result.session || null;
    if (currentSession.value) currentReservation.value = null;
    uni.showToast({ title: '签到成功', icon: 'success' });
  } catch (err) {
    actionError.value = getActionError(err, '签到失败，请确认预约时间。');
  } finally {
    acting.value = false;
  }
}

async function endSession() {
  if (!currentSession.value?.id || acting.value) return;
  acting.value = true;
  actionError.value = '';
  try {
    await studySessionService.endSession(currentSession.value.id, { reason: 'user_completed' });
    currentSession.value = null;
    uni.showToast({ title: '已结束', icon: 'success' });
  } catch (err) {
    actionError.value = getActionError(err, '结束学习失败。');
  } finally {
    acting.value = false;
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

function minutesToHourText(minutes) {
  const value = Number(minutes || 0);
  if (!value) return '0小时';
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}小时${rest}分` : `${hours}小时`;
}

function goBooking() {
  uni.switchTab({ url: ROUTES.booking });
}

function goAccess() {
  uni.switchTab({ url: ROUTES.access });
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
}

onLoad((query = {}) => {
  loadStatus(query);
});

onShow(() => {
  ensureTimer();
});

onPullDownRefresh(() => loadStatus());

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(176rpx + env(safe-area-inset-top)) 48rpx calc(280rpx + env(safe-area-inset-bottom));
  background: #f9f7f2;
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

.top-icon,
.avatar-button {
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999rpx;
  background: #e4e2e2;
  color: #44474d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title {
  color: #031632;
  font-size: 40rpx;
  line-height: 56rpx;
  font-weight: 600;
}

.header {
  margin-bottom: 56rpx;
  text-align: center;
}

.title {
  display: block;
  color: #031632;
  font-size: 56rpx;
  line-height: 72rpx;
  font-weight: 600;
  letter-spacing: 0;
}

.subtitle {
  display: block;
  margin-top: 12rpx;
  color: #44474d;
  font-size: 32rpx;
  line-height: 48rpx;
}

.state-card,
.notice,
.power-card,
.device-card,
.empty-card {
  border: 1rpx solid rgba(197, 198, 206, 0.32);
  background: #ffffff;
  box-shadow: 0 10rpx 30rpx rgba(26, 43, 72, 0.05);
}

.state-card,
.notice {
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: 32rpx;
  color: #44474d;
  font-size: 26rpx;
  line-height: 1.5;
}

.state-card.error {
  color: #ba1a1a;
  background: #ffdad6;
}

.power-card {
  position: relative;
  min-height: 420rpx;
  border-radius: 48rpx;
  padding: 64rpx 40rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
}

.power-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(214, 196, 165, 0.26), transparent 68%);
}

.power-icon {
  position: relative;
  z-index: 1;
  width: 176rpx;
  height: 176rpx;
  margin-bottom: 36rpx;
  border-radius: 999rpx;
  background: #f0debd;
  color: #6a5d43;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40rpx rgba(214, 196, 165, 0.42);
}

.power-title {
  position: relative;
  z-index: 1;
  color: #031632;
  font-size: 48rpx;
  line-height: 64rpx;
  font-weight: 500;
}

.time-range {
  position: relative;
  z-index: 1;
  margin-top: 12rpx;
  color: #44474d;
  font-size: 26rpx;
}

.status-pills {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14rpx;
  margin-top: 32rpx;
}

.status-pill {
  min-height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1rpx solid #f0debd;
  background: rgba(240, 222, 189, 0.32);
  color: #6a5d43;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24rpx;
  margin-top: 32rpx;
}

.device-card {
  min-height: 236rpx;
  border-radius: 48rpx;
  padding: 36rpx;
  box-sizing: border-box;
}

.detail-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(3, 22, 50, 0.05);
  color: #031632;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}

.device-value {
  display: block;
  margin-top: 12rpx;
  color: #031632;
  font-size: 50rpx;
  line-height: 62rpx;
  font-weight: 600;
}

.device-label {
  display: block;
  color: #44474d;
  font-size: 28rpx;
  line-height: 40rpx;
}

.action-stack {
  margin-top: 48rpx;
}

.secondary-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 22rpx;
}

.action,
.confirm-button,
.small-button {
  margin: 0;
  border: 0;
  border-radius: 999rpx;
  background: #ffffff;
  color: #031632;
  font-size: 28rpx;
  font-weight: 600;
}

.action {
  width: 100%;
  min-height: 104rpx;
}

.action.primary,
.confirm-button,
.small-button {
  background: #031632;
  color: #ffffff;
}

.action.secondary {
  min-height: 88rpx;
  border: 1rpx solid rgba(197, 198, 206, 0.5);
}

.action.tertiary {
  min-height: 80rpx;
  background: transparent;
  border: 0;
  color: #6a5d43;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.action.danger {
  color: #ba1a1a;
  background: rgba(255, 218, 214, 0.42);
  border-color: rgba(186, 26, 26, 0.12);
}

.action[disabled] {
  opacity: 0.55;
}

.empty-card {
  padding: 56rpx 40rpx;
  border-radius: 48rpx;
  text-align: center;
}

.empty-title {
  display: block;
  color: #031632;
  font-size: 40rpx;
  line-height: 52rpx;
  font-weight: 600;
}

.empty-sub {
  display: block;
  margin-top: 14rpx;
  color: #44474d;
  font-size: 26rpx;
  line-height: 1.6;
}

.confirm-button {
  width: 100%;
  margin-top: 30rpx;
  padding: 24rpx;
}

.small-button {
  margin-top: 20rpx;
  padding: 18rpx 28rpx;
  font-size: 24rpx;
}

@media (min-width: 768px) {
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 360px) {
  .page {
    padding-left: 36rpx;
    padding-right: 36rpx;
  }
}
</style>
