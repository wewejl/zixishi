import { BaseRepository } from './BaseRepository.js';

export class AccessRepository extends BaseRepository {
  findActiveDevice({ storeId, deviceId }) {
    return this.db.prepare(`
      SELECT *
      FROM access_devices
      WHERE id = ? AND store_id = ? AND status = 'active'
      LIMIT 1
    `).get(deviceId, storeId);
  }

  findCurrentReservation({ userId, storeId, now, windowStart, windowEnd }) {
    return this.db.prepare(`
      SELECT *
      FROM reservations
      WHERE user_id = ?
        AND store_id = ?
        AND status IN ('confirmed', 'checked_in')
        AND start_at <= ?
        AND end_at >= ?
      ORDER BY start_at ASC
      LIMIT 1
    `).get(userId, storeId, windowEnd, windowStart);
  }

  findActiveStudySession({ userId, storeId }) {
    return this.db.prepare(`
      SELECT *
      FROM study_sessions
      WHERE user_id = ?
        AND store_id = ?
        AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `).get(userId, storeId);
  }

  findActiveLongTermCode({ userId, storeId, now }) {
    return this.db.prepare(`
      SELECT *
      FROM access_codes
      WHERE user_id = ?
        AND store_id = ?
        AND code_type = 'long_term'
        AND status = 'active'
        AND valid_from <= ?
        AND valid_until >= ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, storeId, now, now);
  }

  rotateLongTermCodes({ userId, storeId, rotatedAt }) {
    this.db.prepare(`
      UPDATE access_codes
      SET status = 'rotated', updated_at = ?
      WHERE user_id = ?
        AND store_id = ?
        AND code_type = 'long_term'
        AND status = 'active'
    `).run(rotatedAt, userId, storeId);
  }

  createLongTermCode(code) {
    this.db.prepare(`
      INSERT INTO access_codes (
        id, user_id, store_id, reservation_id, code_type, code_hash, code_suffix,
        valid_from, valid_until, max_uses, used_count, status, rotated_from_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, 'long_term', ?, ?, ?, ?, NULL, 0, 'active', ?, ?, ?)
    `).run(
      code.id,
      code.userId,
      code.storeId,
      code.codeHash,
      code.codeSuffix,
      code.validFrom,
      code.validUntil,
      code.rotatedFromId,
      code.createdAt,
      code.updatedAt,
    );

    return this.findActiveLongTermCode({
      userId: code.userId,
      storeId: code.storeId,
      now: code.createdAt,
    });
  }

  incrementCodeUse(codeId, at) {
    this.db.prepare(`
      UPDATE access_codes
      SET used_count = used_count + 1, updated_at = ?
      WHERE id = ?
    `).run(at, codeId);
  }

  createAccessEvent(event) {
    this.db.prepare(`
      INSERT INTO access_events (
        id, store_id, device_id, user_id, access_code_id, reservation_id,
        study_session_id, direction, result, reason, occurred_at, raw_payload_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.storeId,
      event.deviceId,
      event.userId,
      event.accessCodeId,
      event.reservationId,
      event.studySessionId,
      event.direction,
      event.result,
      event.reason,
      event.occurredAt,
      event.rawPayloadJson,
      event.createdAt,
    );
  }
}
