<template>
  <view class="page">
    <web-view v-if="safeUrl" :src="safeUrl" />

    <scroll-view v-else scroll-y class="local-scroll">
      <view class="content">
        <text class="eyebrow">静谧空间</text>
        <text class="title">{{ pageTitle }}</text>
        <text class="updated">更新时间：2026-05-18</text>

        <view class="section">
          <text class="section-title">服务说明</text>
          <text class="paragraph">
            静谧空间为用户提供座位预约、门禁通行、套餐权益和学习记录等服务。使用前请确认预约时间、门店规则和个人权益状态。
          </text>
        </view>

        <view class="section">
          <text class="section-title">授权与隐私</text>
          <text class="paragraph">
            登录时我们会通过微信授权识别你的账号，并在业务需要范围内保存昵称、头像、会员权益、预约订单和通行记录。手机号绑定能力暂未开放。
          </text>
        </view>

        <view class="section">
          <text class="section-title">用户责任</text>
          <text class="paragraph">
            请按预约时段使用座位，不转借账号或通行权限，不占用他人座位。因门店维护、设备异常或不可抗力导致服务调整时，以现场和页面提示为准。
          </text>
        </view>

        <view class="section">
          <text class="section-title">联系我们</text>
          <text class="paragraph">
            如需处理账号、订单、预约或隐私相关问题，请通过个人中心后续开放的客服入口联系门店。
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const pageTitle = ref('协议/公告');
const safeUrl = ref('');
const ALLOWED_WEBVIEW_HOSTS = [];
const DEV_WEBVIEW_HOSTS = ['localhost', '127.0.0.1'];

onLoad((query = {}) => {
  pageTitle.value = decodeQueryValue(query.title) || '协议/公告';
  safeUrl.value = normalizeUrl(decodeQueryValue(query.url));

  uni.setNavigationBarTitle({ title: pageTitle.value });
});

function decodeQueryValue(value) {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return String(value);
  }
}

function normalizeUrl(value) {
  if (!value) return '';

  const parsed = parseHttpUrl(value);
  if (!parsed) return '';

  if (parsed.protocol === 'https:' && ALLOWED_WEBVIEW_HOSTS.includes(parsed.hostname)) {
    return parsed.url;
  }

  if (isDevWebviewUrl(parsed)) {
    return parsed.url;
  }

  return '';
}

function parseHttpUrl(value) {
  const url = String(value).trim();
  const match = url.match(/^(https?):\/\/([^/?#]+)([/?#].*)?$/i);
  if (!match || match[2].includes('@')) return null;

  const hostname = match[2].split(':')[0].toLowerCase();
  if (!hostname) return null;

  return {
    url,
    protocol: `${match[1].toLowerCase()}:`,
    hostname
  };
}

function isDevWebviewUrl(parsed) {
  if (process.env.NODE_ENV !== 'development') return false;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  return DEV_WEBVIEW_HOSTS.includes(parsed.hostname);
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #fbf9f9;
}

.local-scroll {
  height: 100vh;
}

.content {
  box-sizing: border-box;
  padding: 56rpx 32rpx 88rpx;
}

.eyebrow {
  display: block;
  color: #6b7280;
  font-size: 24rpx;
  font-weight: 600;
}

.title {
  display: block;
  margin-top: 18rpx;
  color: #031632;
  font-size: 42rpx;
  font-weight: 700;
  line-height: 1.25;
}

.updated {
  display: block;
  margin-top: 16rpx;
  color: #98a2b3;
  font-size: 24rpx;
}

.section {
  margin-top: 36rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 14rpx 40rpx rgba(26, 43, 72, 0.06);
}

.section-title {
  display: block;
  color: #031632;
  font-size: 30rpx;
  font-weight: 600;
}

.paragraph {
  display: block;
  margin-top: 16rpx;
  color: #4b5563;
  font-size: 26rpx;
  line-height: 1.7;
}
</style>
