<template>
  <view class="page">
    <view class="top-bar">
      <button class="top-icon" @tap="backToBooking">
        <AppIcon name="arrow_back" :size="36" color="#1f2f4d" />
      </button>
      <view class="brand-lockup">
        <text class="brand-kicker">MEMBER LOUNGE</text>
        <text class="brand-title">静奢会员空间</text>
      </view>
      <button class="avatar-button">
        <AppIcon name="person" :size="34" color="#1f2f4d" />
      </button>
    </view>

    <view class="header">
      <text class="eyebrow">确认清单</text>
      <text class="title">锁定会员专座</text>
      <text class="subtitle">确认座位、时段和权益使用方式后，将为您创建预约并处理模拟支付。</text>
    </view>

    <view v-if="!booking.seatId" class="state-card">
      <text>没有可确认的预约信息</text>
      <button class="small-button" @tap="backToBooking">重新选择</button>
    </view>

    <template v-else>
      <view class="summary-card">
        <view class="room-notch"></view>
        <text class="summary-kicker">RESERVED SEAT</text>
        <text class="store-name">{{ booking.storeName }}</text>
        <view class="seat-badge">
          <view>
            <text class="seat-code">{{ booking.seatCode }}</text>
            <text class="seat-area">{{ booking.seatArea || '静谧学习位' }}</text>
          </view>
          <text class="ready-pill">即刻确认</text>
        </view>
      </view>

      <view class="detail-card">
        <view class="detail-title-row">
          <text class="detail-title">预约详情</text>
          <text class="detail-pill">权益优先</text>
        </view>
        <view class="detail-row">
          <text>日期</text>
          <text>{{ bookingDate }}</text>
        </view>
        <view class="detail-row">
          <text>时段</text>
          <text>{{ bookingTime }}</text>
        </view>
        <view class="detail-row">
          <text>权益抵扣</text>
          <text>{{ booking.useEntitlement ? '优先使用' : '不使用' }}</text>
        </view>
        <view class="detail-row total">
          <text>预计费用</text>
          <text>{{ priceText }}</text>
        </view>
      </view>

      <view v-if="error" class="state-card error">{{ error }}</view>
      <view v-if="paymentState" class="state-card">{{ paymentState }}</view>

      <view class="bottom-spacer"></view>
      <view class="confirm-panel">
        <view class="confirm-head">
          <view>
            <text class="bottom-label">座位 {{ booking.seatCode }} · {{ bookingTime }}</text>
            <text class="bottom-price">{{ priceText }}</text>
          </view>
          <text class="instant">即刻确认</text>
        </view>
        <button class="confirm-button" :disabled="submitting" @tap="confirmBooking">
          {{ submitting ? '处理中...' : '确认并预约' }}
        </button>
        <button class="plain-button" :disabled="submitting" @tap="backToBooking">返回修改</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { orderService } from '../../api/services/order';
import { reservationService } from '../../api/services/reservation';
import { payOrderWithWechat } from '../../utils/payment';
import { formatDate, formatTime } from '../../utils/date';
import { formatPrice } from '../../utils/price';
import { ROUTES } from '../../utils/route';
import AppIcon from '../../components/common/AppIcon.vue';

const fallbackBooking = {
  storeId: 'store_default',
  storeName: '静谧空间 A 区',
  seatId: '',
  seatCode: '',
  seatArea: '',
  startAt: '',
  endAt: '',
  priceCent: 0,
  currency: 'CNY',
  useEntitlement: true
};

const booking = reactive({ ...fallbackBooking });
const submitting = ref(false);
const error = ref('');
const paymentState = ref('');

const bookingDate = computed(() => formatDate(booking.startAt));
const bookingTime = computed(() => `${formatTime(booking.startAt)}-${formatTime(booking.endAt)}`);
const priceText = computed(() => formatPrice(booking.priceCent, { currency: booking.currency || 'CNY' }));

function assignBooking(payload = {}) {
  Object.assign(booking, fallbackBooking, payload);
}

function parsePayload(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch (decodeError) {
    try {
      return JSON.parse(raw);
    } catch (parseError) {
      return {};
    }
  }
}

