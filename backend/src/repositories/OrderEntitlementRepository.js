import { BaseRepository } from './BaseRepository.js';

export class OrderEntitlementRepository extends BaseRepository {
  findByOrderId(orderId) {
    return this.db.prepare(`
      SELECT *
      FROM user_entitlements
      WHERE order_id = ?
      ORDER BY created_at ASC
      LIMIT 1
    `).get(orderId);
  }

  createEntitlement(entitlement) {
    this.db.prepare(`
      INSERT INTO user_entitlements (
        id, user_id, plan_id, order_id, entitlement_type, store_id,
        total_minutes, remaining_minutes, total_uses, remaining_uses,
        valid_from, valid_until, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      entitlement.id,
      entitlement.userId,
      entitlement.planId,
      entitlement.orderId,
      entitlement.entitlementType,
      entitlement.storeId,
      entitlement.totalMinutes,
      entitlement.remainingMinutes,
      entitlement.totalUses,
      entitlement.remainingUses,
      entitlement.validFrom,
      entitlement.validUntil,
      entitlement.createdAt,
      entitlement.updatedAt,
    );

    return this.findByOrderId(entitlement.orderId);
  }

  createLedger(ledger) {
    this.db.prepare(`
      INSERT INTO entitlement_ledger (
        id, entitlement_id, user_id, event_type, delta_minutes, delta_uses,
        balance_minutes_after, balance_uses_after, reservation_id, study_session_id,
        order_id, idempotency_key, note, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(idempotency_key) DO NOTHING
    `).run(
      ledger.id,
      ledger.entitlementId,
      ledger.userId,
      ledger.eventType,
      ledger.deltaMinutes,
      ledger.deltaUses,
      ledger.balanceMinutesAfter,
      ledger.balanceUsesAfter,
      ledger.reservationId,
      ledger.studySessionId,
      ledger.orderId,
      ledger.idempotencyKey,
      ledger.note,
      ledger.createdAt,
    );
  }

  findActivePeriodEntitlement({ userId, storeId, now }) {
    return this.db.prepare(`
      SELECT ue.*, p.name AS plan_name
      FROM user_entitlements ue
      JOIN plans p ON p.id = ue.plan_id
      WHERE ue.user_id = ?
        AND ue.status = 'active'
        AND ue.entitlement_type = 'period'
        AND (ue.store_id IS NULL OR ue.store_id = ?)
        AND ue.valid_from <= ?
        AND (ue.valid_until IS NULL OR ue.valid_until >= ?)
      ORDER BY ue.valid_until DESC
      LIMIT 1
    `).get(userId, storeId, now, now);
  }
}
