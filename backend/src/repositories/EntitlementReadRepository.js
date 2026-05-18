import { BaseRepository } from './BaseRepository.js';

export class EntitlementReadRepository extends BaseRepository {
  listActiveForUser(userId, at) {
    return this.db.prepare(`
      SELECT
        ue.id,
        ue.user_id,
        ue.plan_id,
        ue.entitlement_type,
        ue.store_id,
        ue.total_minutes,
        ue.remaining_minutes,
        ue.total_uses,
        ue.remaining_uses,
        ue.valid_from,
        ue.valid_until,
        ue.status,
        p.name AS plan_name,
        p.plan_type
      FROM user_entitlements ue
      JOIN plans p ON p.id = ue.plan_id
      WHERE ue.user_id = ?
        AND ue.status = 'active'
        AND datetime(ue.valid_from) <= datetime(?)
        AND (ue.valid_until IS NULL OR datetime(ue.valid_until) > datetime(?))
      ORDER BY
        CASE ue.entitlement_type WHEN 'period' THEN 0 WHEN 'minutes' THEN 1 ELSE 2 END,
        ue.valid_until IS NULL,
        ue.valid_until ASC
    `).all(userId, at, at);
  }
}
