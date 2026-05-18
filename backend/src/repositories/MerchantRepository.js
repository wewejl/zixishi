import { BaseRepository } from './BaseRepository.js';

export class MerchantRepository extends BaseRepository {
  getStoreOperationSummary({ storeId, from, to, now }) {
    const seatCounts = this.db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM seats
      WHERE store_id = ?
      GROUP BY status
    `).all(storeId);

    const activeSessions = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM study_sessions
      WHERE store_id = ? AND status = 'active'
    `).get(storeId);

    const reservations = this.db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS pending_payment,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status IN ('pending_payment', 'confirmed') AND start_at >= ? THEN 1 ELSE 0 END) AS upcoming
      FROM reservations
      WHERE store_id = ?
        AND start_at >= ?
        AND start_at < ?
    `).get(now, storeId, from, to);

    const sessions = this.db.prepare(`
      SELECT
        COUNT(*) AS completed_count,
        COALESCE(SUM(duration_minutes), 0) AS completed_minutes
      FROM study_sessions
      WHERE store_id = ?
        AND status = 'completed'
        AND ended_at >= ?
        AND ended_at < ?
    `).get(storeId, from, to);

    const orders = this.db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) AS paid_count,
        COALESCE(SUM(o.paid_cents), 0) AS revenue_cents
      FROM orders o
      LEFT JOIN reservations r ON r.order_id = o.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN plans p ON p.id = oi.plan_id
      WHERE o.status = 'paid'
        AND o.paid_at >= ?
        AND o.paid_at < ?
        AND (
          r.store_id = ?
          OR p.available_store_id = ?
          OR (r.id IS NULL AND oi.id IS NOT NULL AND p.available_store_id IS NULL)
        )
    `).get(from, to, storeId, storeId);

    const pendingOrders = this.db.prepare(`
      SELECT COUNT(DISTINCT o.id) AS count
      FROM orders o
      LEFT JOIN reservations r ON r.order_id = o.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN plans p ON p.id = oi.plan_id
      WHERE o.status = 'pending_payment'
        AND o.created_at >= ?
        AND o.created_at < ?
        AND (
          r.store_id = ?
          OR p.available_store_id = ?
          OR (r.id IS NULL AND oi.id IS NOT NULL AND p.available_store_id IS NULL)
        )
    `).get(from, to, storeId, storeId);

    const access = this.db.prepare(`
      SELECT
        SUM(CASE WHEN result = 'granted' THEN 1 ELSE 0 END) AS granted,
        SUM(CASE WHEN result = 'denied' THEN 1 ELSE 0 END) AS denied
      FROM access_events
      WHERE store_id = ?
        AND occurred_at >= ?
        AND occurred_at < ?
    `).get(storeId, from, to);

    const members = this.db.prepare(`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_entitlements
      WHERE status = 'active'
        AND valid_from <= ?
        AND (valid_until IS NULL OR valid_until >= ?)
        AND (store_id IS NULL OR store_id = ?)
    `).get(now, now, storeId);

    return {
      seatCounts,
      activeSessions,
      reservations,
      sessions,
      orders,
      pendingOrders,
      access,
      members,
    };
  }

  listMembers({ storeId, keyword = null, status = null, limit, cursor = null, now }) {
    const params = [storeId, now, now, storeId];
    const clauses = [`
      EXISTS (
        SELECT 1
        FROM reservations r
        WHERE r.user_id = u.id AND r.store_id = ?
      )
      OR EXISTS (
        SELECT 1
        FROM user_entitlements ue
        WHERE ue.user_id = u.id
          AND ue.status = 'active'
          AND ue.valid_from <= ?
          AND (ue.valid_until IS NULL OR ue.valid_until >= ?)
          AND (ue.store_id IS NULL OR ue.store_id = ?)
      )
    `];

    if (status) {
      clauses.push('u.status = ?');
      params.push(status);
    }

    if (keyword) {
      clauses.push('(u.nickname LIKE ? OR u.phone LIKE ? OR u.id LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }

    if (cursor) {
      clauses.push('(u.created_at < ? OR (u.created_at = ? AND u.id < ?))');
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    params.push(limit + 1);

    return this.db.prepare(`
      SELECT
        u.id,
        u.nickname,
        u.avatar_url,
        u.phone,
        u.status,
        u.last_login_at,
        u.created_at,
        COALESCE((
          SELECT SUM(duration_minutes)
          FROM study_sessions ss
          WHERE ss.user_id = u.id AND ss.store_id = ? AND ss.status = 'completed'
        ), 0) AS total_study_minutes,
        (
          SELECT MAX(start_at)
          FROM reservations lr
          WHERE lr.user_id = u.id AND lr.store_id = ?
        ) AS last_reservation_at,
        COALESCE((
          SELECT SUM(remaining_minutes)
          FROM user_entitlements ue
          WHERE ue.user_id = u.id
            AND ue.status = 'active'
            AND ue.valid_from <= ?
            AND (ue.valid_until IS NULL OR ue.valid_until >= ?)
            AND (ue.store_id IS NULL OR ue.store_id = ?)
        ), 0) AS remaining_minutes,
        EXISTS (
          SELECT 1
          FROM user_entitlements pe
          WHERE pe.user_id = u.id
            AND pe.status = 'active'
            AND pe.entitlement_type = 'period'
            AND pe.valid_from <= ?
            AND (pe.valid_until IS NULL OR pe.valid_until >= ?)
            AND (pe.store_id IS NULL OR pe.store_id = ?)
        ) AS is_long_term_member,
        COALESCE((
          SELECT SUM(o.paid_cents)
          FROM orders o
          LEFT JOIN reservations r ON r.order_id = o.id
          LEFT JOIN order_items oi ON oi.order_id = o.id
          LEFT JOIN plans p ON p.id = oi.plan_id
          WHERE o.user_id = u.id
            AND o.status = 'paid'
            AND (
              r.store_id = ?
              OR p.available_store_id = ?
              OR (r.id IS NULL AND oi.id IS NOT NULL AND p.available_store_id IS NULL)
            )
        ), 0) AS total_paid_cents
      FROM users u
      WHERE ${clauses.map((clause) => `(${clause})`).join(' AND ')}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ?
    `).all(
      storeId,
      storeId,
      now,
      now,
      storeId,
      now,
      now,
      storeId,
      storeId,
      storeId,
      ...params,
    );
  }

  listAccessEvents({ storeId, result = null, limit, cursor = null }) {
    const params = [storeId];
    const clauses = ['ae.store_id = ?'];

    if (result) {
      clauses.push('ae.result = ?');
      params.push(result);
    }

    if (cursor) {
      clauses.push('(ae.occurred_at < ? OR (ae.occurred_at = ? AND ae.id < ?))');
      params.push(cursor.occurredAt, cursor.occurredAt, cursor.id);
    }

    params.push(limit + 1);

    return this.db.prepare(`
      SELECT
        ae.id,
        ae.store_id,
        ae.device_id,
        ad.name AS device_name,
        ae.user_id,
        u.nickname,
        u.phone,
        ae.reservation_id,
        ae.study_session_id,
        ae.direction,
        ae.result,
        ae.reason,
        ae.occurred_at,
        ae.created_at
      FROM access_events ae
      LEFT JOIN access_devices ad ON ad.id = ae.device_id
      LEFT JOIN users u ON u.id = ae.user_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY ae.occurred_at DESC, ae.id DESC
      LIMIT ?
    `).all(...params);
  }

  listReservations({ storeId, status = null, limit, cursor = null }) {
    const params = [storeId];
    const clauses = ['r.store_id = ?'];

    if (status) {
      clauses.push('r.status = ?');
      params.push(status);
    }

    if (cursor) {
      clauses.push('(r.start_at < ? OR (r.start_at = ? AND r.id < ?))');
      params.push(cursor.startAt, cursor.startAt, cursor.id);
    }

    params.push(limit + 1);

    return this.db.prepare(`
      SELECT
        r.id,
        r.user_id,
        u.nickname,
        u.phone,
        r.seat_id,
        s.seat_no,
        a.name AS area_name,
        r.start_at,
        r.end_at,
        r.status,
        r.order_id,
        r.entitlement_id,
        r.checked_in_at,
        r.checked_out_at,
        r.created_at
      FROM reservations r
      JOIN users u ON u.id = r.user_id
      JOIN seats s ON s.id = r.seat_id
      JOIN store_areas a ON a.id = r.area_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY r.start_at DESC, r.id DESC
      LIMIT ?
    `).all(...params);
  }

  listOrders({ storeId, status = null, limit, cursor = null }) {
    const params = [storeId, storeId];
    const clauses = [`
      r.store_id = ?
      OR p.available_store_id = ?
      OR (r.id IS NULL AND oi.id IS NOT NULL AND p.available_store_id IS NULL)
    `];

    if (status) {
      clauses.push('o.status = ?');
      params.push(status);
    }

    if (cursor) {
      clauses.push('(o.created_at < ? OR (o.created_at = ? AND o.id < ?))');
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    params.push(limit + 1);

    return this.db.prepare(`
      SELECT
        o.id,
        o.user_id,
        u.nickname,
        u.phone,
        o.order_no,
        o.status,
        o.amount_cents,
        o.paid_cents,
        o.currency,
        o.pay_channel,
        o.paid_at,
        o.created_at,
        p.name AS plan_name,
        r.id AS reservation_id,
        r.start_at AS reservation_start_at,
        r.end_at AS reservation_end_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN reservations r ON r.order_id = o.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN plans p ON p.id = oi.plan_id
      WHERE ${clauses.map((clause) => `(${clause})`).join(' AND ')}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ?
    `).all(...params);
  }
}
