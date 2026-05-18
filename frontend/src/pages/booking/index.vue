<template>
  <view class="page">
    <view class="top-bar">
      <button class="top-icon">
        <AppIcon name="menu" :size="36" color="#1f2f4d" />
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
      <text class="eyebrow">专属预约</text>
      <text class="title">预留今日专注席</text>
      <text class="subtitle">以安静、采光和供电偏好筛选，为本次学习选择一处沉稳舒适的位置。</text>
    </view>

    <view class="filter-card">
      <view class="section-head compact">
        <view>
          <text class="section-kicker">偏好</text>
          <text class="section-title">筛选座位</text>
        </view>
        <button v-if="selectedFeatures.length" class="clear-button" @tap="clearFeatures">清空</button>
      </view>
      <scroll-view class="feature-scroll" scroll-x>
        <view class="feature-row">
          <button
            v-for="feature in featureOptions"
            :key="feature.value"
            :class="['feature-pill', { active: selectedFeatures.includes(feature.value) }]"
            @tap="toggleFeature(feature.value)"
          >
            <AppIcon class="feature-icon" :name="feature.icon" :size="28" :color="selectedFeatures.includes(feature.value) ? '#6a5d43' : '#1f2f4d'" />
            <text>{{ feature.label }}</text>
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-kicker">日期</text>
          <text class="section-title">预约日期</text>
        </view>
        <text class="date-label">{{ selectedDateLabel }}</text>
      </view>
      <scroll-view class="date-scroll" scroll-x>
        <view class="date-row">
          <button
            v-for="date in dateOptions"
            :key="date.value"
            :class="['date-chip', { active: date.value === selectedDate }]"
            @tap="selectDate(date.value)"
          >
            <text class="date-week">{{ date.week }}</text>
            <text class="date-day">{{ date.day }}</text>
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-kicker">时段</text>
          <text class="section-title">选择时间</text>
        </view>
        <text class="date-label">{{ selectedTimeLabel }}</text>
      </view>
      <scroll-view class="time-strip" scroll-x>
        <view class="time-row">
          <button
            v-for="slot in timeSlots"
            :key="slot.startAt"
            :class="['time-card', { active: slot.startAt === selectedStartAt, disabled: !slot.available }]"
            :disabled="!slot.available"
            @tap="selectSlot(slot)"
          >
            <text class="time-period">{{ periodText(slot.startAt) }}</text>
            <text class="time-value">{{ formatTime(slot.startAt) }}</text>
            <text v-if="slot.startAt === selectedStartAt" class="active-mark"></text>
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="seat-panel">
      <view class="room-notch"></view>
      <view class="seat-panel-head">
        <view>
          <text class="section-kicker">SEAT MAP</text>
          <text class="seat-panel-title">会员静区座位图</text>
        </view>
        <text class="seat-count">{{ filteredSeats.length }} 个座位</text>
      </view>
      <view class="legend">
        <view v-for="item in legend" :key="item.label" class="legend-item">
          <view :class="['legend-dot', item.className]"></view>
          <text>{{ item.label }}</text>
        </view>
      </view>

      <view v-if="loadingSeats" class="state-card">正在刷新座位图...</view>
      <view v-else-if="seatError && !usingFallback" class="state-card error">
        <text>{{ seatError }}</text>
        <button class="small-button" @tap="loadSeats">重试</button>
      </view>
      <view v-else>
        <view v-if="usingFallback" class="offline-banner">
          <text class="offline-title">离线示例</text>
          <text class="offline-text">当前无法获取真实座位数据，仅可查看示例座位，无法提交真实预约。</text>
        </view>
        <view v-if="filteredSeats.length === 0" class="state-card">当前筛选下没有可展示座位</view>
        <view v-else>
          <view class="stage-label">静音阅读廊</view>
          <view v-if="hasPodSeats" class="seat-grid">
            <block v-for="slot in podSlots" :key="slot.key">
              <view v-if="slot.type === 'aisle'" class="aisle"></view>
              <button
                v-else-if="slot.seat"
                :class="['seat-cell', slot.seat.availabilityStatus, { selected: selectedSeatId === slot.seat.id }]"
                :disabled="slot.seat.availabilityStatus !== 'available'"
                @tap="selectSeat(slot.seat)"
              >
                <text class="seat-code">{{ slot.seat.code }}</text>
              </button>
              <view v-else class="seat-cell placeholder"></view>
            </block>
          </view>
          <view v-else class="seat-grid flat">
            <button
              v-for="seat in filteredSeats"
              :key="seat.id"
              :class="['seat-cell', seat.availabilityStatus, { selected: selectedSeatId === seat.id }]"
              :disabled="seat.availabilityStatus !== 'available'"
              @tap="selectSeat(seat)"
            >
              <text class="seat-code">{{ seat.code }}</text>
            </button>
          </view>
          <view v-if="hasPodSeats && extraSeats.length" class="extra-grid">
            <button
              v-for="seat in extraSeats"
              :key="seat.id"
              :class="['seat-cell small', seat.availabilityStatus, { selected: selectedSeatId === seat.id }]"
              :disabled="seat.availabilityStatus !== 'available'"
              @tap="selectSeat(seat)"
            >
              <text class="seat-code">{{ seat.code }}</text>
            </button>
          </view>
          <view class="desk-line"></view>
          <text class="desk-label">共享长桌</text>
        </view>
      </view>
    </view>

    <view class="bottom-spacer"></view>
    <view class="confirm-panel">
      <view class="confirm-head">
        <view>
          <text class="bottom-label">{{ selectedSeat ? `座位 ${selectedSeat.code} · ${selectedTimeLabel}` : '请选择座位' }}</text>
          <text class="bottom-price">{{ priceText }}</text>
        </view>
        <text class="instant">即刻确认</text>
      </view>
      <button class="confirm-button" :disabled="!canContinue" @tap="goConfirm">
        {{ usingFallback ? '仅可查看示例' : '确认预约' }}
      </button>
    </view>

    <AppBottomNav current="booking" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { seatService } from '../../api/services/seat';
