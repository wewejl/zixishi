import { AppError, notFound } from '../utils/errors.js';

const RESERVATION_STATUSES = new Set([
  'pending_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'expired',
  'no_show',
]);
const ORDER_STATUSES = new Set(['pending_payment', 'paid', 'closed', 'refunded', 'partially_refunded']);
const USER_STATUSES = new Set(['active', 'disabled']);
const ACCESS_RESULTS = new Set(['granted', 'denied', 'error']);

export class MerchantService {
  constructor({ storeRepository, merchantRepository }) {
    this.storeRepository = storeRepository;
    this.merchantRepository = merchantRepository;
  }

  getOperationSummary({ storeId, from, to }) {
    this.assertStore(storeId);
    const now = new Date();
    const range = normalizeRange({ from, to, now });
    const data = this.merchantRepository.getStoreOperationSummary({
      storeId,
      from: range.from,
      to: range.to,
      now: now.toISOString(),
    });
    const seatCounts = mapCounts(data.seatCounts, 'status');

    return {
      storeId,
      range,
      metrics: {
        activeSessionCount: number(data.activeSessions?.count),
        memberCount: number(data.members?.count),
        reservationCount: number(data.reservations?.total),
        upcomingReservationCount: number(data.reservations?.upcoming),
        completedSessionCount: number(data.sessions?.completed_count),
        studyMinutes: number(data.sessions?.completed_minutes),
        paidOrderCount: number(data.orders?.paid_count),
        pendingOrderCount: number(data.pendingOrders?.count),
        revenueCents: number(data.orders?.revenue_cents),
        accessGrantedCount: number(data.access?.granted),
        accessDeniedCount: number(data.access?.denied),
      },
      seats: {
        total: Object.values(seatCounts).reduce((sum, value) => sum + value, 0),
        available: seatCounts.available ?? 0,
        locked: seatCounts.locked ?? 0,
        maintenance: seatCounts.maintenance ?? 0,
        disabled: seatCounts.disabled ?? 0,
      },
      reservations: {
        pendingPayment: number(data.reservations?.pending_payment),
        confirmed: number(data.reservations?.confirmed),
        checkedIn: number(data.reservations?.checked_in),
        completed: number(data.reservations?.completed),
        cancelled: number(data.reservations?.cancelled),
      },
    };
  }

  listMembers({ storeId, keyword, status, limit, cursor }) {
    this.assertStore(storeId);
    if (status && !USER_STATUSES.has(status)) {
      throw invalidArgument('status is invalid', { status });
    }

    const normalizedLimit = normalizeLimit(limit, 100);
    const decodedCursor = decodeCursor(cursor, ['createdAt', 'id']);
    const rows = this.merchantRepository.listMembers({
      storeId,
      keyword: keyword ? String(keyword).trim() : null,
      status: status || null,
      limit: normalizedLimit,
      cursor: decodedCursor,
      now: new Date().toISOString(),
    });

    return pageResponse({
      rows,
      limit: normalizedLimit,
      cursorForRow: (row) => ({ createdAt: row.created_at, id: row.id }),
      map: mapMember,
    });
  }

  listAccessEvents({ storeId, result, limit, cursor }) {
    this.assertStore(storeId);
    if (result && !ACCESS_RESULTS.has(result)) {
      throw invalidArgument('result is invalid', { result });
    }

    const normalizedLimit = normalizeLimit(limit, 100);
    const decodedCursor = decodeCursor(cursor, ['occurredAt', 'id']);
    const rows = this.merchantRepository.listAccessEvents({
      storeId,
      result: result || null,
      limit: normalizedLimit,
      cursor: decodedCursor,
    });

    return pageResponse({
      rows,
      limit: normalizedLimit,
      cursorForRow: (row) => ({ occurredAt: row.occurred_at, id: row.id }),
      map: mapAccessEvent,
    });
  }

  listReservations({ storeId, status, limit, cursor }) {
    this.assertStore(storeId);
    if (status && !RESERVATION_STATUSES.has(status)) {
      throw invalidArgument('status is invalid', { status });
    }

    const normalizedLimit = normalizeLimit(limit, 100);
    const decodedCursor = decodeCursor(cursor, ['startAt', 'id']);
    const rows = this.merchantRepository.listReservations({
      storeId,
      status: status || null,
      limit: normalizedLimit,
      cursor: decodedCursor,
    });

    return pageResponse({
      rows,
      limit: normalizedLimit,
      cursorForRow: (row) => ({ startAt: row.start_at, id: row.id }),
      map: mapReservation,
    });
  }

