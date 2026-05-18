import { BaseRepository } from './BaseRepository.js';

export class UserRepository extends BaseRepository {
  findById(userId) {
    return this.db.prepare(`
      SELECT id, nickname, avatar_url, phone, status, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(userId);
  }

  findWechatIdentity({ appId, openid }) {
    return this.db.prepare(`
      SELECT wi.*, u.status AS user_status
      FROM wechat_identities wi
      JOIN users u ON u.id = wi.user_id
      WHERE wi.app_id = ? AND wi.openid = ?
      LIMIT 1
    `).get(appId, openid);
  }

  findWechatOpenidForUser({ userId, appId }) {
    return this.db.prepare(`
      SELECT openid
      FROM wechat_identities
      WHERE user_id = ? AND app_id = ?
      LIMIT 1
    `).get(userId, appId)?.openid || null;
  }

  createUser({ id, nickname, avatarUrl = null, phone = null, status = 'active', at }) {
    this.db.prepare(`
      INSERT INTO users (
        id, nickname, avatar_url, phone, status, last_login_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nickname, avatarUrl, phone, status, at, at, at);

    return this.findById(id);
  }

  createWechatIdentity({ id, userId, appId, openid, unionid = null, at }) {
    this.db.prepare(`
      INSERT INTO wechat_identities (
        id, user_id, app_id, openid, unionid, last_seen_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, appId, openid, unionid, at, at, at);

    return this.findWechatIdentity({ appId, openid });
  }

  updateWechatIdentitySeen({ appId, openid, unionid = null, at }) {
    this.db.prepare(`
      UPDATE wechat_identities
      SET unionid = COALESCE(?, unionid),
        last_seen_at = ?,
        updated_at = ?
      WHERE app_id = ? AND openid = ?
    `).run(unionid, at, at, appId, openid);
  }

  updateLastLogin(userId, at) {
    this.db.prepare(`
      UPDATE users
      SET last_login_at = ?, updated_at = ?
      WHERE id = ?
    `).run(at, at, userId);
  }
}
