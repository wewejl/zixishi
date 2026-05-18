<template>
  <view class="access-page">
    <AppTopBar
      title="静谧空间"
      subtitle="会员门禁"
      theme="warm"
      show-back
      :show-menu="false"
      :auto-back="false"
      :center-title="false"
      @back="goBack"
    />

    <view class="hero">
      <view class="hero-heading">
        <text class="hero-kicker">PRIVATE ACCESS</text>
        <text class="hero-title">静谧空间 · 智能门禁</text>
        <text class="hero-desc">静谧空间 A 区</text>
        <view class="bluetooth-pill" :class="{ disconnected: !canOpenDoor && !loading }">
          <AppIcon name="bluetooth_connected" :size="32" color="#f3e0c0" />
          <text>{{ statusText }}</text>
        </view>
      </view>

      <view class="access-card">
        <view class="access-card__glow"></view>
        <button class="unlock-button" :class="{ disabled: opening || loading }" :disabled="opening || loading" @click="unlockDoor">
          <view class="unlock-icon">
            <text v-if="opening" class="loading-dot">...</text>
            <AppIcon v-else name="lock_open" :size="88" color="#f3e0c0" />
          </view>
          <text class="unlock-label">{{ opening ? '开门中' : '一键开门' }}</text>
        </button>
        <view class="usable-card">
          <AppIcon name="schedule" :size="34" color="#f3e0c0" />
          <text>{{ usableUntilText }}</text>
        </view>
      </view>

      <PrimaryButton class="password-button" tone="secondary" text="进入密码管理" @click="goLongTermCode">
        <template #icon>
          <AppIcon name="password" :size="36" color="#031632" />
        </template>
      </PrimaryButton>

      <view v-if="errorMessage" class="result-card">
        <text>{{ errorMessage }}</text>
      </view>
    </view>

    <AppBottomNav current="access" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import accessService from '../../api/services/access';
import userService from '../../api/services/user';
import reservationService from '../../api/services/reservation';
import studySessionService from '../../api/services/studySession';
import { DEFAULT_ACCESS_DEVICE_ID, DEFAULT_STORE_ID } from '../../utils/constants';
import { authStore } from '../../stores/auth';
import AppIcon from '../../components/common/AppIcon.vue';
import AppBottomNav from '../../components/common/AppBottomNav.vue';
import AppTopBar from '../../components/common/AppTopBar.vue';
import PrimaryButton from '../../components/common/PrimaryButton.vue';

const loading = ref(true);
const opening = ref(false);
const profile = ref(null);
const currentReservation = ref(null);
const currentSession = ref(null);
const lastUnlock = ref(null);
const errorMessage = ref('');

const canOpenDoor = computed(() => {
  const entitlement = profile.value?.entitlement || {};
  const user = profile.value?.user || {};
  return Boolean(
    currentSession.value?.session ||
    currentSession.value?.id ||
    currentReservation.value?.reservation ||
    currentReservation.value?.id ||
    user.isLongTermMember ||
    entitlement.isLongTermMember
  );
});

const statusText = computed(() => {
  if (loading.value) return '校验中';
  return canOpenDoor.value ? '蓝牙已连接' : '待校验';
});

const usableUntilText = computed(() => `当前可使用至 ${formatTime(lastUnlock.value?.usableUntil)}`);

onShow(() => {
  loadAccessState();
});

async function loadAccessState() {
  loading.value = true;
  errorMessage.value = '';
  profile.value = null;
  currentReservation.value = null;
  currentSession.value = null;
  try {
    await authStore.ensureAuthForRequest();

    if (!authStore.getToken()) {
      errorMessage.value = '请先登录后再使用门禁';
      return;
    }

    const [meResult, reservationResult, sessionResult] = await Promise.allSettled([
      userService.getMe(),
      reservationService.getCurrent(),
      studySessionService.getCurrent()
    ]);

    if (meResult.status === 'fulfilled') profile.value = meResult.value;
    if (reservationResult.status === 'fulfilled') currentReservation.value = reservationResult.value;
    if (sessionResult.status === 'fulfilled') currentSession.value = sessionResult.value;

    if (meResult.status === 'rejected' && reservationResult.status === 'rejected' && sessionResult.status === 'rejected') {
      errorMessage.value = readableError(meResult.reason, '暂时无法校验通行权限');
    }
  } finally {
    loading.value = false;
  }
}

