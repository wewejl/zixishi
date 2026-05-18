import { AppError } from '../utils/errors.js';
import { getBusinessHoursForDate } from './store.js';

const VALID_FEATURES = new Set(['quiet', 'window', 'power', 'wide_desk']);
const PHYSICAL_UNAVAILABLE = new Set(['locked', 'maintenance', 'disabled']);

export class SeatService {
  constructor({ storeRepository, seatRepository }) {
    this.storeRepository = storeRepository;
    this.seatRepository = seatRepository;
  }

  getAvailability({ storeId, date, startAt, endAt, features }) {
    const store = this.storeRepository.findById(storeId);
    if (!store) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: '门店不存在',
        status: 404,
        details: { storeId }
      });
    }

    const resolvedDate = validateDate(date);
    const requestedFeatures = parseFeatures(features);
    const [windowStart, windowEnd] = resolveQueryWindow(store, resolvedDate, startAt, endAt);
    const reservationSeatIds = new Set(
      this.seatRepository.listReservationConflicts(storeId, windowStart, windowEnd).map((row) => row.seat_id)
    );
    const occupiedSeatIds = new Set(
      this.seatRepository.listActiveSessionConflicts(storeId, windowStart, windowEnd).map((row) => row.seat_id)
    );

    const seats = this.seatRepository.listByStore(storeId)
      .map((seat) => mapSeat(seat, reservationSeatIds, occupiedSeatIds))
      .filter((seat) => requestedFeatures.every((feature) => seat.features.includes(feature)));

    return {
      storeId,
      date: resolvedDate,
      timeSlots: buildTimeSlots(store, resolvedDate),
      seats
    };
  }

  getStudyingUserCount(storeId) {
    return this.seatRepository.countActiveSessions(storeId);
  }
}

function validateDate(date) {
  const resolved = date || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw invalidArgument('date 格式必须为 YYYY-MM-DD', { field: 'date' });
  }

  return resolved;
}

function parseFeatures(features) {
  if (!features) return [];
  const parsed = String(features).split(',').map((feature) => feature.trim()).filter(Boolean);
  const invalid = parsed.find((feature) => !VALID_FEATURES.has(feature));
  if (invalid) {
    throw invalidArgument('features 包含不支持的值', { field: 'features', value: invalid });
  }
  return parsed;
}

function resolveQueryWindow(store, date, startAt, endAt) {
  const [openAt, closeAt] = getBusinessHoursForDate(store, date);
  const businessStart = `${date}T${openAt}:00+08:00`;
  const businessEnd = `${date}T${closeAt}:00+08:00`;
  const resolvedStart = startAt || businessStart;
  const resolvedEnd = endAt || addHoursIso(resolvedStart, 1);

  const startDate = new Date(resolvedStart);
  const endDate = new Date(resolvedEnd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    throw invalidArgument('startAt/endAt 时间范围无效', { startAt, endAt });
  }

  const businessStartDate = new Date(businessStart);
  const businessEndDate = new Date(businessEnd);
  if (startDate < businessStartDate || endDate > businessEndDate) {
    throw invalidArgument('查询时间必须在门店营业时间内', { startAt: resolvedStart, endAt: resolvedEnd });
  }

  return [startDate.toISOString(), endDate.toISOString()];
}

function buildTimeSlots(store, date) {
  const [openAt, closeAt] = getBusinessHoursForDate(store, date);
  const slots = [];
  let cursor = new Date(`${date}T${openAt}:00+08:00`);
  const close = new Date(`${date}T${closeAt}:00+08:00`);

  while (cursor < close) {
    const start = new Date(cursor);
    cursor = new Date(Math.min(cursor.getTime() + 60 * 60 * 1000, close.getTime()));
    slots.push({
      startAt: toShanghaiIso(start),
      endAt: toShanghaiIso(cursor),
      available: true
    });
  }

  return slots;
}

function mapSeat(row, reservationSeatIds, occupiedSeatIds) {
  const features = safeParseFeatures(row.features_json);
  let availabilityStatus = row.status;
  if (!PHYSICAL_UNAVAILABLE.has(row.status)) {
    if (occupiedSeatIds.has(row.id)) {
      availabilityStatus = 'occupied';
    } else if (reservationSeatIds.has(row.id)) {
      availabilityStatus = 'reserved';
    } else {
      availabilityStatus = 'available';
    }
  }

  return {
    id: row.id,
    code: row.seat_no,
    area: row.area_name,
    features,
    physicalStatus: row.status,
    availabilityStatus
  };
}

function safeParseFeatures(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addHoursIso(value, hours) {
  const date = new Date(value);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

function toShanghaiIso(date) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + offsetMs);
  return `${local.toISOString().slice(0, 19)}+08:00`;
}

function invalidArgument(message, details) {
  return new AppError({
    code: 'INVALID_ARGUMENT',
    message,
    status: 400,
    details
  });
}