import { DEFAULT_STORE_ID } from '../../utils/constants';
import { addMinutes, formatDate, formatTime, getDurationMinutes } from '../../utils/date';
import { formatPrice } from '../../utils/price';
import { ROUTES } from '../../utils/route';
import AppIcon from '../../components/common/AppIcon.vue';
import AppBottomNav from '../../components/common/AppBottomNav.vue';

const featureOptions = [
  { value: 'quiet', label: '安静区', icon: 'volume_off' },
  { value: 'window', label: '窗边', icon: 'window' },
  { value: 'power', label: '插座', icon: 'power' }
];

const legend = [
  { label: '可选', className: 'available' },
  { label: '已选', className: 'selected' },
  { label: '占用', className: 'reserved' },
  { label: '维护', className: 'disabled' }
];

const selectedDate = ref(formatDate(new Date()));
const selectedStartAt = ref('');
const selectedEndAt = ref('');
const selectedFeatures = ref(['quiet']);
const selectedSeatId = ref('');
const seats = ref([]);
const timeSlots = ref([]);
const loadingSeats = ref(false);
const seatError = ref('');
const usingFallback = ref(false);

const dateOptions = computed(() => {
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return Array.from({ length: 7 }, (_, index) => {
    const date = addMinutes(new Date(), index * 24 * 60);
    return {
      value: formatDate(date),
      week: index === 0 ? '今天' : weeks[date.getDay()],
      day: `${date.getMonth() + 1}/${date.getDate()}`
    };
  });
});

const selectedDateLabel = computed(() => {
  const option = dateOptions.value.find((item) => item.value === selectedDate.value);
  return option ? `${option.week} ${option.day}` : selectedDate.value;
});

const selectedTimeLabel = computed(() => {
  if (!selectedStartAt.value || !selectedEndAt.value) return '选择时间';
  return `${formatTime(selectedStartAt.value)}-${formatTime(selectedEndAt.value)}`;
});

const filteredSeats = computed(() => {
  if (!selectedFeatures.value.length) return seats.value;
  return seats.value.filter((seat) => {
    const features = seat.features || [];
    return selectedFeatures.value.every((feature) => features.includes(feature));
  });
});

