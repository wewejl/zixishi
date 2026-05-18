<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ApiError,
  loadMe,
  loadMerchantAccessEvents,
  loadMerchantCustomers,
  loadMerchantOrders,
  loadMerchantReservations,
  loadMerchantSeats,
  loadOrders,
  loadPackages,
  loadReservations,
  loadSeatAvailability,
  loadStoreSummary,
  login,
  refreshLongTermCode,
  unlockDoor,
  updateMerchantSeatCode,
  updateMerchantSeatStatus
} from './api';

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

const selectedDate = ref(today);
const selectedStart = ref('09:00');
const selectedEnd = ref('12:00');
const loading = ref(true);
const refreshing = ref(false);
const actionLoading = ref('');
const pageError = ref('');
const actionMessage = ref(null);

const storeSummary = ref(null);
const availability = ref({ seats: [], timeSlots: [] });
const merchantSeats = ref({ items: [], unavailable: false, message: '' });
const reservationsData = ref(scopedData());
const ordersData = ref(scopedData());
const customersData = ref(scopedData({ unavailable: true, message: '客户接口待接入' }));
const accessEventsData = ref(scopedData({ unavailable: true, message: '门禁日志接口待接入' }));
const packages = ref([]);
const profile = ref(null);
const lastUnlock = ref(null);
const newCode = ref(null);
const seatCodeDrafts = ref({});
const unlockTargetUserId = ref('');
const unlockReason = ref('merchant_manual_unlock');

const store = computed(() => storeSummary.value?.store || {});
const seats = computed(() => {
  const availabilityById = new Map((availability.value?.seats || []).map((seat) => [seat.id, seat]));
  const source = merchantSeats.value.items.length ? merchantSeats.value.items : (availability.value?.seats || []);

  return source.map((seat) => {
    const dynamic = availabilityById.get(seat.id) || {};
    return {
      ...dynamic,
      ...seat,
      code: seat.code || dynamic.code,
      area: seat.area || dynamic.area || '未分区',
      physicalStatus: seat.status || seat.physicalStatus || dynamic.physicalStatus || 'available',
      availabilityStatus: dynamic.availabilityStatus || seat.availabilityStatus || seat.status || 'available'
    };
  });
});

const groupedSeats = computed(() => {
  return seats.value.reduce((groups, seat) => {
    const area = seat.area || '未分区';
    groups[area] ||= [];
    groups[area].push(seat);
    return groups;
  }, {});
});

const seatStats = computed(() => {
  return seats.value.reduce((stats, seat) => {
    stats.total += 1;
    if (seat.availabilityStatus === 'available') stats.available += 1;
    if (seat.availabilityStatus === 'reserved') stats.reserved += 1;
    if (seat.availabilityStatus === 'occupied') stats.occupied += 1;
    if (['locked', 'maintenance', 'disabled'].includes(seat.availabilityStatus)) stats.locked += 1;
    return stats;
  }, { total: 0, available: 0, reserved: 0, occupied: 0, locked: 0 });
});

const reservations = computed(() => reservationsData.value.items);
const orders = computed(() => ordersData.value.items);
const customers = computed(() => customersData.value.items);
const accessEvents = computed(() => accessEventsData.value.items);

const todayReservations = computed(() => reservations.value.filter((item) => sameShanghaiDay(item.startAt, today)));
const activeReservations = computed(() => {
  return reservations.value.filter((item) => ['pending_payment', 'confirmed', 'checked_in'].includes(item.status));
});
const todayPaidOrders = computed(() => {
  return orders.value.filter((order) => {
    const paidAt = order.paidAt || order.createdAt;
    return ['paid', 'partially_refunded'].includes(order.status) && sameShanghaiDay(paidAt, today);
  });
});
const todayRevenueCent = computed(() => {
  return todayPaidOrders.value.reduce((sum, order) => sum + (order.payAmountCent || order.amountCent || 0), 0);
});

const boardScopeNotes = computed(() => {
  return [
    reservationsData.value.message,
    ordersData.value.message,
    merchantSeats.value.message
  ].filter(Boolean);
});

