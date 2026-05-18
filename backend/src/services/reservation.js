import { AppError, notFound } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { withTransaction } from '../repositories/transaction.js';
import { ReservationRepository } from '../repositories/ReservationRepository.js';
import { ReservationEntitlementRepository } from '../repositories/ReservationEntitlementRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { ReservationEntitlementService } from './reservationEntitlement.js';
import { createOrderNo } from './payment.js';

const RESERVATION_STATUSES = new Set([
  'pending_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'expired',
  'no_show',
]);
const DEFAULT_RESERVATION_PRICE_CENT = 1500;

export class ReservationService {
  constructor({ db }) {
    this.db = db;
  }

  createReservation({ userId, storeId, seatId, startAt, endAt, useEntitlement = true }) {
    validateCreateReservation({ userId, storeId, seatId, startAt, endAt });

    return withTransaction((tx) => {
      const reservationRepository = new ReservationRepository(tx);
      const orderRepository = new OrderRepository(tx);
      const entitlementRepository = new ReservationEntitlementRepository(tx);
      const entitlementService = new ReservationEntitlementService({ entitlementRepository });
      const seat = reservationRepository.findSeatById(seatId);

      if (!seat || seat.storeId !== storeId || seat.status !== 'available') {
        throw new AppError({
          code: 'SEAT_NOT_AVAILABLE',
          message: '座位当前不可预约',
          status: 409,
          details: { seatId },
        });
      }

      assertWithinBusinessHours({ seat, startAt, endAt });

      const seatConflict = reservationRepository.findSeatTimeConflict({ seatId, startAt, endAt });
      if (seatConflict) {
        throw new AppError({
          code: 'SEAT_NOT_AVAILABLE',
          message: '座位当前不可预约',
          status: 409,
          details: { seatId, conflictReservationId: seatConflict.id },
        });
      }

      const userConflict = reservationRepository.findUserTimeConflict({ userId, startAt, endAt });
      if (userConflict) {
        throw new AppError({
          code: 'RESERVATION_CONFLICT',
          message: '当前时间段已有有效预约',
          status: 409,
          details: { conflictReservationId: userConflict.id },
        });
      }

      const at = nowIso();
      const minutes = diffMinutes(startAt, endAt);
      const entitlement = useEntitlement
        ? entitlementService.findCoveringEntitlement({ userId, storeId, at: startAt, minutes })
        : null;
      const hasEntitlement = Boolean(entitlement);
      const reservationId = createId('resv');
      let order = null;
      const reservation = reservationRepository.create({
        id: reservationId,
        userId,
        storeId,
        areaId: seat.areaId,
        seatId,
        startAt,
        endAt,
        status: hasEntitlement ? 'confirmed' : 'pending_payment',
        source: 'miniapp',
        entitlementId: entitlement?.id ?? null,
        orderId: null,
        createdAt: at,
        updatedAt: at,
      });

      if (entitlement) {
        entitlementService.holdForReservation({
          entitlement,
          userId,
          reservationId,
          minutes,
          at,
        });
      } else {
        order = orderRepository.createOrder({
          id: createId('order'),
          userId,
          orderNo: createOrderNo(),
          amountCents: DEFAULT_RESERVATION_PRICE_CENT,
          currency: 'CNY',
          wechatPrepayId: null,
          createdAt: at,
          updatedAt: at,
        });
        orderRepository.attachOrderToReservation(reservationId, order.id, at);
      }

      return {
        reservation: toReservationDto(reservation, { priceCent: hasEntitlement ? 0 : DEFAULT_RESERVATION_PRICE_CENT }),
        order: order ? {
          id: order.id,
          type: 'reservation',
          status: order.status,
          payAmountCent: order.amount_cents,
          currency: order.currency,
        } : null,
      };
    }, { db: this.db });
  }

  getCurrentReservation(userId) {
    const repository = new ReservationRepository(this.db);
    const reservation = repository.findCurrentForUser(userId, nowIso());
    return { reservation: reservation ? toReservationDto(reservation) : null };
  }

  listReservations({ userId, status, limit = 20, cursor }) {
    if (status && !RESERVATION_STATUSES.has(status)) {
      throw invalidArgument('status 不合法', { status });
    }

    const normalizedLimit = normalizeLimit(limit);
    const decodedCursor = decodeCursor(cursor);
    const repository = new ReservationRepository(this.db);
    const rows = repository.listForUser({
      userId,
      status,
      limit: normalizedLimit,
      cursor: decodedCursor,
    });
    const pageRows = rows.slice(0, normalizedLimit);
    const last = pageRows.at(-1);

    return {
      items: pageRows.map((reservation) => toReservationDto(reservation)),
      page: {
        limit: normalizedLimit,
        nextCursor: rows.length > normalizedLimit && last
          ? encodeCursor({ startAt: last.startAt, id: last.id })
          : null,
        hasMore: rows.length > normalizedLimit,
      },
    };
  }

