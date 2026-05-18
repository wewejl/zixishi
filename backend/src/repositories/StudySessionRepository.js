import { BaseRepository } from './BaseRepository.js';

export class StudySessionRepository extends BaseRepository {
  findActiveForUser(userId) {
    return this.db.prepare(`
      SELECT ${sessionSelectFields()}
      FROM study_sessions
      JOIN seats ON seats.id = study_sessions.seat_id
      LEFT JOIN reservations ON reservations.id = study_sessions.reservation_id
      WHERE study_sessions.user_id = ?
        AND study_sessions.status = 'active'
      ORDER BY study_sessions.started_at DESC
      LIMIT 1
    `).get(userId);
  }

  findByReservationId(reservationId) {
    return this.db.prepare(`
      SELECT ${sessionSelectFields()}
      FROM study_sessions
      JOIN seats ON seats.id = study_sessions.seat_id
      LEFT JOIN reservations ON reservations.id = study_sessions.reservation_id
      WHERE study_sessions.reservation_id = ?
      LIMIT 1
    `).get(reservationId);
  }

  findById(id) {
    return this.db.prepare(`
      SELECT ${sessionSelectFields()}
      FROM study_sessions
      JOIN seats ON seats.id = study_sessions.seat_id
      LEFT JOIN reservations ON reservations.id = study_sessions.reservation_id
      WHERE study_sessions.id = ?
    `).get(id);
  }

  create(session) {
    this.db.prepare(`
      INSERT INTO study_sessions (
        id, user_id, store_id, area_id, seat_id, reservation_id, started_at,
        ended_at, duration_minutes, status, settlement_status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 'active', 'pending', ?, ?)
    `).run(
      session.id,
      session.userId,
      session.storeId,
      session.areaId,
      session.seatId,
      session.reservationId,
      session.startedAt,
      session.createdAt,
      session.updatedAt,
    );

    return this.findById(session.id);
  }

  complete({ id, endedAt, durationMinutes }) {
    this.db.prepare(`
      UPDATE study_sessions
      SET status = 'completed',
          settlement_status = 'settled',
          ended_at = ?,
          duration_minutes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(endedAt, durationMinutes, endedAt, id);

    return this.findById(id);
  }

  getTodayStudyMinutes({ userId, dayStart, dayEnd }) {
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN status = 'active' THEN CAST((julianday(?) - julianday(started_at)) * 24 * 60 AS INTEGER)
          ELSE duration_minutes
        END
      ), 0) AS minutes
      FROM study_sessions
      WHERE user_id = ?
        AND started_at >= ?
        AND started_at < ?
        AND status IN ('active', 'completed')
    `).get(new Date().toISOString(), userId, dayStart, dayEnd);

    return row.minutes;
  }
}

function sessionSelectFields() {
  return `
    study_sessions.id,
    study_sessions.user_id AS userId,
    study_sessions.store_id AS storeId,
    study_sessions.area_id AS areaId,
    study_sessions.seat_id AS seatId,
    seats.seat_no AS seatCode,
    study_sessions.reservation_id AS reservationId,
    reservations.end_at AS endsAt,
    study_sessions.started_at AS startedAt,
    study_sessions.ended_at AS endedAt,
    study_sessions.duration_minutes AS durationMinutes,
    study_sessions.status,
    study_sessions.settlement_status AS settlementStatus,
    study_sessions.created_at AS createdAt,
    study_sessions.updated_at AS updatedAt
  `;
}