const selectedSeat = computed(() => seats.value.find((seat) => seat.id === selectedSeatId.value) || null);
const canContinue = computed(() => Boolean(!usingFallback.value && selectedSeat.value && selectedStartAt.value && selectedEndAt.value));
const estimatedPriceCent = computed(() => Math.max(600, Math.ceil(getDurationMinutes(selectedStartAt.value, selectedEndAt.value) / 60) * 800));
const priceText = computed(() => canContinue.value ? formatPrice(selectedSeat.value.priceCent ?? estimatedPriceCent.value) : '待选择');
const podSeatCodes = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
const podSlots = computed(() => {
  const byCode = new Map(filteredSeats.value.map((seat) => [seat.code, seat]));
  const rows = [
    ['A1', 'A2', null, 'A3'],
    ['B1', 'B2', null, 'B3'],
    ['C1', 'C2', null, 'C3']
  ];
  return rows.flatMap((row, rowIndex) => row.map((code, columnIndex) => ({
    key: `${rowIndex}-${columnIndex}-${code || 'aisle'}`,
    type: code ? 'seat' : 'aisle',
    seat: code ? byCode.get(code) : null
  })));
});
const hasPodSeats = computed(() => podSlots.value.some((slot) => slot.seat));
const extraSeats = computed(() => filteredSeats.value.filter((seat) => !podSeatCodes.includes(seat.code)));

function buildIso(date, hour) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

function buildFallbackSlots(date) {
  return [9, 10, 11, 12, 14, 15, 16, 18, 19].map((hour, index) => ({
    startAt: buildIso(date, hour),
    endAt: buildIso(date, hour + 1),
    available: index !== 3
  }));
}

function ensureSelectedSlot(date = selectedDate.value) {
  if (selectedStartAt.value && selectedEndAt.value) return;
  const firstSlot = buildFallbackSlots(date).find((slot) => slot.available);
  selectedStartAt.value = firstSlot?.startAt || '';
  selectedEndAt.value = firstSlot?.endAt || '';
}

function buildFallbackSeats() {
  return [
    { id: 'seat_a1', code: 'A1', area: '安静区', features: ['quiet', 'window', 'power'], physicalStatus: 'available', availabilityStatus: 'available' },
    { id: 'seat_a2', code: 'A2', area: '安静区', features: ['quiet', 'power'], physicalStatus: 'available', availabilityStatus: 'reserved' },
    { id: 'seat_a3', code: 'A3', area: '安静区', features: ['quiet', 'window'], physicalStatus: 'available', availabilityStatus: 'available' },
    { id: 'seat_b1', code: 'B1', area: '开放区', features: ['power'], physicalStatus: 'available', availabilityStatus: 'available' },
    { id: 'seat_b2', code: 'B2', area: '开放区', features: ['power'], physicalStatus: 'available', availabilityStatus: 'occupied' },
    { id: 'seat_b3', code: 'B3', area: '安静区', features: ['quiet', 'power'], physicalStatus: 'available', availabilityStatus: 'available' },
    { id: 'seat_c1', code: 'C1', area: '窗边区', features: ['window', 'power'], physicalStatus: 'available', availabilityStatus: 'available' },
    { id: 'seat_c2', code: 'C2', area: '窗边区', features: ['window'], physicalStatus: 'maintenance', availabilityStatus: 'maintenance' }
  ];
}

async function loadSeats() {
  ensureSelectedSlot();
  loadingSeats.value = true;
  seatError.value = '';
  usingFallback.value = false;

  try {
    const result = await seatService.getAvailability({
      date: selectedDate.value,
      startAt: selectedStartAt.value,
      endAt: selectedEndAt.value,
      features: selectedFeatures.value.join(',')
    }, DEFAULT_STORE_ID);

    timeSlots.value = result.timeSlots?.length ? result.timeSlots : buildFallbackSlots(selectedDate.value);
    seats.value = result.seats?.length ? result.seats : buildFallbackSeats();
  } catch (error) {
    usingFallback.value = true;
    seatError.value = '当前无法获取真实座位数据，仅可查看离线示例，无法提交真实预约。';
    timeSlots.value = buildFallbackSlots(selectedDate.value);
    seats.value = buildFallbackSeats();
  } finally {
    const selectedSlotStillExists = timeSlots.value.some((slot) => slot.startAt === selectedStartAt.value && slot.available);
    if (!selectedSlotStillExists) {
      const firstSlot = timeSlots.value.find((slot) => slot.available);
      selectedStartAt.value = firstSlot?.startAt || '';
      selectedEndAt.value = firstSlot?.endAt || '';
    }
    if (selectedSeat.value?.availabilityStatus !== 'available') {
      selectedSeatId.value = '';
    }
    loadingSeats.value = false;
    uni.stopPullDownRefresh();
  }
}

