import { BaseRepository } from './BaseRepository.js';

const OCCUPYING_RESERVATION_STATUSES = ['pending_payment', 'confirmed', 'checked_in'];

export class SeatRepository extends BaseRepository {
  listByStore(storeId) {
    return this.db.prepare(`
      SELECT
        s.id,
        s.store_id,
        s.area_id,
        s.seat_no,
        s.seat_type,
        s.status,
        s.features_json,
        a.name AS area_name,
        a.area_type
      FROM seats s
      JOIN store_areas a ON a.id = s.area_id
      WHERE s.store_id = ?
        AND a.status = 'active'
      ORDER BY a.sort_order ASC, s.seat_no ASC
    `).all(storeId);
  }

  listReservationConflicts(storeId, startAt, endAt) {
    return this.db.prepare(`
      SELECT seat_id
      FROM reservations
      WHERE store_id = ?
        AND status IN (${OCCUPYING_RESERVATION_STATUSES.map(() => '?').join(', ')})
        AND datetime(start_at) < datetime(?)
        AND datetime(end_at) > datetime(?)
      GROUP BY seat_id
    `).all(storeId, ...OCCUPYING_RESERVATION_STATUSES, endAt, startAt);
  }

  listActiveSessionConflicts(storeId, startAt, endAt) {
    return this.db.prepare(`
      SELECT seat_id
      FROM study_sessions
      WHERE store_id = ?
        AND status = 'active'
        AND datetime(started_at) < datetime(?)
        AND (ended_at IS NULL OR datetime(ended_at) > datetime(?))
      GROUP BY seat_id
    `).all(storeId, endAt, startAt);
  }

  countActiveSessions(storeId) {
    return this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM study_sessions
      WHERE store_id = ? AND status = 'active'
    `).get(storeId)?.count || 0;
  }

  findById(seatId) {
    return this.db.prepare(`SELECT * FROM seats WHERE id = ? LIMIT 1`).get(seatId);
  }

  updateSeatCode({ seatId, storeId, seatNo, at }) {
    const result = this.db.prepare(`
      UPDATE seats
      SET seat_no = ?, updated_at = ?
      WHERE id = ? AND store_id = ?
    `).run(seatNo, at, seatId, storeId);
    return result.changes > 0;
  }

  updateSeatStatus({ seatId, storeId, status, at }) {
    const result = this.db.prepare(`
      UPDATE seats
      SET status = ?, updated_at = ?
      WHERE id = ? AND store_id = ?
    `).run(status, at, seatId, storeId);
    return result.changes > 0;
  }

  existsSeatNoInStore({ storeId, seatNo, excludeSeatId = null }) {
    if (excludeSeatId) {
      const row = this.db.prepare(`
        SELECT 1
        FROM seats
        WHERE store_id = ? AND seat_no = ? AND id != ?
        LIMIT 1
      `).get(storeId, seatNo, excludeSeatId);
      return Boolean(row);
    }

    const row = this.db.prepare(`
      SELECT 1
      FROM seats
      WHERE store_id = ? AND seat_no = ?
      LIMIT 1
    `).get(storeId, seatNo);
    return Boolean(row);
  }
}