const queryWindow = computed(() => ({
  date: selectedDate.value,
  startAt: `${selectedDate.value}T${selectedStart.value}:00+08:00`,
  endAt: `${selectedDate.value}T${selectedEnd.value}:00+08:00`
}));

async function loadAll() {
  pageError.value = '';
  actionMessage.value = null;
  refreshing.value = true;

  try {
    await login();
  } catch (err) {
    pageError.value = friendlyError(err, '登录失败，无法加载商家后台数据');
    loading.value = false;
    refreshing.value = false;
    return;
  }

  const [summary, seatResult, merchantSeatResult, reservationResult, orderResult, customerResult, accessResult, packageResult, meResult] =
    await Promise.all([
      capture(loadStoreSummary()),
      capture(loadSeatAvailability(queryWindow.value)),
      capture(loadMerchantSeats()),
      loadScopedCollection({
        primary: () => loadMerchantReservations({ limit: 30, date: today }),
        fallback: () => loadReservations({ limit: 30 }),
        name: '预约',
        fallbackScope: '当前账号可见'
      }),
      loadScopedCollection({
        primary: () => loadMerchantOrders({ limit: 30, date: today }),
        fallback: () => loadOrders({ limit: 30 }),
        name: '订单流水',
        fallbackScope: '当前账号可见'
      }),
      loadScopedCollection({
        primary: () => loadMerchantCustomers({ limit: 30 }),
        name: '客户',
        emptyMessage: '后端暂未提供商家客户接口，未展示模拟客户。'
      }),
      loadScopedCollection({
        primary: () => loadMerchantAccessEvents({ limit: 30 }),
        name: '门禁日志',
        emptyMessage: '后端暂未提供商家门禁日志接口，未展示模拟流水。'
      }),
      capture(loadPackages()),
      capture(loadMe())
    ]);

  if (summary.ok) storeSummary.value = summary.data;
  if (seatResult.ok) availability.value = seatResult.data;
  if (merchantSeatResult.ok) {
    merchantSeats.value = { items: merchantSeatResult.data.items || [], unavailable: false, message: '' };
  } else {
    merchantSeats.value = {
      items: [],
      unavailable: true,
      message: `座位主数据接口不可用：${friendlyError(merchantSeatResult.error, '无法加载座位维护数据')}`
    };
  }

  reservationsData.value = reservationResult;
  ordersData.value = orderResult;
  customersData.value = customerResult;
  accessEventsData.value = accessResult;
  if (packageResult.ok) packages.value = packageResult.data.items || [];
  if (meResult.ok) profile.value = meResult.data;

  rebuildSeatDrafts();
  pageError.value = collectLoadErrors({ summary, seatResult, packageResult, meResult });
  loading.value = false;
  refreshing.value = false;
}

async function handleUnlock() {
  actionLoading.value = 'unlock';
  actionMessage.value = null;
  try {
    const result = await unlockDoor({
      targetUserId: unlockTargetUserId.value.trim() || null,
      reason: unlockReason.value.trim() || 'merchant_manual_unlock'
    });
    lastUnlock.value = result.unlock;
    actionMessage.value = { type: 'success', text: '远程开门指令已发送，并由后端记录门禁事件。' };
    await refreshAccessEventsOnly();
  } catch (err) {
    actionMessage.value = { type: 'error', text: friendlyError(err, '远程开门失败') };
  } finally {
    actionLoading.value = '';
  }
}

async function handleRefreshCode() {
  actionLoading.value = 'code';
  actionMessage.value = null;
  try {
    const result = await refreshLongTermCode();
    newCode.value = result.code;
    actionMessage.value = { type: 'success', text: '长期通行码已刷新，明文仅本次返回。' };
  } catch (err) {
    actionMessage.value = { type: 'error', text: friendlyError(err, '通行码刷新失败') };
  } finally {
    actionLoading.value = '';
  }
}

