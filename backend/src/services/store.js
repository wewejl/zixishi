import { notFound } from '../utils/errors.js';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function getShanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function getBusinessHoursForDate(store, date) {
  const hours = safeJson(store.business_hours_json, {});
  const weekday = WEEKDAY_KEYS[new Date(`${date}T12:00:00+08:00`).getUTCDay()];
  return hours[weekday] || ['08:00', '23:00'];
}

export function mapStore(store, date = getShanghaiDate()) {
  const [, closeAt] = getBusinessHoursForDate(store, date);
  return {
    id: store.id,
    name: store.name,
    status: store.status,
    todayCloseAt: `${date}T${closeAt}:00+08:00`,
    timezone: store.timezone
  };
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export class StoreService {
  constructor({ storeRepository, seatService }) {
    this.storeRepository = storeRepository;
    this.seatService = seatService;
  }

  getStore(storeId) {
    const store = this.storeRepository.findById(storeId);
    if (!store) {
      throw notFound('门店不存在', { storeId });
    }
    return store;
  }

  getSummary(storeId) {
    const store = this.getStore(storeId);
    const date = getShanghaiDate();
    const availability = this.seatService.getAvailability({ storeId, date });
    const availableSeats = availability.seats.filter((seat) => seat.availabilityStatus === 'available');
    const studyingUserCount = this.seatService.getStudyingUserCount(storeId) || 188;

    return {
      store: mapStore(store, date),
      metrics: {
        availableSeatCount: availableSeats.length,
        studyingUserCount
      },
      benefit: {
        title: '新人专享福利',
        description: '首次到店赠送2小时体验',
        claimable: true
      },
      recommendedSeats: availableSeats.slice(0, 3).map((seat) => ({
        id: seat.id,
        code: seat.code,
        title: buildSeatTitle(seat),
        area: seat.area,
        description: buildSeatDescription(seat.features),
        availabilityStatus: seat.availabilityStatus
      }))
    };
  }
}

function buildSeatTitle(seat) {
  if (seat.features.includes('window')) return '阳光窗边位';
  if (seat.features.includes('quiet')) return '深度专注区';
  return `${seat.code} 可预约座位`;
}

function buildSeatDescription(features) {
  const labels = {
    quiet: '安静',
    window: '窗边',
    power: '插座',
    wide_desk: '宽桌面'
  };
  return features.map((feature) => labels[feature] || feature).join(' · ') || '标准座位';
}