function getErrorMessage(err) {
  if (err?.code === 'SEAT_NOT_AVAILABLE' || err?.statusCode === 409) {
    return '座位刚刚被占用，请返回刷新座位图后重选。';
  }
  if (err?.statusCode === 401 || err?.code === 'UNAUTHORIZED') {
    return '登录状态不可用，请登录后再确认预约。';
  }
  return err?.message || '预约创建失败，请稍后重试。';
}

async function confirmBooking() {
  if (!booking.seatId || submitting.value) return;

  submitting.value = true;
  error.value = '';
  paymentState.value = '';

  try {
    const result = await reservationService.createReservation({
      storeId: booking.storeId,
      seatId: booking.seatId,
      startAt: booking.startAt,
      endAt: booking.endAt,
      useEntitlement: booking.useEntitlement
    });

    let reservation = result.reservation;
    if (result.order?.id) {
      const orderResult = await orderService.createOrder({
        type: 'reservation',
        reservationId: reservation.id,
        payAmountCent: result.order.payAmountCent
      });
      const order = orderResult.order || orderResult;
      paymentState.value = '已创建待支付订单，正在拉起微信支付...';
      const payResult = await payOrderWithWechat(order.id, orderResult.payment);
      reservation = payResult.reservation || reservation;
    }

    await reservationService.getCurrent().catch(() => null);
    uni.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => {
      uni.redirectTo({
        url: `${ROUTES.seatStatus}?reservationId=${encodeURIComponent(reservation?.id || '')}`
      });
    }, 350);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    submitting.value = false;
  }
}

function backToBooking() {
  uni.navigateBack({
    fail() {
      uni.switchTab({ url: ROUTES.booking });
    }
  });
}

onLoad((query = {}) => {
  assignBooking(parsePayload(query.payload));
});
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 176rpx 48rpx 72rpx;
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
  height: 128rpx;
  padding: 0 48rpx;
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
  margin-bottom: 44rpx;
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

.summary-card,
.detail-card,
.state-card {
  border: 1rpx solid rgba(197, 198, 206, 0.32);
  background: #ffffff;
  box-shadow: 0 10rpx 40rpx rgba(26, 43, 72, 0.06);
}

