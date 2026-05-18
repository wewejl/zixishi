<template>
  <view class="password-page">
    <view class="password-nav">
      <button class="back-button" @click="goBack">
        <AppIcon name="arrow_back" :size="42" color="#031632" />
      </button>
    </view>

    <view class="password-main">
      <view class="intro">
        <view class="shield">
          <AppIcon name="shield_lock" :size="96" color="#6a5d43" />
        </view>
        <text class="title">长期通行码</text>
        <text class="desc">长期会员专享，可在门口触控屏直接输入。</text>
      </view>

      <view v-if="loading" class="glass-card">
        <text class="muted">正在读取通行码...</text>
      </view>

      <view v-else-if="forbidden" class="glass-card">
        <text class="code-title">暂无长期通行权限</text>
        <text class="muted">当前账号不是长期会员或权益已失效。</text>
      </view>

      <view v-else class="glass-card">
        <view class="ambient"></view>
        <text class="one-time" v-if="oneTimeDisplayCode">仅本次显示</text>
        <view class="code-groups">
          <text v-for="group in groupedDisplayCode" :key="group" class="code">{{ group }}</text>
        </view>
        <text class="code-meta">有效期至：{{ formatDateTime(codeInfo.expiresAt) }}</text>
        <text v-if="codeInfo.refreshAfter" class="muted">下次可刷新：{{ formatDateTime(codeInfo.refreshAfter) }}</text>
      </view>

      <view v-if="errorMessage && !forbidden" class="error-box">
        <text>{{ errorMessage }}</text>
      </view>

      <PrimaryButton
        v-if="forbidden"
        class="password-action"
        tone="light"
        size="large"
        text="去商城查看套餐"
        @click="goPackages"
      />
      <PrimaryButton
        v-else
        class="password-action"
        tone="light"
        size="large"
        :disabled="refreshing || loading"
        :text="primaryButtonText"
        @click="oneTimeDisplayCode ? copyCode() : refreshCode()"
      >
        <template #icon>
          <AppIcon v-if="oneTimeDisplayCode" name="content_copy" :size="34" color="#ffffff" />
        </template>
      </PrimaryButton>
    </view>

  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import accessService from '../../api/services/access';
import { authStore } from '../../stores/auth';
import AppIcon from '../../components/common/AppIcon.vue';
import PrimaryButton from '../../components/common/PrimaryButton.vue';

const loading = ref(true);
const refreshing = ref(false);
const forbidden = ref(false);
const codeInfo = ref({});
const oneTimeDisplayCode = ref('');
const errorMessage = ref('');

const displayCodeText = computed(() => oneTimeDisplayCode.value || codeInfo.value.maskedCode || maskSuffix(codeInfo.value.codeSuffix));
const groupedDisplayCode = computed(() => {
  const compact = String(displayCodeText.value || '').replace(/\s+/g, '');
  const source = compact || '********';
  const groups = source.match(/.{1,4}/g) || ['****', '****'];
  return groups.length === 1 ? [groups[0], '----'] : groups.slice(0, 3);
});
const primaryButtonText = computed(() => {
  if (refreshing.value) return '刷新中...';
  return oneTimeDisplayCode.value ? '复制密码' : '刷新并显示新码';
});

onLoad(() => {
  loadCode();
});

async function loadCode() {
  loading.value = true;
  forbidden.value = false;
  errorMessage.value = '';
  try {
    await authStore.ensureAuthForRequest();

    if (!authStore.getToken()) {
      errorMessage.value = '请先登录后再查看通行码';
      codeInfo.value = {
        maskedCode: '**** ----',
        codeSuffix: '----'
      };
      return;
    }

    const result = await accessService.getLongTermCode();
    codeInfo.value = result.code || result;
  } catch (error) {
    if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
      forbidden.value = true;
    } else {
      errorMessage.value = error?.message || '暂时无法获取通行码，已显示占位信息';
      codeInfo.value = {
        maskedCode: '**** ----',
        codeSuffix: '----'
      };
    }
  } finally {
    loading.value = false;
  }
}

