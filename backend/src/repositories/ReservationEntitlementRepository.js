import { BaseRepository } from './BaseRepository.js';

export class ReservationEntitlementRepository extends BaseRepository {
  listUsableForUser({ userId, storeId, at }) {
    return this.db.prepare(`
      SELECT
        id,
        user_id AS userId,
        entitlement_type AS entitlementType,
        store_id AS storeId,
        remaining_minutes AS remainingMinutes,
        remaining_uses AS remainingUses,
        valid_from AS validFrom,
        valid_until AS validUntil,
        status
      FROM user_entitlements
      WHERE user_id = ?
        AND status = 'active'
        AND valid_from <= ?
        AND (valid_until IS NULL OR valid_until >= ?)
        AND (store_id IS NULL OR store_id = ?)
      ORDER BY
        CASE WHEN store_id = ? THEN 0 ELSE 1 END,
        CASE WHEN valid_until IS NULL THEN 1 ELSE 0 END,
        valid_until ASC,
        created_at ASC
    `).all(userId, at, at, storeId, storeId);
  }

  findById(id) {
    return this.db.prepare(`
      SELECT
        id,
        user_id AS userId,
        entitlement_type AS entitlementType,
        store_id AS storeId,
        remaining_minutes AS remainingMinutes,
        remaining_uses AS remainingUses,
        status
      FROM user_entitlements
      WHERE id = ?
    `).get(id);
  }

  adjustBalance({ entitlementId, minuteDelta, useDelta, updatedAt }) {
    const entitlement = this.findById(entitlementId);
    if (!entitlement) {
      return null;
    }

    const nextMinutes = entitlement.remainingMinutes == null
      ? null
      : entitlement.remainingMinutes + minuteDelta;
    const nextUses = entitlement.remainingUses == null
      ? null
      : entitlement.remainingUses + useDelta;
    const exhausted = (nextMinutes === 0 || nextUses === 0)
      && entitlement.entitlementType !== 'period';

    this.db.prepare(`
      UPDATE user_entitlements
      SET remaining_minutes = ?,
          remaining_uses = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      nextMinutes,
      nextUses,
      exhausted ? 'exhausted' : 'active',
      updatedAt,
      entitlementId,
    );

    return this.findById(entitlementId);
  }

  createLedgerEntry(entry) {
    this.db.prepare(`
      INSERT INTO entitlement_ledger (
        id, entitlement_id, user_id, event_type, delta_minutes, delta_uses,
        balance_minutes_after, balance_uses_after, reservation_id, study_session_id,
        order_id, idempotency_key, note, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(idempotency_key) DO NOTHING
    `).run(
      entry.id,
      entry.entitlementId,
      entry.userId,
      entry.eventType,
      entry.deltaMinutes,
      entry.deltaUses,
      entry.balanceMinutesAfter,
      entry.balanceUsesAfter,
      entry.reservationId,
      entry.studySessionId,
      entry.orderId,
      entry.idempotencyKey,
      entry.note,
      entry.createdAt,
    );
  }

  findLedgerByIdempotencyKey(idempotencyKey) {
    return this.db.prepare(`
      SELECT
        id,
        entitlement_id AS entitlementId,
        user_id AS userId,
        event_type AS eventType,
        delta_minutes AS deltaMinutes,
        delta_uses AS deltaUses,
        balance_minutes_after AS balanceMinutesAfter,
        balance_uses_after AS balanceUsesAfter,
        reservation_id AS reservationId,
        study_session_id AS studySessionId,
        order_id AS orderId,
        idempotency_key AS idempotencyKey,
        created_at AS createdAt
      FROM entitlement_ledger
      WHERE idempotency_key = ?
    `).get(idempotencyKey);
  }
}