.summary-card {
  position: relative;
  min-height: 276rpx;
  border-radius: 48rpx;
  padding: 44rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.room-notch {
  position: absolute;
  top: 0;
  left: 33%;
  right: 33%;
  height: 8rpx;
  border-radius: 0 0 16rpx 16rpx;
  background: rgba(197, 198, 206, 0.28);
}

.store-name {
  color: #44474d;
  font-size: 28rpx;
  line-height: 40rpx;
}

.seat-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.seat-code {
  display: block;
  color: #031632;
  font-size: 72rpx;
  line-height: 86rpx;
  font-weight: 600;
}

.seat-area {
  display: block;
  color: #44474d;
  font-size: 28rpx;
  line-height: 40rpx;
}

.ready-pill {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(240, 222, 189, 0.48);
  border: 1rpx solid #f0debd;
  color: #6a5d43;
  font-size: 24rpx;
  white-space: nowrap;
}

.detail-card {
  margin-top: 28rpx;
  padding: 12rpx 36rpx;
  border-radius: 40rpx;
}

.detail-row {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  border-bottom: 1rpx solid rgba(197, 198, 206, 0.24);
  color: #44474d;
  font-size: 28rpx;
}

.detail-row text:last-child {
  color: #031632;
  font-weight: 600;
  text-align: right;
}

.detail-row.total {
  border-bottom: 0;
}

.detail-row.total text:last-child {
  font-size: 40rpx;
  font-weight: 600;
}

.state-card {
  margin-top: 24rpx;
  padding: 30rpx;
  border-radius: 32rpx;
  color: #44474d;
  font-size: 26rpx;
  line-height: 1.5;
}

.state-card.error {
  color: #ba1a1a;
  background: #ffdad6;
}

.confirm-button,
.plain-button,
.small-button {
  margin: 0;
  border: 0;
}

.confirm-button {
  width: 100%;
  min-height: 104rpx;
  margin-top: 36rpx;
  border-radius: 999rpx;
  background: #031632;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
}

.confirm-button[disabled] {
  background: #dbdad9;
}

.plain-button {
  width: 100%;
  margin-top: 18rpx;
  min-height: 88rpx;
  border-radius: 999rpx;
  background: transparent;
  color: #6a5d43;
  font-size: 28rpx;
}

.small-button {
  margin-top: 22rpx;
  padding: 18rpx 28rpx;
  border-radius: 999rpx;
  background: #031632;
  color: #ffffff;
  font-size: 24rpx;
}

.page {
  padding: calc(168rpx + env(safe-area-inset-top)) 40rpx calc(280rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, rgba(245, 239, 229, 0.9) 0%, rgba(252, 249, 244, 0) 520rpx),
    #fcf9f4;
  color: #17233c;
}

.top-bar {
  height: calc(128rpx + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 40rpx 0;
  background: rgba(252, 249, 244, 0.94);
  border-bottom: 1rpx solid rgba(214, 196, 165, 0.22);
}

.top-icon,
.avatar-button {
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(214, 196, 165, 0.34);
  box-shadow: 0 8rpx 24rpx rgba(31, 47, 77, 0.06);
}

.brand-lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.brand-kicker,
.eyebrow,
.summary-kicker {
  display: block;
  color: #9a7c42;
  font-size: 20rpx;
  line-height: 28rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.brand-title {
  color: #142341;
  font-size: 34rpx;
  line-height: 44rpx;
}

.header {
  margin-bottom: 38rpx;
}

.title {
  margin-top: 10rpx;
  color: #142341;
  font-size: 60rpx;
  line-height: 76rpx;
}

.subtitle {
  max-width: 620rpx;
  color: #5d6471;
  font-size: 29rpx;
  line-height: 44rpx;
}

.summary-card,
.detail-card,
.state-card,
.confirm-panel {
  border: 1rpx solid rgba(214, 196, 165, 0.36);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18rpx 52rpx rgba(31, 47, 77, 0.08);
}

.summary-card {
  min-height: 312rpx;
  border-radius: 40rpx;
  padding: 42rpx 36rpx;
  background:
    linear-gradient(135deg, rgba(20, 35, 65, 0.96), rgba(31, 47, 77, 0.9)),
    #142341;
}

.summary-card .room-notch {
  left: 30%;
  right: 30%;
  height: 10rpx;
  background: #d6bd83;
}

.summary-kicker,
.summary-card .store-name,
.summary-card .seat-area {
  color: rgba(255, 250, 240, 0.72);
}

.summary-card .seat-code {
  color: #fffaf0;
}

.ready-pill {
  background: rgba(243, 223, 185, 0.18);
  border-color: rgba(243, 223, 185, 0.56);
  color: #f3dfb9;
}

.detail-card {
  margin-top: 28rpx;
  padding: 10rpx 32rpx 4rpx;
  border-radius: 36rpx;
}

.detail-title-row {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  border-bottom: 1rpx solid rgba(214, 196, 165, 0.28);
}

.detail-title {
  color: #142341;
  font-size: 34rpx;
  line-height: 44rpx;
  font-weight: 700;
}

.detail-pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(243, 223, 185, 0.62);
  color: #6a5d43;
  font-size: 22rpx;
  white-space: nowrap;
}

.detail-row {
  border-bottom-color: rgba(214, 196, 165, 0.26);
  color: #5d6471;
}

.detail-row text:last-child {
  color: #142341;
}

.state-card {
  background: rgba(255, 255, 255, 0.78);
  color: #5d6471;
}

.small-button {
  border: 0;
  background: #142341;
}

.bottom-spacer {
  height: 8rpx;
}

.confirm-panel {
  position: static;
  margin-top: 20rpx;
  padding: 30rpx;
  border-radius: 36rpx;
  box-sizing: border-box;
}

.confirm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.bottom-label {
  display: block;
  color: #5d6471;
  font-size: 24rpx;
  line-height: 34rpx;
}

.bottom-price {
  display: block;
  margin-top: 8rpx;
  color: #142341;
  font-size: 44rpx;
  line-height: 56rpx;
  font-weight: 700;
}

.instant {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(243, 223, 185, 0.62);
  color: #6a5d43;
  font-size: 22rpx;
  white-space: nowrap;
}

.confirm-button {
  min-height: 98rpx;
  margin-top: 0;
  border: 0;
  border-radius: 999rpx;
  background: #142341;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 14rpx 28rpx rgba(20, 35, 65, 0.18);
}

.confirm-button[disabled] {
  background: #c9c7c1;
  box-shadow: none;
}

.plain-button {
  min-height: 80rpx;
  margin-top: 14rpx;
  color: #6a5d43;
}
</style>
