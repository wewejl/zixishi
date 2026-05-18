<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  loadMe,
  loadOrders,
  loadPackages,
  loadReservations,
  loadSeatAvailability,
  loadStoreSummary,
  login,
  refreshLongTermCode,
  unlockDoor,
  loadMerchantSeats,
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
const error = ref('');
const storeSummary = ref(null);
const availability = ref({ seats: [], timeSlots: [] });
const reservations = ref([]);
const orders = ref([]);
const packages = ref([]);
const profile = ref(null);
const lastUnlock = ref(null);
const newCode = ref(null);
const seatCodeDrafts = ref({});
const unlockTargetUserId = ref('');
const unlockReason = ref('merchant_manual_unlock');

const store = computed(() => storeSummary.value?.store || {});
const metrics = computed(() => storeSummary.value?.metrics || {});
const seats = computed(() => availability.value?.seats || []);
const groupedSeats = computed(() => {
  return seats.value.reduce((groups, seat) => {
    const area = seat.area || '未分区';
    groups[area] ||= [];
    groups[area].push(seat);
    return groups;
  }, {});
});

const seatStats = computed(() => {
  const initial = {
    total: seats.value.length,
    available: 0,
    reserved: 0,
    occupied: 0,
    locked: 0
  };

  return seats.value.reduce((stats, seat) => {
    if (seat.availabilityStatus === 'available') stats.available += 1;
    if (seat.availabilityStatus === 'reserved') stats.reserved += 1;
    if (seat.availabilityStatus === 'occupied') stats.occupied += 1;
    if (['locked', 'maintenance', 'disabled'].includes(seat.availabilityStatus)) stats.locked += 1;
    return stats;
  }, initial);
});

const paidAmount = computed(() => {
  return orders.value
    .filter((order) => order.status === 'paid')
    .reduce((sum, order) => sum + (order.payAmountCent || 0), 0);
});

const activeReservations = computed(() => {
  return reservations.value.filter((reservation) => {
    return ['pending_payment', 'confirmed', 'checked_in'].includes(reservation.status);
  });
});

const queryWindow = computed(() => ({
  date: selectedDate.value,
  startAt: `${selectedDate.value}T${selectedStart.value}:00+08:00`,
  endAt: `${selectedDate.value}T${selectedEnd.value}:00+08:00`
}));

