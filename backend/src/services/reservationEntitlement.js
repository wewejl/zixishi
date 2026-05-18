import { createId } from '../utils/id.js';

export class ReservationEntitlementService {
  constructor({ entitlementRepository }) {
    this.entitlementRepository = entitlementRepository;
  }

  findCoveringEntitlement({ userId, storeId, at, minutes }) {
    const entitlements = this.entitlementRepository.listUsableForUser({ userId, storeId, at });

    return entitlements.find((entitlement) => {
      if (entitlement.entitlementType === 'period') {
        return true;
      }

      if (entitlement.entitlementType === 'uses') {
        return (entitlement.remainingUses ?? 0) >= 1;
      }

      return (entitlement.remainingMinutes ?? 0) >= minutes;
    }) ?? null;
  }

  holdForReservation({ entitlement, userId, reservationId, minutes, at }) {
    if (!entitlement) {
      return null;
    }

    const delta = deltasForHold(entitlement, minutes);
    const updated = this.entitlementRepository.adjustBalance({
      entitlementId: entitlement.id,
      minuteDelta: delta.minutes,
      useDelta: delta.uses,
      updatedAt: at,
    });

    this.entitlementRepository.createLedgerEntry({
      id: createId('ledger'),
      entitlementId: entitlement.id,
      userId,
      eventType: 'reserve_hold',
      deltaMinutes: delta.minutes,
      deltaUses: delta.uses,
      balanceMinutesAfter: updated.remainingMinutes,
      balanceUsesAfter: updated.remainingUses,
      reservationId,
      studySessionId: null,
      orderId: null,
      idempotencyKey: `reserve_hold:${reservationId}`,
      note: 'Reservation entitlement hold',
      createdAt: at,
    });

    return updated;
  }

  releaseForReservation({ entitlementId, userId, reservationId, minutes, at }) {
    const existing = this.entitlementRepository.findLedgerByIdempotencyKey(`reserve_release:${reservationId}`);
    if (existing) {
      return this.entitlementRepository.findById(entitlementId);
    }

    const entitlement = this.entitlementRepository.findById(entitlementId);
    if (!entitlement) {
      return null;
    }

    const hold = this.entitlementRepository.findLedgerByIdempotencyKey(`reserve_hold:${reservationId}`);
    const minuteDelta = Math.abs(hold?.deltaMinutes ?? 0);
    const useDelta = Math.abs(hold?.deltaUses ?? 0);
    const updated = this.entitlementRepository.adjustBalance({
      entitlementId,
      minuteDelta,
      useDelta,
      updatedAt: at,
    });

    this.entitlementRepository.createLedgerEntry({
      id: createId('ledger'),
      entitlementId,
      userId,
      eventType: 'reserve_release',
      deltaMinutes: minuteDelta,
      deltaUses: useDelta,
      balanceMinutesAfter: updated.remainingMinutes,
      balanceUsesAfter: updated.remainingUses,
      reservationId,
      studySessionId: null,
      orderId: null,
      idempotencyKey: `reserve_release:${reservationId}`,
      note: `Release unused reservation hold for ${minutes} minutes`,
      createdAt: at,
    });

    return updated;
  }

  consumeForSession({ entitlementId, userId, reservationId, studySessionId, at }) {
    if (!entitlementId) {
      return null;
    }

    const existing = this.entitlementRepository.findLedgerByIdempotencyKey(`consume:${studySessionId}`);
    if (existing) {
      return this.entitlementRepository.findById(entitlementId);
    }

    const entitlement = this.entitlementRepository.findById(entitlementId);
    if (!entitlement) {
      return null;
    }

    this.entitlementRepository.createLedgerEntry({
      id: createId('ledger'),
      entitlementId,
      userId,
      eventType: 'consume',
      deltaMinutes: 0,
      deltaUses: 0,
      balanceMinutesAfter: entitlement.remainingMinutes,
      balanceUsesAfter: entitlement.remainingUses,
      reservationId,
      studySessionId,
      orderId: null,
      idempotencyKey: `consume:${studySessionId}`,
      note: 'Finalize reservation entitlement consumption',
      createdAt: at,
    });

    return entitlement;
  }
}

function deltasForHold(entitlement, minutes) {
  if (entitlement.entitlementType === 'minutes') {
    return { minutes: -minutes, uses: 0 };
  }

  if (entitlement.entitlementType === 'uses') {
    return { minutes: 0, uses: -1 };
  }

  return { minutes: 0, uses: 0 };
}