async function refreshCode() {
  refreshing.value = true;
  errorMessage.value = '';
  oneTimeDisplayCode.value = '';
  try {
    const result = await accessService.refreshLongTermCode();
    const nextCode = result.code || result;
    codeInfo.value = nextCode;
    if (nextCode.displayCode) {
      oneTimeDisplayCode.value = nextCode.displayCode;
      uni.showToast({ title: '新码已生成', icon: 'success' });
    } else {
      uni.showToast({ title: '已刷新状态', icon: 'none' });
    }
  } catch (error) {
    if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') forbidden.value = true;
    errorMessage.value = error?.message || '刷新失败，请稍后重试';
    uni.showToast({ title: '刷新失败', icon: 'none' });
  } finally {
    refreshing.value = false;
  }
}

function copyCode() {
  uni.setClipboardData({ data: oneTimeDisplayCode.value });
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/access/index' }) });
}

function goPackages() {
  uni.switchTab({ url: '/pages/packages/index' });
}

function maskSuffix(suffix) {
  return suffix ? `**** ${suffix}` : '**** ----';
}

function formatDateTime(value) {
  if (!value) return '待生成';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
</script>

<style>
.password-page {
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(48rpx + env(safe-area-inset-top)) 48rpx calc(96rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% 18%, rgba(243, 224, 192, 0.52), transparent 34%),
    linear-gradient(180deg, #fffdf8 0%, #fbf9f9 58%, #f7f1e8 100%);
  color: #031632;
}

.password-nav {
  position: fixed;
  top: env(safe-area-inset-top);
  left: 48rpx;
  z-index: 20;
  padding-top: 24rpx;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999rpx;
  background: rgba(240, 222, 189, 0.42);
  color: #031632;
  box-shadow: inset 0 0 0 1rpx rgba(3, 22, 50, 0.06);
}

.back-button::after {
  border: 0;
}

.password-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 144rpx - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  text-align: center;
  gap: 0;
}

.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
  text-align: center;
}

.shield {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  margin-bottom: 16rpx;
}

.title {
  margin-top: 32rpx;
  color: #031632;
  font-size: 56rpx;
  font-weight: 600;
  line-height: 72rpx;
}

.desc,
.muted,
.notice-copy,
.code-meta {
  color: rgba(255, 255, 255, 0.68);
  font-size: 32rpx;
  line-height: 48rpx;
}

.desc {
  max-width: 560rpx;
  margin-top: 16rpx;
  color: #4b5360;
}

.glass-card,
.notice,
.error-box {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 640rpx;
  min-height: 300rpx;
  padding: 64rpx 44rpx;
  border: 1rpx solid rgba(243, 224, 192, 0.18);
  border-radius: 48rpx;
  background:
    linear-gradient(145deg, rgba(3, 22, 50, 0.96), rgba(7, 28, 62, 0.98)),
    #031632;
  color: #ffffff;
  box-shadow: 0 30rpx 90rpx rgba(3, 22, 50, 0.18);
  text-align: center;
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.ambient {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 384rpx;
  height: 384rpx;
  margin: -192rpx 0 0 -192rpx;
  border-radius: 50%;
  background: rgba(243, 224, 192, 0.2);
  filter: blur(80rpx);
}

.code-title,
.notice-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}

.one-time {
  position: relative;
  z-index: 1;
  display: inline-block;
  margin-bottom: 24rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(240, 222, 189, 0.15);
  color: #f0debd;
  font-size: 22rpx;
}

.code-groups {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 32rpx;
}

.code {
  display: block;
  font-size: 96rpx;
  font-weight: 600;
  line-height: 112rpx;
  letter-spacing: 8rpx;
}

.code-meta,
.muted {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 32rpx;
}

.password-action {
  width: 100%;
  max-width: 640rpx;
  margin-top: 48rpx !important;
  font-size: 48rpx;
  font-weight: 600;
  background: #031632 !important;
  color: #ffffff !important;
}

.error-box {
  margin-top: 24rpx;
  background: #fff1ef;
  color: #ba1a1a;
}

</style>