async function saveSeatCode(seat) {
  const nextCode = String(seatCodeDrafts.value[seat.id] || '').trim();
  if (!nextCode) {
    actionMessage.value = { type: 'error', text: '座位编号不能为空。' };
    return;
  }
  if (nextCode === seat.code) return;

  actionLoading.value = `seat-code-${seat.id}`;
  actionMessage.value = null;
  try {
    await updateMerchantSeatCode(seat.id, nextCode);
    actionMessage.value = { type: 'success', text: `座位 ${seat.code} 已改为 ${nextCode}。` };
    await refreshSeatsOnly();
  } catch (err) {
    actionMessage.value = { type: 'error', text: friendlyError(err, '座位编号更新失败') };
  } finally {
    actionLoading.value = '';
  }
}

async function changeSeatStatus(seat, status) {
  actionLoading.value = `seat-status-${seat.id}-${status}`;
  actionMessage.value = null;
  try {
    await updateMerchantSeatStatus(seat.id, status);
    actionMessage.value = { type: 'success', text: `座位 ${seat.code} 已更新为${statusText(status)}。` };
    await refreshSeatsOnly();
  } catch (err) {
    actionMessage.value = { type: 'error', text: friendlyError(err, '座位状态更新失败') };
  } finally {
    actionLoading.value = '';
  }
}

async function refreshSeatsOnly() {
  const [seatResult, merchantSeatResult, summary] = await Promise.all([
    capture(loadSeatAvailability(queryWindow.value)),
    capture(loadMerchantSeats()),
    capture(loadStoreSummary())
  ]);
  if (seatResult.ok) availability.value = seatResult.data;
  if (merchantSeatResult.ok) merchantSeats.value = { items: merchantSeatResult.data.items || [], unavailable: false, message: '' };
  if (summary.ok) storeSummary.value = summary.data;
  rebuildSeatDrafts();
}

async function refreshAccessEventsOnly() {
  const result = await loadScopedCollection({
    primary: () => loadMerchantAccessEvents({ limit: 30 }),
    name: '门禁日志',
    emptyMessage: '远程开门已执行，但后端暂未提供商家门禁日志查询接口。'
  });
  accessEventsData.value = result;
}

function rebuildSeatDrafts() {
  seatCodeDrafts.value = Object.fromEntries(seats.value.map((seat) => [seat.id, seat.code]));
}

function scopedData(overrides = {}) {
  return {
    items: [],
    scope: 'merchant',
    unavailable: false,
    message: '',
    ...overrides
  };
}