  getReservation({ userId, reservationId }) {
    const repository = new ReservationRepository(this.db);
    const reservation = repository.findById(reservationId);
    if (!reservation || reservation.userId !== userId) {
      throw notFound('预约不存在', { reservationId });
    }

    return { reservation: toReservationDto(reservation) };
  }

  cancelReservation({ userId, reservationId, reason = 'user_cancelled' }) {
    return withTransaction((tx) => {
      const reservationRepository = new ReservationRepository(tx);
      const entitlementRepository = new ReservationEntitlementRepository(tx);
      const entitlementService = new ReservationEntitlementService({ entitlementRepository });
      const reservation = reservationRepository.findById(reservationId);

      if (!reservation || reservation.userId !== userId) {
        throw notFound('预约不存在', { reservationId });
      }

      if (['completed', 'cancelled'].includes(reservation.status)) {
        throw new AppError({
          code: 'RESERVATION_NOT_ACTIVE',
          message: '该预约不可取消',
          status: 400,
          details: { reservationId, status: reservation.status },
        });
      }

      const at = nowIso();
      const cancelled = reservationRepository.updateStatusForCancel({
        id: reservationId,
        cancelledAt: at,
        reason,
      });

      if (reservation.entitlementId) {
        entitlementService.releaseForReservation({
          entitlementId: reservation.entitlementId,
          userId,
          reservationId,
          minutes: diffMinutes(reservation.startAt, reservation.endAt),
          at,
        });
      }

      return {
        reservation: {
          id: cancelled.id,
          status: cancelled.status,
          cancelledAt: cancelled.cancelledAt,
        },
      };
    }, { db: this.db });
  }
}

export function toReservationDto(reservation, overrides = {}) {
  return {
    id: reservation.id,
    storeId: reservation.storeId,
    seatId: reservation.seatId,
    seatCode: reservation.seatCode,
    status: reservation.status,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    priceCent: overrides.priceCent ?? 0,
    currency: 'CNY',
  };
}

export function diffMinutes(startAt, endAt) {
  return Math.max(1, Math.ceil((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
}

function validateCreateReservation({ userId, storeId, seatId, startAt, endAt }) {
  if (!userId || !storeId || !seatId || !startAt || !endAt) {
    throw invalidArgument('缺少预约参数', { required: ['storeId', 'seatId', 'startAt', 'endAt'] });
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw invalidArgument('预约开始时间必须早于结束时间', { startAt, endAt });
  }
}

function assertWithinBusinessHours({ seat, startAt, endAt }) {
  const windows = parseBusinessHours(seat.businessHoursJson);
  if (!windows) {
    return;
  }

  const weekday = getLocalWeekday(startAt, seat.timezone || 'Asia/Shanghai');
  const window = windows[weekday];
  if (!Array.isArray(window) || window.length !== 2) {
    throw invalidArgument('预约时间不在营业时间内', { startAt, endAt });
  }

  const startMinutes = getLocalMinutes(startAt, seat.timezone || 'Asia/Shanghai');
  const endMinutes = getLocalMinutes(endAt, seat.timezone || 'Asia/Shanghai');
  const openMinutes = timeTextToMinutes(window[0]);
  const closeMinutes = timeTextToMinutes(window[1]);

  if (startMinutes < openMinutes || endMinutes > closeMinutes || startMinutes >= endMinutes) {
    throw invalidArgument('预约时间不在营业时间内', { startAt, endAt, businessHours: window });
  }
}

function parseBusinessHours(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getLocalWeekday(iso, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone })
    .formatToParts(new Date(iso));
  return parts.find((part) => part.type === 'weekday').value.toLowerCase();
}

function getLocalMinutes(iso, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === 'hour').value);
  const minute = Number(parts.find((part) => part.type === 'minute').value);
  return hour * 60 + minute;
}

function timeTextToMinutes(text) {
  const [hour, minute] = text.split(':').map(Number);
  return hour * 60 + minute;
}

function normalizeLimit(limit) {
  const numeric = Number(limit);
  if (!Number.isInteger(numeric) || numeric < 1) {
    return 20;
  }

  return Math.min(numeric, 100);
}

function encodeCursor(cursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!decoded?.startAt || !decoded?.id) {
      throw new Error('Invalid cursor');
    }
    return decoded;
  } catch {
    throw invalidArgument('cursor 不合法', { cursor });
  }
}

function invalidArgument(message, details) {
  return new AppError({
    code: 'INVALID_ARGUMENT',
    message,
    status: 400,
    details,
  });
}