function selectDate(date) {
  selectedDate.value = date;
  selectedStartAt.value = '';
  selectedEndAt.value = '';
  ensureSelectedSlot(date);
  selectedSeatId.value = '';
  loadSeats();
}

function selectSlot(slot) {
  selectedStartAt.value = slot.startAt;
  selectedEndAt.value = slot.endAt;
  selectedSeatId.value = '';
  loadSeats();
}

function toggleFeature(feature) {
  selectedFeatures.value = selectedFeatures.value.includes(feature)
    ? selectedFeatures.value.filter((item) => item !== feature)
    : [...selectedFeatures.value, feature];
  selectedSeatId.value = '';
  loadSeats();
}

function clearFeatures() {
  selectedFeatures.value = [];
  selectedSeatId.value = '';
  loadSeats();
}

function selectSeat(seat) {
  if (seat.availabilityStatus !== 'available') return;
  selectedSeatId.value = seat.id;
}

function consumePreferredSeat() {
  const preferredSeatId = uni.getStorageSync('zixishi_preferred_seat_id');
  if (!preferredSeatId) return;
  uni.removeStorageSync('zixishi_preferred_seat_id');
  selectedSeatId.value = preferredSeatId;
  if (seats.value.length) loadSeats();
}

function periodText(value) {
  const hour = new Date(value).getHours();
  if (hour < 12) return '上午';
  if (hour < 18) return '下午';
  return '晚上';
}

function goConfirm() {
  if (!canContinue.value) return;
  const payload = {
    storeId: DEFAULT_STORE_ID,
    storeName: '静谧空间 A 区',
    seatId: selectedSeat.value.id,
    seatCode: selectedSeat.value.code,
    seatArea: selectedSeat.value.area,
    startAt: selectedStartAt.value,
    endAt: selectedEndAt.value,
    priceCent: selectedSeat.value.priceCent ?? estimatedPriceCent.value,
    currency: 'CNY',
    useEntitlement: true
  };
  uni.navigateTo({
    url: `${ROUTES.bookingConfirm}?payload=${encodeURIComponent(JSON.stringify(payload))}`
  });
}

onLoad((query = {}) => {
  if (query.seatId) selectedSeatId.value = decodeURIComponent(query.seatId);
  ensureSelectedSlot();
  loadSeats();
});

onShow(consumePreferredSeat);
onPullDownRefresh(loadSeats);
</script>

<style>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: calc(176rpx + env(safe-area-inset-top)) 48rpx calc(520rpx + env(safe-area-inset-bottom));
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
  padding: 0 0 36rpx;
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

.feature-scroll,
.time-strip {
  width: 100%;
}

.date-row,
.time-row {
  display: flex;
  gap: 18rpx;
  width: max-content;
  padding-bottom: 18rpx;
}

.date-chip,
.time-card,
.feature-pill,
.small-button,
.confirm-button,
.seat-cell {
  margin: 0;
  border: 0;
}

.feature-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 18rpx;
  width: max-content;
  padding-bottom: 18rpx;
  margin-bottom: 52rpx;
}

.feature-pill {
  min-height: 76rpx;
  padding: 0 30rpx;
  border-radius: 999rpx;
  background: #e4e2e2;
  color: #44474d;
  border: 1rpx solid rgba(197, 198, 206, 0.4);
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8rpx;
  justify-content: center;
}

.feature-pill.active {
  background: #031632;
  color: #ffffff;
  border-color: #031632;
}

.feature-pill.clear {
  background: transparent;
  color: #6a5d43;
}

.feature-icon {
  display: flex;
}

.section {
  margin-top: 0;
}

