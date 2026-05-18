import { db } from '../src/db.js';

const CORE_TABLES = [
  'app_meta',
  'users',
  'wechat_identities',
  'stores',
  'store_areas',
  'seats',
  'plans',
  'orders',
  'order_items',
  'user_entitlements',
  'reservations',
  'study_sessions',
  'entitlement_ledger',
  'access_devices',
  'access_codes',
  'access_events',
  'daily_store_stats',
];

function tableExists(tableName) {
  const row = db.prepare(`
    SELECT 1 AS exists_flag
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName);

  return Boolean(row);
}

console.log('Core table counts:');

for (const tableName of CORE_TABLES) {
  if (!tableExists(tableName)) {
    console.log(`${tableName}: missing`);
    continue;
  }

  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  console.log(`${tableName}: ${row.count}`);
}

db.close();