async function capture(promise) {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

async function loadScopedCollection({ primary, fallback, name, fallbackScope = '降级数据', emptyMessage }) {
  const primaryResult = await capture(primary());
  if (primaryResult.ok) {
    return scopedData({
      items: primaryResult.data.items || [],
      scope: 'merchant'
    });
  }

  if (fallback && isMissingEndpoint(primaryResult.error)) {
    const fallbackResult = await capture(fallback());
    if (fallbackResult.ok) {
      return scopedData({
        items: fallbackResult.data.items || [],
        scope: 'fallback',
        message: `后端暂未提供商家${name}接口，当前显示${fallbackScope}数据。`
      });
    }
    return scopedData({
      unavailable: true,
      message: `${name}降级数据也加载失败：${friendlyError(fallbackResult.error, '请求失败')}`
    });
  }

  return scopedData({
    unavailable: true,
    message: emptyMessage || `${name}接口不可用：${friendlyError(primaryResult.error, '请求失败')}`
  });
}

function collectLoadErrors(results) {
  const messages = [];
  if (!results.summary.ok) messages.push(friendlyError(results.summary.error, '门店概览加载失败'));
  if (!results.seatResult.ok) messages.push(friendlyError(results.seatResult.error, '座位状态加载失败'));
  if (!results.packageResult.ok) messages.push(friendlyError(results.packageResult.error, '套餐加载失败'));
  if (!results.meResult.ok) messages.push(friendlyError(results.meResult.error, '账号信息加载失败'));
  return messages.join('；');
}

function isMissingEndpoint(error) {
  return error instanceof ApiError && error.status === 404;
}

function friendlyError(error, fallback) {
  if (!error) return fallback;
  const prefix = error.status ? `${error.status} ` : '';
  return `${fallback}：${prefix}${error.message || error.code || '未知错误'}`;
}

function formatMoney(amountCent = 0) {
  return `¥${(amountCent / 100).toFixed(2)}`;
}

function formatTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function sameShanghaiDay(value, dateKey) {
  if (!value) return false;
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
  return key === dateKey;
}

function statusText(status) {
  const labels = {
    open: '营业中',
    closed: '已闭店',
    maintenance: '维护',
    available: '可用',
    reserved: '已预约',
    occupied: '学习中',
    locked: '锁定',
    disabled: '停用',
    pending_payment: '待支付',
    confirmed: '已确认',
    checked_in: '已入座',
    completed: '已完成',
    cancelled: '已取消',
    expired: '已过期',
    no_show: '未到店',
    paid: '已支付',
    granted: '已放行',
    denied: '已拒绝',
    refunded: '已退款',
    partially_refunded: '部分退款',
    closed_order: '已关闭',
    closed: '已关闭'
  };
  return labels[status] || status || '-';
}

function seatClass(seat) {
  return `seat-tile is-${seat.availabilityStatus}`;
}

function eventResultClass(event) {
  return `status ${event.result || event.status || 'unknown'}`;
}

onMounted(loadAll);
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">静</span>
        <div>
          <strong>静谧空间</strong>
          <small>商家工作台</small>
        </div>
      </div>

      <nav class="nav">
        <a class="active" href="#overview">经营概览</a>
        <a href="#seats">座位维护</a>
        <a href="#reservations">预约</a>
        <a href="#orders">订单</a>
        <a href="#customers">会员/客户</a>
        <a href="#access-log">门禁日志</a>
      </nav>

      <div class="operator-card">
        <span>当前账号</span>
        <strong>{{ profile?.user?.nickname || '商家账号' }}</strong>
        <small>{{ profile?.user?.membershipLevel || '已登录' }}</small>
      </div>
    </aside>

    <main class="content">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ store.name || '静谧空间旗舰店' }}</p>
          <h1>门店运营台</h1>
        </div>
        <div class="topbar-actions">
          <span class="store-status">{{ statusText(store.status) }}</span>
          <button class="icon-button" :disabled="refreshing" @click="loadAll">
            {{ refreshing ? '刷新中' : '刷新' }}
          </button>
        </div>
      </header>

      <div v-if="pageError" class="alert">{{ pageError }}</div>
      <div v-if="actionMessage" :class="['alert', actionMessage.type]">{{ actionMessage.text }}</div>
      <div v-if="loading" class="loading">正在加载商家运营数据...</div>

      <template v-else>
        <section id="overview" class="metric-grid">
          <article class="metric-card primary">
            <span>今日预约</span>
            <strong>{{ todayReservations.length }}</strong>
            <small>{{ reservationsData.scope === 'merchant' ? '商家口径' : '当前账号可见' }}</small>
          </article>
          <article class="metric-card">
            <span>学习中</span>
            <strong>{{ seatStats.occupied }}</strong>
            <small>座位图查询时段 {{ selectedStart }}-{{ selectedEnd }}</small>
          </article>
          <article class="metric-card">
            <span>今日收入</span>
            <strong>{{ formatMoney(todayRevenueCent) }}</strong>
            <small>{{ ordersData.scope === 'merchant' ? '商家口径已支付' : '当前账号可见已支付' }}</small>
          </article>
          <article class="metric-card">
            <span>可用座位</span>
            <strong>{{ seatStats.available }}</strong>
            <small>共 {{ seatStats.total }} 座，锁定/维护 {{ seatStats.locked }}</small>
          </article>
        </section>

        <section v-if="boardScopeNotes.length" class="notice-list">
          <p v-for="note in boardScopeNotes" :key="note">{{ note }}</p>
        </section>

        <section class="workspace">
          <div id="seats" class="panel seat-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Seat board</p>
                <h2>座位状态与编号维护</h2>
              </div>
              <div class="filters">
                <input v-model="selectedDate" type="date" @change="loadAll" />
                <select v-model="selectedStart" @change="loadAll">
                  <option value="08:00">08:00</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="13:00">13:00</option>
                  <option value="18:00">18:00</option>
                </select>
                <select v-model="selectedEnd" @change="loadAll">
                  <option value="10:00">10:00</option>
                  <option value="12:00">12:00</option>
                  <option value="15:00">15:00</option>
                  <option value="18:00">18:00</option>
                  <option value="23:00">23:00</option>
                </select>
              </div>
            </div>

            <div class="legend">
              <span><i class="dot available"></i>空闲</span>
              <span><i class="dot reserved"></i>已预约</span>
              <span><i class="dot occupied"></i>学习中</span>
              <span><i class="dot locked"></i>不可用</span>
            </div>

            <div v-if="!seats.length" class="empty">暂无座位数据，请确认后端座位接口可用。</div>
            <div v-else class="seat-groups">
              <div v-for="(areaSeats, area) in groupedSeats" :key="area" class="seat-area">
                <div class="area-title">
                  <strong>{{ area }}</strong>
                  <span>{{ areaSeats.length }} 座</span>
                </div>
                <div class="seat-grid">
                  <div
                    v-for="seat in areaSeats"
                    :key="seat.id"
                    :class="seatClass(seat)"
                    :title="`${seat.code} ${statusText(seat.availabilityStatus)}`"
                  >
                    <div class="seat-tile-head">
                      <strong>{{ seat.code }}</strong>
                      <mark :class="`status ${seat.availabilityStatus}`">{{ statusText(seat.availabilityStatus) }}</mark>
                    </div>
                    <label>
                      <span>编号</span>
                      <input v-model="seatCodeDrafts[seat.id]" class="seat-code-input" />
                    </label>
                    <div class="seat-actions">
                      <button :disabled="actionLoading.startsWith('seat-')" @click="saveSeatCode(seat)">保存编号</button>
                      <button :disabled="actionLoading.startsWith('seat-')" @click="changeSeatStatus(seat, 'locked')">锁定</button>
                      <button :disabled="actionLoading.startsWith('seat-')" @click="changeSeatStatus(seat, 'available')">启用</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="side-stack">
            <section class="panel action-panel">
              <div class="panel-head compact">
                <h2>远程开门</h2>
                <span>{{ lastUnlock ? statusText(lastUnlock.status) : '待操作' }}</span>
              </div>
              <div class="merchant-unlock-form">
                <input v-model="unlockTargetUserId" placeholder="目标用户 ID（可选）" />
                <input v-model="unlockReason" placeholder="开门原因" />
              </div>
              <button class="primary-action" :disabled="actionLoading === 'unlock'" @click="handleUnlock">
                {{ actionLoading === 'unlock' ? '开门中' : '远程开门' }}
              </button>
              <p v-if="lastUnlock" class="result-text">
                {{ lastUnlock.deviceId }} · {{ formatTime(lastUnlock.usableUntil || lastUnlock.occurredAt) }}
              </p>
            </section>

            <section class="panel action-panel">
              <div class="panel-head compact">
                <h2>长期通行码</h2>
                <span>{{ newCode?.codeSuffix || '未刷新' }}</span>
              </div>
              <button class="secondary-action" :disabled="actionLoading === 'code'" @click="handleRefreshCode">
                {{ actionLoading === 'code' ? '刷新中' : '刷新通行码' }}
              </button>
              <p v-if="newCode?.displayCode" class="code-text">{{ newCode.displayCode }}</p>
              <p v-if="newCode?.validUntil" class="result-text">有效至 {{ formatDateTime(newCode.validUntil) }}</p>
            </section>

            <section class="panel package-panel">
              <div class="panel-head compact">
                <h2>在售套餐</h2>
                <span>{{ packages.length }} 项</span>
              </div>
              <div class="package-list">
                <div v-for="item in packages" :key="item.id" class="package-row">
                  <span>{{ item.name }}</span>
                  <strong>{{ formatMoney(item.priceCent) }}</strong>
                </div>
                <div v-if="!packages.length" class="empty compact">暂无套餐</div>
              </div>
            </section>
          </aside>
        </section>

        <section class="table-grid">
          <div id="reservations" class="panel">
            <div class="panel-head compact">
              <h2>近期预约</h2>
              <span>{{ activeReservations.length }} 个有效预约</span>
            </div>
            <div class="table reservations-table">
              <div class="table-row table-head">
                <span>座位</span>
                <span>时间</span>
                <span>状态</span>
              </div>
              <div v-for="item in reservations" :key="item.id" class="table-row">
                <strong>{{ item.seat?.code || item.seatCode || item.seat?.id || item.seatId || '-' }}</strong>
                <span>{{ formatTime(item.startAt) }} - {{ formatTime(item.endAt) }}</span>
                <mark :class="`status ${item.status}`">{{ statusText(item.status) }}</mark>
              </div>
              <div v-if="!reservations.length" class="empty">暂无预约数据</div>
            </div>
          </div>

          <div id="orders" class="panel">
            <div class="panel-head compact">
              <h2>订单流水</h2>
              <span>{{ orders.length }} 条</span>
            </div>
            <div class="table orders-table">
              <div class="table-row table-head">
                <span>项目</span>
                <span>金额</span>
                <span>状态</span>
              </div>
              <div v-for="item in orders" :key="item.id" class="table-row">
                <strong>{{ item.subject || item.type || item.id }}</strong>
                <span>{{ formatMoney(item.payAmountCent || item.amountCent || 0) }}</span>
                <mark :class="`status ${item.status}`">{{ statusText(item.status) }}</mark>
              </div>
              <div v-if="!orders.length" class="empty">暂无订单数据</div>
            </div>
          </div>
        </section>

        <section class="table-grid operations-grid">
          <div id="customers" class="panel">
            <div class="panel-head compact">
              <h2>会员/客户</h2>
              <span>{{ customersData.scope === 'merchant' ? `${customers.length} 位` : '待接入' }}</span>
            </div>
            <div v-if="customersData.unavailable || customersData.message" class="empty-state">
              <strong>暂无可展示客户</strong>
              <p>{{ customersData.message || '后端未返回客户数据。' }}</p>
            </div>
            <div v-else class="table customers-table">
              <div class="table-row table-head">
                <span>客户</span>
                <span>会员</span>
                <span>最近到店</span>
              </div>
              <div v-for="item in customers" :key="item.id || item.userId" class="table-row">
                <strong>{{ item.nickname || item.name || item.userId }}</strong>
                <span>{{ statusText(item.membershipLevel) || item.membershipLevel || '-' }}</span>
                <span>{{ formatDateTime(item.lastVisitAt || item.lastReservationAt || item.lastActiveAt || item.lastLoginAt) }}</span>
              </div>
            </div>
          </div>

          <div id="access-log" class="panel">
            <div class="panel-head compact">
              <h2>门禁日志</h2>
              <span>{{ accessEventsData.scope === 'merchant' ? `${accessEvents.length} 条` : '待接入' }}</span>
            </div>
            <div v-if="accessEventsData.unavailable || accessEventsData.message" class="empty-state">
              <strong>暂无门禁流水</strong>
              <p>{{ accessEventsData.message || '后端未返回门禁事件。' }}</p>
              <p v-if="lastUnlock">最近远程开门：{{ lastUnlock.deviceId }} · {{ statusText(lastUnlock.status) }}</p>
            </div>
            <div v-else class="table access-table">
              <div class="table-row table-head">
                <span>时间</span>
                <span>设备/用户</span>
                <span>结果</span>
              </div>
              <div v-for="item in accessEvents" :key="item.id" class="table-row">
                <strong>{{ formatDateTime(item.occurredAt || item.createdAt) }}</strong>
                <span>{{ item.device?.id || item.deviceId || '-' }} / {{ item.user?.id || item.userId || '-' }}</span>
                <mark :class="eventResultClass(item)">{{ statusText(item.result || item.status) }}</mark>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