.section-head {
  margin-bottom: 22rpx;
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

.date-label,
.section-note {
  color: #44474d;
  font-size: 24rpx;
}

.date-chip {
  min-height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: transparent;
  color: #44474d;
  border: 1rpx solid rgba(197, 198, 206, 0.45);
  font-size: 24rpx;
}

.date-chip.active {
  background: rgba(240, 222, 189, 0.5);
  color: #6a5d43;
  border-color: #f0debd;
}

.time-card {
  position: relative;
  min-width: 160rpx;
  min-height: 144rpx;
  padding: 22rpx 18rpx;
  border-radius: 32rpx;
  background: #e4e2e2;
  color: #44474d;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1rpx solid transparent;
  box-sizing: border-box;
}

.time-card.active {
  background: #f0debd;
  color: #6e6147;
  border-color: #d6c4a5;
  box-shadow: 0 4rpx 24rpx rgba(106, 93, 67, 0.18);
}

.time-card.disabled {
  opacity: 0.45;
}

.time-period {
  font-size: 24rpx;
  line-height: 32rpx;
}

.time-value {
  margin-top: 8rpx;
  font-size: 40rpx;
  line-height: 52rpx;
  font-weight: 500;
}

.active-mark {
  position: absolute;
  left: 25%;
  right: 25%;
  bottom: -4rpx;
  height: 8rpx;
  border-radius: 999rpx 999rpx 0 0;
  background: #6a5d43;
}

.seat-panel {
  position: relative;
  margin-top: 44rpx;
  padding: 48rpx;
  border-radius: 48rpx;
  background: #ffffff;
  border: 1rpx solid rgba(197, 198, 206, 0.28);
  box-shadow: 0 20rpx 50rpx rgba(26, 43, 72, 0.04);
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

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 28rpx;
  margin-bottom: 48rpx;
  padding-bottom: 28rpx;
  border-bottom: 1rpx solid rgba(197, 198, 206, 0.22);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #44474d;
  font-size: 22rpx;
}

.legend-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #e9e8e7;
  border: 1rpx solid rgba(197, 198, 206, 0.45);
}

.legend-dot.selected {
  background: #f0debd;
  border: 2rpx solid #6a5d43;
}

.legend-dot.reserved {
  background: #031632;
}

.legend-dot.disabled {
  background: #dbdad9;
}

.state-card {
  padding: 32rpx;
  border-radius: 32rpx;
  background: #f5f3f3;
  color: #44474d;
  font-size: 26rpx;
  line-height: 40rpx;
}

.state-card.error {
  color: #ba1a1a;
}

.offline-banner {
  margin-bottom: 22rpx;
  padding: 22rpx 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 218, 214, 0.45);
  border: 1rpx solid rgba(186, 26, 26, 0.14);
}

.offline-title {
  display: block;
  color: #ba1a1a;
  font-size: 26rpx;
  font-weight: 700;
}

.offline-text {
  display: block;
  margin-top: 8rpx;
  color: #ba1a1a;
  font-size: 24rpx;
  line-height: 1.5;
}

.small-button {
  margin-top: 18rpx;
  padding: 16rpx 26rpx;
  border-radius: 999rpx;
  background: #031632;
  color: #ffffff;
  font-size: 24rpx;
}

.seat-grid {
  display: grid;
  grid-template-columns: repeat(4, 112rpx);
  gap: 36rpx 28rpx;
  justify-content: center;
}

.seat-cell {
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  background: #e9e8e7;
  color: #44474d;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(197, 198, 206, 0.45);
  box-sizing: border-box;
}

.seat-cell.selected {
  background: #f0debd;
  border: 4rpx solid #6a5d43;
  color: #6e6147;
  font-weight: 700;
  box-shadow: 0 4rpx 24rpx rgba(106, 93, 67, 0.2);
}

.seat-cell.reserved,
.seat-cell.occupied {
  background: #031632;
  color: #ffffff;
  border-color: #031632;
}

.seat-cell.locked,
.seat-cell.maintenance,
.seat-cell.disabled {
  background: #dbdad9;
  color: #75777e;
}

.seat-cell.placeholder,
.aisle {
  visibility: hidden;
}

.seat-cell.small {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
}

.seat-code {
  font-size: 28rpx;
  font-weight: 600;
}

.extra-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18rpx;
  margin-top: 36rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid rgba(197, 198, 206, 0.18);
}

.desk-line {
  width: 66%;
  height: 12rpx;
  margin: 52rpx auto 0;
  border-radius: 999rpx;
  background: rgba(197, 198, 206, 0.32);
}

.bottom-spacer {
  height: 340rpx;
}

