import { BaseRepository } from './BaseRepository.js';

export class PlanRepository extends BaseRepository {
  listActive({ storeId = null } = {}) {
    const params = [];
    let storeFilter = '';

    if (storeId) {
      storeFilter = 'AND (available_store_id IS NULL OR available_store_id = ?)';
      params.push(storeId);
    }

    return this.db.prepare(`
      SELECT *
      FROM plans
      WHERE status = 'active'
      ${storeFilter}
      ORDER BY sort_order ASC, price_cents ASC, id ASC
    `).all(...params);
  }

  findActiveById(planId, { storeId = null } = {}) {
    const params = [planId];
    let storeFilter = '';

    if (storeId) {
      storeFilter = 'AND (available_store_id IS NULL OR available_store_id = ?)';
      params.push(storeId);
    }

    return this.db.prepare(`
      SELECT *
      FROM plans
      WHERE id = ?
        AND status = 'active'
        ${storeFilter}
      LIMIT 1
    `).get(...params);
  }
}
