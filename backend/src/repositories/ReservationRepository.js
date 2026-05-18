import { BaseRepository } from './BaseRepository.js';

const ACTIVE_RESERVATION_STATUSES = ['pending_payment', 'confirmed', 'checked_in'];

export class ReservationRepository extends BaseRepository {
  findSeatById(seatId) {
    return this.db.prepare(`
      SELECT
        seats.id,
        seats.store_id AS storeId,
        seats.area_id AS areaId,
        seats.seat_no AS seatCode,
        seats.status,
        stores.business_hours_json AS businessHoursJson,
        stores.timezone
      FROM seats
      JOIN stores ON stores.id = seats.store_id
      WHERE seats.id = ?
    `).get(seatId);
  }

  findSeatTimeConflict({ seatId, startAt, endAt }) {
    return this.db.prepare(`
      SELECT id, status
      FROM reservations
      WHERE seat_id = ?
        AND status IN (${ACTIVE_RESERVATION_STATUSES.map(() => '?').join(', ')})
        AND start_at < ?
        AND end_at > ?
      LIMIT 1
    `).get(seatId, ...ACTIVE_RESERVATION_STATUSES, endAt, startAt);
  }

  findUserTimeConflict({ userId, startAt, endAt }) {
    return this.db.prepare(`
      SELECT id, status
      FROM reservations
      WHERE user_id = ?
        AND status IN (${ACTIVE_RESERVATION_STATUSES.map(() => '?').join(', ')})
        AND start_at < ?
        AND end_at > ?
      LIMIT 1
    `).get(userId, ...ACTIVE_RESERVATION_STATUSES, endAt, startAt);
  }

  create(reservation) {
    this.db.prepare(`
      INSERT INTO reservations (
        id, user_id, store_id, area_id, seat_id, start_at, end_at, status, source,
        entitlement_id, order_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reservation.id,
      reservation.userId,
      reservation.storeId,
      reservation.areaId,
      reservation.seatId,
      reservation.startAt,
      reservation.endAt,
      reservation.status,
      reservation.source,
      reservation.entitlementId,
      reservation.orderId,
      reservation.createdAt,
      reservation.updatedAt,
    );

    return this.findById(reservation.id);
  }

  findCurrentForUser(userId, now) {
    return this.db.prepare(`
      SELECT ${reservationSelectFields()}
      FROM reservations
      JOIN seats ON seats.id = reservations.seat_id
      WHERE reservations.user_id = ?
        AND reservations.status IN ('pending_payment', 'confirmed', 'checked_in')
      ORDER BY
        CASE
          WHEN reservations.status = 'checked_in' THEN 0
          WHEN reservations.status = 'confirmed' AND reservations.start_at <= ? AND reservations.end_at >= ? THEN 1
          WHEN reservations.start_at > ? THEN 2
          ELSE 3
        END,
        reservations.start_at ASC
      LIMIT 1
    `).get(userId, now, now, now);
  }

  listForUser({ userId, status, limit, cursor }) {
    const params = [userId];
    const clauses = ['reservations.user_id = ?'];

    if (status) {
      clauses.push('reservations.status = ?');
      params.push(status);
    }

    if (cursor) {
      clauses.push('(reservations.start_at < ? OR (reservations.start_at = ? AND reservations.id < ?))');
      params.push(cursor.startAt, cursor.startAt, cursor.id);
    }

    params.push(limit + 1);

    return this.db.prepare(`
      SELECT ${reservationSelectFields()}
      FROM reservations
      JOIN seats ON seats.id = reservations.seat_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY reservations.start_at DESC, reservations.id DESC
      LIMIT ?
    `).all(...params);
  }

  findById(id) {
    return this.db.prepare(`
      SELECT ${reservationSelectFields()}
      FROM reservations
      JOIN seats ON seats.id = reservations.seat_id
      WHERE reservations.id = ?
    `).get(id);
  }

  updateStatusForCancel({ id, cancelledAt, reason }) {
    this.db.prepare(`
      UPDATE reservations
      SET status = 'cancelled',
          cancelled_at = ?,
          cancel_reason = ?,
          updated_at = ?
      WHERE id = ?
    `).run(cancelledAt, reason, cancelledAt, id);

    return this.findById(id);
  }

  markCheckedIn({ id, checkedInAt }) {
    this.db.prepare(`
      UPDATE reservations
      SET status = 'checked_in',
          checked_in_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(checkedInAt, checkedInAt, id);

    return this.findById(id);
  }

  markCompleted({ id, checkedOutAt }) {
    this.db.prepare(`
      UPDATE reservations
      SET status = 'completed',
          checked_out_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(checkedOutAt, checkedOutAt, id);

    return this.findById(id);
  }
}

function reservationSelectFields() {
  return `
    reservations.id,
    reservations.user_id AS userId,
    reservations.store_id AS storeId,
    reservations.area_id AS areaId,
    reservations.seat_id AS seatId,
    seats.seat_no AS seatCode,
    reservations.start_at AS startAt,
    reservations.end_at AS endAt,
    reservations.status,
    reservations.entitlement_id AS entitlementId,
    reservations.order_id AS orderId,
    reservations.cancelled_at AS cancelledAt,
    reservations.cancel_reason AS cancelReason,
    reservations.checked_in_at AS checkedInAt,
    reservations.checked_out_at AS checkedOutAt,
    reservations.created_at AS createdAt,
    reservations.updated_at AS updatedAt
  `;
}
