import { BaseRepository } from './BaseRepository.js';

export class UserRepository extends BaseRepository {
  findById(userId) {
    return this.db.prepare(`
      SELECT id, nickname, avatar_url, phone, status, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(userId);
  }

  updateLastLogin(userId, at) {
    this.db.prepare(`
      UPDATE users
      SET last_login_at = ?, updated_at = ?
      WHERE id = ?
    `).run(at, at, userId);
  }
}
