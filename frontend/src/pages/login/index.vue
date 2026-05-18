<template>
  <view class="page">
    <view class="header">
      <text class="eyebrow">静谧空间</text>
      <text class="title">登录后使用预约与门禁服务</text>
      <text class="subtitle">授权微信登录后，我们会同步你的会员权益、当前预约和通行状态。</text>
    </view>

    <view class="panel">
      <view class="feature-row">
        <text class="feature-icon">✓</text>
        <view class="feature-main">
          <text class="feature-title">微信一键登录</text>
          <text class="feature-desc">用于创建和识别你的静谧空间账号。</text>
        </view>
      </view>
      <view class="feature-row muted-row">
        <text class="feature-icon">i</text>
        <view class="feature-main">
          <text class="feature-title">手机号绑定暂未开放</text>
          <text class="feature-desc">后续可在个人中心补充手机号，当前不影响预约和查看权益。</text>
        </view>
      </view>

      <view v-if="errorMessage" class="error-tip">
        <text>{{ errorMessage }}</text>
      </view>

      <button class="primary-button" :loading="loading" :disabled="loading" @tap="handleWechatLogin">
        {{ loading ? '登录中...' : '微信授权登录' }}
      </button>

      <button class="secondary-button" disabled>
        手机号绑定暂未开放
      </button>

      <label class="agreement-row" @tap.stop="toggleAgreement">
        <checkbox class="checkbox" :checked="agreed" color="#1a2b48" />
        <text class="agreement-text">
          我已阅读并同意
          <text class="link" @tap.stop="openAgreement('用户协议')">《用户协议》</text>
          和
          <text class="link" @tap.stop="openAgreement('隐私政策')">《隐私政策》</text>
        </text>
      </label>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { authStore } from '../../stores/auth';
import { userStore } from '../../stores/user';

const agreed = ref(false);
const loading = ref(false);
const errorMessage = ref('');

function toggleAgreement() {
  agreed.value = !agreed.value;
}

async function handleWechatLogin() {
  if (loading.value) return;

  if (!agreed.value) {
    errorMessage.value = '请先阅读并同意用户协议和隐私政策';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.loginWithWechat();

    try {
      await authStore.refreshCurrentUser();
    } catch (error) {
      if (!userStore.state.user) throw error;
    }

    uni.showToast({ title: '登录成功', icon: 'success' });
    redirectAfterLogin();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function redirectAfterLogin() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }

  uni.switchTab({ url: '/pages/home/index' });
}

function openAgreement(title) {
  uni.navigateTo({
    url: `/pages/webview/index?title=${encodeURIComponent(title)}`
  });
}

function getErrorMessage(error) {
  return error?.message || error?.error?.message || '登录失败，请稍后重试';
}
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 56rpx 32rpx 80rpx;
  background: #fbf9f9;
  color: #1b1c1c;
}

.header {
  padding-top: 32rpx;
}

.eyebrow,
.subtitle,
.feature-desc,
.agreement-text {
  color: #6b7280;
}

.eyebrow {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
}

.title {
  display: block;
  margin-top: 18rpx;
  color: #031632;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.25;
}

.subtitle {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.panel {
  margin-top: 56rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 14rpx 40rpx rgba(26, 43, 72, 0.06);
}

.feature-row {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
}

.muted-row {
  border-top: 1rpx solid #eef0f3;
}

.feature-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 20rpx;
  border-radius: 50%;
  background: #1a2b48;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 48rpx;
  text-align: center;
}

.muted-row .feature-icon {
  background: #e8edf4;
  color: #1a2b48;
}

.feature-main {
  flex: 1;
}

.feature-title {
  display: block;
  color: #031632;
  font-size: 30rpx;
  font-weight: 600;
}

.feature-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.5;
}

.error-tip {
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #fff1f1;
  color: #b42318;
  font-size: 24rpx;
  line-height: 1.5;
}

.primary-button,
.secondary-button {
  height: 96rpx;
  margin-top: 28rpx;
  border-radius: 14rpx;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 96rpx;
}

.primary-button {
  background: #1a2b48;
  color: #ffffff;
}

.primary-button[disabled] {
  background: #98a2b3;
  color: #ffffff;
}

.secondary-button {
  background: #eef0f3;
  color: #98a2b3;
}

.agreement-row {
  display: flex;
  align-items: flex-start;
  margin-top: 28rpx;
}

.checkbox {
  transform: scale(0.82);
}

.agreement-text {
  flex: 1;
  margin-left: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.link {
  color: #1a2b48;
  font-weight: 600;
}
</style>