async function loadAll() {
  error.value = '';
  refreshing.value = true;

  try {
    await login();
    const [summary, seatResult, reservationResult, orderResult, packageResult, meResult] = await Promise.all([
      loadStoreSummary(),
      loadSeatAvailability(queryWindow.value),
      loadReservations(),
      loadOrders(),
      loadPackages(),
      loadMe()
    ]);

    storeSummary.value = summary;
    availability.value = seatResult;
    const merchantSeats = await loadMerchantSeats();
    seatCodeDrafts.value = Object.fromEntries((merchantSeats.items || []).map((it) => [it.id, it.code]));
    reservations.value = reservationResult.items || [];
    orders.value = orderResult.items || [];
    packages.value = packageResult.items || [];
    profile.value = meResult;
  } catch (err) {
    error.value = err.message || '数据加载失败';
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleUnlock() {
  actionLoading.value = 'unlock';
  error.value = '';
  try {
    const result = await unlockDoor({
      targetUserId: unlockTargetUserId.value.trim() || null,
      reason: unlockReason.value.trim() || 'merchant_manual_unlock'
    });
    lastUnlock.value = result.unlock;
  } catch (err) {
    error.value = err.message || '开门失败';
  } finally {
    actionLoading.value = '';
  }
}

async function handleRefreshCode() {
  actionLoading.value = 'code';
  error.value = '';
  try {
    const result = await refreshLongTermCode();
    newCode.value = result.code;
  } catch (err) {
    error.value = err.message || '通行码刷新失败';
  } finally {
    actionLoading.value = '';
  }
}


async function saveSeatCode(seat) {
  const nextCode = String(seatCodeDrafts.value[seat.id] || '').trim();
  if (!nextCode) return;
  actionLoading.value = `seat-code-${seat.id}`;
  error.value = '';
  try {
    await updateMerchantSeatCode(seat.id, nextCode);
    await loadAll();
  } catch (err) {
    error.value = err.message || '更新座位编码失败';
  } finally {
    actionLoading.value = '';
  }
}

async function changeSeatStatus(seat, status) {
  actionLoading.value = `seat-status-${seat.id}-${status}`;
  error.value = '';
  try {
    await updateMerchantSeatStatus(seat.id, status);
    await loadAll();
  } catch (err) {
    error.value = err.message || '更新座位状态失败';
  } finally {
    actionLoading.value = '';
  }
}

function formatMoney(amountCent = 0) {
  return `¥${(amountCent / 100).toFixed(2)}`;
}

function formatTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function statusText(status) {
  const labels = {
    open: '营业中',
    closed: '已闭店',
    maintenance: '维护',
    available: '空闲',
    reserved: '已预约',
    occupied: '使用中',
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
    granted: '已授权',
    refunded: '已退款',
    closed_order: '已关闭'
  };
  return labels[status] || status || '-';
}

function seatClass(seat) {
  return `seat-tile is-${seat.availabilityStatus}`;
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
        <a class="active" href="#overview">总览</a>
        <a href="#seats">座位</a>
        <a href="#reservations">预约</a>
        <a href="#orders">订单</a>
      </nav>

      <div class="operator-card">
        <span>当前账号</span>
        <strong>{{ profile?.user?.nickname || '商家账号' }}</strong>
        <small>{{ profile?.user?.membershipLevel || 'mock' }}</small>
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
          <button class="icon-button" :disabled="refreshing" @click="loadAll" aria-label="刷新数据">
            {{ refreshing ? '刷新中' : '刷新' }}
          </button>
        </div>
      </header>

      <div v-if="error" class="alert">{{ error }}</div>
      <div v-if="loading" class="loading">正在加载门店数据...</div>

      <template v-else>
        <section id="overview" class="metric-grid">
          <article class="metric-card primary">
            <span>可用座位</span>
            <strong>{{ seatStats.available }}</strong>
            <small>共 {{ seatStats.total }} 个座位</small>
          </article>
          <article class="metric-card">
            <span>使用中</span>
            <strong>{{ seatStats.occupied || metrics.studyingUserCount || 0 }}</strong>
            <small>实时会话</small>
          </article>
          <article class="metric-card">
            <span>有效预约</span>
            <strong>{{ activeReservations.length }}</strong>
            <small>待支付 / 已确认 / 已入座</small>
          </article>
          <article class="metric-card">
            <span>已支付金额</span>
            <strong>{{ formatMoney(paidAmount) }}</strong>
            <small>当前账号订单</small>
          </article>
        </section>

        <section class="workspace">
          <div id="seats" class="panel seat-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Seat board</p>
                <h2>座位状态</h2>
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
              <span><i class="dot occupied"></i>使用中</span>
              <span><i class="dot locked"></i>不可用</span>
            </div>

            <div class="seat-groups">
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
                    <span>{{ seat.code }}</span>
                    <input v-model="seatCodeDrafts[seat.id]" class="seat-code-input" />
                    <div class="seat-actions">
                      <button :disabled="actionLoading.startsWith('seat-')" @click="saveSeatCode(seat)">改编码</button>
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
                <h2>门禁</h2>
                <span>{{ lastUnlock ? statusText(lastUnlock.status) : '待操作' }}</span>
              </div>
              <div class="merchant-unlock-form">
                <input v-model="unlockTargetUserId" placeholder="目标用户ID(可选)" />
                <input v-model="unlockReason" placeholder="开门原因" />
              </div>
              <button class="primary-action" :disabled="actionLoading === 'unlock'" @click="handleUnlock">
                {{ actionLoading === 'unlock' ? '开门中' : '远程开门' }}
              </button>
              <p v-if="lastUnlock" class="result-text">
                {{ lastUnlock.deviceId }} · {{ formatTime(lastUnlock.usableUntil) }}
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
              </div>
            </section>
          </aside>
        </section>

        <section class="table-grid">
          <div id="reservations" class="panel">
            <div class="panel-head compact">
              <h2>近期预约</h2>
              <span>{{ reservations.length }} 条</span>
            </div>
            <div class="table">
              <div class="table-row table-head">
                <span>座位</span>
                <span>时间</span>
                <span>状态</span>
              </div>
              <div v-for="item in reservations" :key="item.id" class="table-row">
                <strong>{{ item.seatCode }}</strong>
                <span>{{ formatTime(item.startAt) }} - {{ formatTime(item.endAt) }}</span>
                <mark :class="`status ${item.status}`">{{ statusText(item.status) }}</mark>
              </div>
              <div v-if="!reservations.length" class="empty">暂无预约</div>
            </div>
          </div>

          <div id="orders" class="panel">
            <div class="panel-head compact">
              <h2>订单流水</h2>
              <span>{{ orders.length }} 条</span>
            </div>
            <div class="table">
              <div class="table-row table-head">
                <span>项目</span>
                <span>金额</span>
                <span>状态</span>
              </div>
              <div v-for="item in orders" :key="item.id" class="table-row">
                <strong>{{ item.subject }}</strong>
                <span>{{ formatMoney(item.payAmountCent) }}</span>
                <mark :class="`status ${item.status}`">{{ statusText(item.status) }}</mark>
              </div>
              <div v-if="!orders.length" class="empty">暂无订单</div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.seat-code-input{width:72px;font-size:12px;margin-top:4px;}
.seat-actions{display:flex;gap:4px;flex-wrap:wrap;}
.seat-actions button{font-size:10px;padding:2px 6px;}

.merchant-unlock-form{display:flex;flex-direction:column;gap:6px;margin-bottom:8px;}
.merchant-unlock-form input{padding:6px 8px;font-size:12px;border:1px solid #d0d7de;border-radius:6px;}
</style>