async function unlockDoor() {
  opening.value = true;
  errorMessage.value = '';
  lastUnlock.value = null;
  try {
    const result = await accessService.unlock({
      storeId: DEFAULT_STORE_ID,
      deviceId: DEFAULT_ACCESS_DEVICE_ID,
      clientContext: { bluetoothConnected: true }
    });
    lastUnlock.value = result.unlock || result;
    uni.showToast({ title: '门已打开', icon: 'success' });
  } catch (error) {
    errorMessage.value = readableError(error, '当前没有可使用的预约或会员权益');
    uni.showToast({ title: '开门失败', icon: 'none' });
  } finally {
    opening.value = false;
  }
}

function goLongTermCode() {
  uni.navigateTo({ url: '/pages/long-term-password/index' });
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/home/index' }) });
}

function readableError(error, fallback) {
  if (error?.statusCode === 401 || error?.code === 'UNAUTHORIZED') return '请先登录后再使用门禁';
  return error?.message || fallback;
}

function formatTime(value) {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
</script>

<style>
.access-page {
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(160rpx + env(safe-area-inset-top)) 48rpx calc(220rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% 20%, rgba(243, 224, 192, 0.48), transparent 34%),
    linear-gradient(180deg, #fffdf8 0%, #fbf9f9 52%, #f7f1e8 100%);
  color: #031632;
}

.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 380rpx - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  text-align: center;
}

.hero-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 48rpx;
}

.hero-kicker {
  display: block;
  color: #9a7a3d;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 32rpx;
}

.hero-title {
  margin-top: 10rpx;
  color: #031632;
  font-size: 52rpx;
  font-weight: 600;
  line-height: 68rpx;
  overflow-wrap: anywhere;
}

.hero-desc {
  margin-top: 12rpx;
  max-width: 100%;
  color: #4b5360;
  overflow-wrap: anywhere;
  font-size: 30rpx;
  line-height: 44rpx;
}

.bluetooth-pill {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 28rpx;
  padding: 12rpx 32rpx;
  border: 1rpx solid rgba(216, 189, 130, 0.48);
  border-radius: 999rpx;
  background: rgba(243, 224, 192, 0.42);
  color: #6a5d43;
  font-size: 24rpx;
  font-weight: 600;
}

.bluetooth-pill.disconnected {
  color: #9a7a3d;
}

.access-card {
  position: relative;
  width: 100%;
  max-width: 680rpx;
  padding: 56rpx 40rpx 40rpx;
  border-radius: 48rpx;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(3, 22, 50, 0.96), rgba(7, 28, 62, 0.98)),
    #031632;
  color: #ffffff;
  box-shadow: 0 30rpx 90rpx rgba(3, 22, 50, 0.2);
}

.access-card::after {
  position: absolute;
  top: -180rpx;
  right: -160rpx;
  width: 420rpx;
  height: 420rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.2);
  border-radius: 50%;
  content: '';
}

.access-card__glow {
  position: absolute;
  left: 50%;
  top: 44%;
  width: 420rpx;
  height: 420rpx;
  margin: -210rpx 0 0 -210rpx;
  border-radius: 50%;
  background: rgba(243, 224, 192, 0.12);
  filter: blur(70rpx);
}

.unlock-button {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 336rpx;
  height: 336rpx;
  margin: 0 auto 40rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.22);
  border-radius: 50%;
  background: rgba(251, 249, 249, 0.06);
  box-shadow: 0 0 72rpx rgba(243, 224, 192, 0.16), inset 0 0 40rpx rgba(243, 224, 192, 0.06);
  color: #ffffff;
  line-height: 1.25;
  white-space: normal;
  transition: transform 180ms ease, opacity 180ms ease;
}

.unlock-button:active {
  transform: scale(0.95);
}

.unlock-button.disabled {
  opacity: 0.55;
}

.unlock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f3e0c0;
  background: transparent;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
}

.loading-dot {
  font-size: 44rpx;
  line-height: 1;
}

.unlock-label {
  margin-top: 12rpx;
  font-size: 44rpx;
  font-weight: 600;
  line-height: 58rpx;
  overflow-wrap: anywhere;
}

.usable-card {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  min-width: 0;
  min-height: 96rpx;
  padding: 28rpx 32rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.18);
  border-radius: 32rpx;
  background: rgba(251, 249, 249, 0.08);
  color: rgba(251, 249, 249, 0.82);
  font-size: 30rpx;
}

.password-button {
  width: 100%;
  max-width: 680rpx;
  margin-top: 28rpx;
  color: #031632;
}

.result-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 640rpx;
  margin-top: 24rpx;
  padding: 24rpx 28rpx;
  border: 1rpx solid rgba(186, 26, 26, 0.16);
  border-radius: 32rpx;
  background: #fff1ef;
  color: #ba1a1a;
  font-size: 24rpx;
}

</style>