  listOrders({ storeId, status, limit, cursor }) {
    this.assertStore(storeId);
    if (status && !ORDER_STATUSES.has(status)) {
      throw invalidArgument('status is invalid', { status });
    }

    const normalizedLimit = normalizeLimit(limit, 100);
    const decodedCursor = decodeCursor(cursor, ['createdAt', 'id']);
    const rows = this.merchantRepository.listOrders({
      storeId,
      status: status || null,
      limit: normalizedLimit,
      cursor: decodedCursor,
    });

    return pageResponse({
      rows,
      limit: normalizedLimit,
      cursorForRow: (row) => ({ createdAt: row.created_at, id: row.id }),
      map: mapOrder,
    });
  }

  assertStore(storeId) {
    const store = this.storeRepository.findById(storeId);
    if (!store) {
      throw notFound('Store not found', { storeId });
    }
    return store;
  }
}

function mapMember(row) {
  return {
    id: row.id,
    userId: row.id,
    nickname: row.nickname,
    name: row.nickname,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    status: row.status,
    membershipLevel: row.is_long_term_member ? 'premium' : (row.remaining_minutes > 0 ? 'premium' : 'basic'),
    isLongTermMember: Boolean(row.is_long_term_member),
    remainingMinutes: number(row.remaining_minutes),
    totalStudyMinutes: number(row.total_study_minutes),
    totalPaidCents: number(row.total_paid_cents),
    lastReservationAt: row.last_reservation_at,
    lastVisitAt: row.last_reservation_at,
    lastActiveAt: row.last_login_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

function mapAccessEvent(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    device: row.device_id ? {
      id: row.device_id,
      name: row.device_name,
    } : null,
    userId: row.user_id,
    userNickname: row.nickname,
    user: row.user_id ? {
      id: row.user_id,
      nickname: row.nickname,
      phone: row.phone,
    } : null,
    reservationId: row.reservation_id,
    studySessionId: row.study_session_id,
    direction: row.direction,
    result: row.result,
    reason: row.reason,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

function mapReservation(row) {
  return {
    id: row.id,
    userId: row.user_id,
    user: {
      id: row.user_id,
      nickname: row.nickname,
      phone: row.phone,
    },
    seatId: row.seat_id,
    seatCode: row.seat_no,
    seatArea: row.area_name,
    seat: {
      id: row.seat_id,
      code: row.seat_no,
      area: row.area_name,
    },
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    orderId: row.order_id,
    entitlementId: row.entitlement_id,
    checkedInAt: row.checked_in_at,
    checkedOutAt: row.checked_out_at,
    createdAt: row.created_at,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    orderNo: row.order_no,
    type: row.plan_name ? 'package' : 'reservation',
    status: row.status,
    user: {
      id: row.user_id,
      nickname: row.nickname,
      phone: row.phone,
    },
    subject: row.plan_name ?? 'Reservation payment',
    amountCents: row.amount_cents,
    paidCents: row.paid_cents,
    currency: row.currency,
    payChannel: row.pay_channel,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    reservation: row.reservation_id ? {
      id: row.reservation_id,
      startAt: row.reservation_start_at,
      endAt: row.reservation_end_at,
    } : null,
  };
}

function normalizeRange({ from, to, now }) {
  const start = from ? new Date(from) : shanghaiDayStart(now);
  const end = to ? new Date(to) : new Date(start.getTime() + 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw invalidArgument('from/to range is invalid', { from, to });
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function shanghaiDayStart(now) {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const yyyyMmDd = local.toISOString().slice(0, 10);
  return new Date(`${yyyyMmDd}T00:00:00+08:00`);
}

function normalizeLimit(limit, max) {
  const numeric = Number.parseInt(limit, 10);
  if (!Number.isInteger(numeric) || numeric < 1) return 20;
  return Math.min(numeric, max);
}

function pageResponse({ rows, limit, cursorForRow, map }) {
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(map),
    page: {
      limit,
      nextCursor: rows.length > limit && last ? encodeCursor(cursorForRow(last)) : null,
      hasMore: rows.length > limit,
    },
  };
}

function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(cursor, requiredKeys) {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!requiredKeys.every((key) => decoded?.[key])) {
      throw new Error('Invalid cursor');
    }
    return decoded;
  } catch {
    throw invalidArgument('cursor is invalid', { cursor });
  }
}

function mapCounts(rows, key) {
  return Object.fromEntries(rows.map((row) => [row[key], number(row.count)]));
}

function number(value) {
  return Number(value || 0);
}

function invalidArgument(message, details) {
  return new AppError({
    code: 'INVALID_ARGUMENT',
    message,
    status: 400,
    details,
  });
}
