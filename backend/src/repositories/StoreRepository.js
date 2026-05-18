import { BaseRepository } from './BaseRepository.js';

export class StoreRepository extends BaseRepository {
  findById(storeId) {
    return this.db.prepare(`
      SELECT id, name, address, latitude, longitude, timezone, business_hours_json, status, created_at, updated_at
      FROM stores
      WHERE id = ?
    `).get(storeId);
  }

  findDailyStats(storeId, date) {
    return this.db.prepare(`
      SELECT *
      FROM daily_store_stats
      WHERE store_id = ? AND stat_date = ?
    `).get(storeId, date);
  }
}