.confirm-panel {
  position: fixed;
  left: 48rpx;
  right: 48rpx;
  bottom: calc(220rpx + env(safe-area-inset-bottom));
  z-index: 60;
  padding: 32rpx;
  border-radius: 48rpx;
  background: #ffffff;
  border: 1rpx solid rgba(197, 198, 206, 0.28);
  box-shadow: 0 -10rpx 40rpx rgba(26, 43, 72, 0.10);
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
  color: #44474d;
  font-size: 24rpx;
}

.bottom-price {
  display: block;
  margin-top: 8rpx;
  color: #031632;
  font-size: 48rpx;
  line-height: 60rpx;
  font-weight: 500;
}

.instant {
  color: #6a5d43;
  font-size: 24rpx;
  white-space: nowrap;
}

.confirm-button {
  width: 100%;
  min-height: 96rpx;
  border-radius: 999rpx;
  background: #031632;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

.confirm-button[disabled] {
  background: #dbdad9;
  color: #ffffff;
}

@media (max-width: 360px) {
  .page {
    padding-left: 36rpx;
    padding-right: 36rpx;
  }

  .seat-grid {
    grid-template-columns: repeat(4, 96rpx);
    gap: 28rpx 20rpx;
  }

  .seat-cell {
    width: 96rpx;
    height: 96rpx;
  }
}

.page {
  padding: calc(168rpx + env(safe-area-inset-top)) 40rpx calc(540rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, rgba(245, 239, 229, 0.9) 0%, rgba(252, 249, 244, 0) 520rpx),
    #fcf9f4;
  color: #17233c;
}

.top-bar {
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
.section-kicker {
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
  padding: 8rpx 0 34rpx;
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

.filter-card,
.seat-panel,
.confirm-panel {
  border: 1rpx solid rgba(214, 196, 165, 0.36);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18rpx 52rpx rgba(31, 47, 77, 0.08);
}

.filter-card {
  margin-bottom: 34rpx;
  padding: 30rpx 30rpx 12rpx;
  border-radius: 36rpx;
  box-sizing: border-box;
}

.section {
  margin-top: 34rpx;
}

.section-head {
  margin-bottom: 22rpx;
  align-items: flex-end;
}

.section-head.compact {
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  margin-top: 4rpx;
  color: #142341;
  font-size: 36rpx;
  line-height: 46rpx;
  font-weight: 700;
}

.date-label {
  color: #7a6d55;
  font-size: 24rpx;
  white-space: nowrap;
}

.date-scroll,
.feature-scroll,
.time-strip {
  width: 100%;
}

.date-row,
.time-row,
.feature-row {
  gap: 18rpx;
  padding-bottom: 10rpx;
  margin-bottom: 0;
}

.clear-button {
  margin: 0;
  padding: 12rpx 22rpx;
  border: 0;
  border-radius: 999rpx;
  background: rgba(214, 196, 165, 0.24);
  color: #7a6d55;
  font-size: 24rpx;
}

.feature-pill {
  min-height: 76rpx;
  padding: 0 28rpx;
  background: #fffaf0;
  color: #1f2f4d;
  border-color: rgba(214, 196, 165, 0.44);
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, 0.54);
}

.feature-pill.active {
  background: #f3dfb9;
  color: #6a5d43;
  border-color: #d6bd83;
  box-shadow: 0 10rpx 24rpx rgba(154, 124, 66, 0.16);
}

.date-chip {
  min-width: 116rpx;
  min-height: 108rpx;
  padding: 18rpx 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #5d6471;
  border-color: rgba(214, 196, 165, 0.42);
  box-sizing: border-box;
}

.date-week,
.date-day {
  display: block;
  text-align: center;
}

.date-week {
  font-size: 22rpx;
  line-height: 30rpx;
}

.date-day {
  margin-top: 8rpx;
  color: #142341;
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: 700;
}

.date-chip.active,
.time-card.active {
  background: #f3dfb9;
  color: #6a5d43;
  border-color: #d6bd83;
  box-shadow: 0 12rpx 34rpx rgba(154, 124, 66, 0.18);
}

.time-card {
  min-width: 158rpx;
  min-height: 138rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.78);
  color: #5d6471;
  border-color: rgba(214, 196, 165, 0.38);
}

.time-value {
  color: #142341;
  font-size: 38rpx;
  font-weight: 700;
}

.time-card.active .time-value {
  color: #6a5d43;
}

.active-mark {
  background: #9a7c42;
}

.seat-panel {
  margin-top: 40rpx;
  padding: 44rpx 32rpx 40rpx;
  border-radius: 40rpx;
}

.room-notch {
  left: 30%;
  right: 30%;
  height: 10rpx;
  background: #d6bd83;
}

.seat-panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.seat-panel-title {
  display: block;
  margin-top: 6rpx;
  color: #142341;
  font-size: 38rpx;
  line-height: 50rpx;
  font-weight: 700;
}

.seat-count {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(20, 35, 65, 0.06);
  color: #1f2f4d;
  font-size: 22rpx;
  white-space: nowrap;
}

.legend {
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 34rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(214, 196, 165, 0.26);
  border-radius: 28rpx;
  background: rgba(252, 249, 244, 0.76);
}

.legend-item {
  color: #5d6471;
}

.legend-dot {
  background: #fffaf0;
  border-color: rgba(214, 196, 165, 0.62);
}

.legend-dot.selected {
  background: #f3dfb9;
  border-color: #9a7c42;
}

.legend-dot.reserved {
  background: #142341;
  border-color: #142341;
}

.legend-dot.disabled {
  background: #d8d6d0;
}

.stage-label,
.desk-label {
  display: block;
  color: #8d8067;
  font-size: 22rpx;
  line-height: 30rpx;
  text-align: center;
}

.stage-label {
  margin-bottom: 22rpx;
}

.seat-grid {
  grid-template-columns: repeat(4, 108rpx);
  gap: 30rpx 24rpx;
  padding: 26rpx 0;
  border-radius: 34rpx;
  background:
    linear-gradient(90deg, transparent 49%, rgba(214, 196, 165, 0.26) 49%, rgba(214, 196, 165, 0.26) 51%, transparent 51%),
    rgba(252, 249, 244, 0.78);
}

.seat-grid.flat {
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
  padding: 24rpx;
  background: rgba(252, 249, 244, 0.78);
}

.seat-cell {
  width: 108rpx;
  height: 108rpx;
  border-radius: 26rpx;
  background: #fffaf0;
  color: #1f2f4d;
  border-color: rgba(214, 196, 165, 0.54);
  box-shadow: 0 8rpx 20rpx rgba(31, 47, 77, 0.06);
}

.seat-grid.flat .seat-cell {
  width: 100%;
}

.seat-cell.selected {
  background: #f3dfb9;
  border: 4rpx solid #9a7c42;
  color: #6a5d43;
  box-shadow: 0 12rpx 28rpx rgba(154, 124, 66, 0.22);
}

.seat-cell.reserved,
.seat-cell.occupied {
  background: #142341;
  border-color: #142341;
}

.seat-cell.locked,
.seat-cell.maintenance,
.seat-cell.disabled {
  background: #dedbd4;
  color: #7b7f89;
  box-shadow: none;
}

.extra-grid {
  border-top-color: rgba(214, 196, 165, 0.28);
}

.desk-line {
  width: 64%;
  height: 14rpx;
  margin-top: 46rpx;
  background: #d6bd83;
}

.desk-label {
  margin-top: 12rpx;
}

.state-card {
  border: 1rpx solid rgba(214, 196, 165, 0.3);
  background: rgba(255, 255, 255, 0.76);
  color: #5d6471;
}

.offline-banner {
  background: rgba(255, 241, 228, 0.86);
  border-color: rgba(186, 26, 26, 0.12);
}

.small-button {
  border: 0;
  background: #142341;
}

.bottom-spacer {
  height: 360rpx;
}

.confirm-panel {
  left: 40rpx;
  right: 40rpx;
  bottom: calc(190rpx + env(safe-area-inset-bottom));
  padding: 22rpx 26rpx;
  border-radius: 36rpx;
}

.confirm-head {
  margin-bottom: 16rpx;
}

.bottom-label {
  color: #5d6471;
  font-size: 24rpx;
  line-height: 34rpx;
}

.bottom-price {
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
}

.confirm-button {
  min-height: 84rpx;
  border: 0;
  border-radius: 999rpx;
  background: #142341;
  box-shadow: 0 14rpx 28rpx rgba(20, 35, 65, 0.18);
}

.confirm-button[disabled] {
  background: #c9c7c1;
  box-shadow: none;
}
</style>
