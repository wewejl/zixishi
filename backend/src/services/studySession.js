import { AppError, notFound } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { withTransaction } from '../repositories/transaction.js';
import { ReservationRepository } from '../repositories/ReservationRepository.js';
import { ReservationEntitlementRepository } from '../repositories/ReservationEntitlementRepository.js';
import { StudySessionRepository } from '../repositories/StudySessionRepository.js';
import { ReservationEntitlementService } from './reservationEntitlement.js';
import { diffMinutes } from './reservation.js';

export class StudySessionService {
  constructor({ db }) {
    this.db = db;
  }

  getCurrentSession(userId) {
    const sessionRepository = new StudySessionRepository(this.db);
    const entitlementRepository = new ReservationEntitlementRepository(this.db);
    const session = sessionRepository.findActiveForUser(userId);

    return {
      session: session ? toSessionDto(session, {
        todayStudyMinutes: getTodayStudyMinutes(sessionRepository, userId),
        remainingPackageMinutes: getRemainingPackageMinutes(entitlementRepository, userId),
      }) : null,
    };
  }

  checkIn({ userId, reservationId }) {
    if (!reservationId) {
      throw invalidArgument('缺少 reservationId', { required: ['reservationId'] });
    }

    return withTransaction((tx) => {
      const reservationRepository = new ReservationRepository(tx);
      const sessionRepository = new StudySessionRepository(tx);
      const reservation = reservationRepository.findById(reservationId);

      if (!reservation || reservation.userId !== userId) {
        throw notFound('预约不存在', { reservationId });
      }

      const existing = sessionRepository.findByReservationId(reservationId);
      if (existing) {
        return { session: toSessionDto(existing) };
      }

      const at = nowIso();
      if (reservation.status !== 'confirmed' || !canCheckIn(reservation, at)) {
        throw new AppError({
          code: 'RESERVATION_NOT_ACTIVE',
          message: '预约当前不可签到',
          status: 400,
          details: { reservationId, status: reservation.status },
        });
      }

      reservationRepository.markCheckedIn({ id: reservationId, checkedInAt: at });
      const session = sessionRepository.create({
        id: createId('sess'),
        userId,
        storeId: reservation.storeId,
        areaId: reservation.areaId,
        seatId: reservation.seatId,
        reservationId,
        startedAt: at,
        createdAt: at,
        updatedAt: at,
      });

      return { session: toSessionDto(session) };
    }, { db: this.db });
  }

  endSession({ userId, sessionId }) {
    if (!sessionId) {
      throw invalidArgument('缺少 sessionId', { required: ['sessionId'] });
    }

    return withTransaction((tx) => {
      const sessionRepository = new StudySessionRepository(tx);
      const reservationRepository = new ReservationRepository(tx);
      const entitlementRepository = new ReservationEntitlementRepository(tx);
      const entitlementService = new ReservationEntitlementService({ entitlementRepository });
      const session = sessionRepository.findById(sessionId);

      if (!session || session.userId !== userId) {
        throw notFound('学习会话不存在', { sessionId });
      }

      if (session.status === 'completed') {
        const reservation = session.reservationId
          ? reservationRepository.findById(session.reservationId)
          : null;
        const entitlement = reservation?.entitlementId
          ? entitlementRepository.findById(reservation.entitlementId)
          : null;

        return {
          session: toCompletedSessionDto(session),
          entitlement: toEntitlementDto(entitlement),
        };
      }

      if (session.status !== 'active') {
        throw new AppError({
          code: 'RESERVATION_NOT_ACTIVE',
          message: '学习会话当前不可结束',
          status: 400,
          details: { sessionId, status: session.status },
        });
      }

      const at = nowIso();
      const durationMinutes = diffMinutes(session.startedAt, at);
      const completed = sessionRepository.complete({ id: sessionId, endedAt: at, durationMinutes });
      let entitlement = null;

      if (session.reservationId) {
        const reservation = reservationRepository.findById(session.reservationId);
        reservationRepository.markCompleted({ id: session.reservationId, checkedOutAt: at });
        entitlement = entitlementService.consumeForSession({
          entitlementId: reservation?.entitlementId,
          userId,
          reservationId: session.reservationId,
          studySessionId: sessionId,
          at,
        });
      }

      return {
        session: toCompletedSessionDto(completed),
        entitlement: toEntitlementDto(entitlement),
      };
    }, { db: this.db });
  }
}

function toSessionDto(session, extras = {}) {
  return {
    id: session.id,
    reservationId: session.reservationId,
    storeId: session.storeId,
    seatId: session.seatId,
    seatCode: session.seatCode,
    seatLabel: extras.includeLabel === false ? undefined : `${session.seatCode}`,
    status: session.status,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    todayStudyMinutes: extras.todayStudyMinutes,
    remainingPackageMinutes: extras.remainingPackageMinutes,
    powerEnabled: true,
    wifiConnected: true,
  };
}

function toCompletedSessionDto(session) {
  return {
    id: session.id,
    status: 'completed',
    startedAt: session.startedAt,
    completedAt: session.endedAt,
    studyMinutes: session.durationMinutes,
  };
}

function toEntitlementDto(entitlement) {
  if (!entitlement) {
    return null;
  }

  return {
    remainingMinutes: entitlement.remainingMinutes,
  };
}

function canCheckIn(reservation, at) {
  const allowedStart = new Date(reservation.startAt).getTime() - 15 * 60000;
  const allowedEnd = new Date(reservation.endAt).getTime() + 15 * 60000;
  const now = new Date(at).getTime();
  return now >= allowedStart && now <= allowedEnd;
}

function getTodayStudyMinutes(sessionRepository, userId) {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
  return sessionRepository.getTodayStudyMinutes({ userId, dayStart, dayEnd });
}

function getRemainingPackageMinutes(entitlementRepository, userId) {
  return entitlementRepository
    .listUsableForUser({ userId, storeId: null, at: nowIso() })
    .reduce((sum, entitlement) => sum + (entitlement.remainingMinutes ?? 0), 0);
}

function invalidArgument(message, details) {
  return new AppError({
    code: 'INVALID_ARGUMENT',
    message,
    status: 400,
    details,
  });
}
