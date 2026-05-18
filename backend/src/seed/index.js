import { addDaysIso, nowIso } from '../utils/time.js';

const APP_ID = 'mock_miniapp';

export function seedDatabase(db) {
  const createdAt = nowIso();
  const monthUntil = addDaysIso(createdAt, 30);

  db.exec('BEGIN IMMEDIATE');
  try {
    seedStores(db, createdAt);
    seedAreas(db, createdAt);
    seedSeats(db, createdAt);
    seedPlans(db, createdAt);
    seedUsers(db, createdAt);
    seedWechatIdentities(db, createdAt);
    seedEntitlements(db, createdAt, monthUntil);
    seedAccessDevices(db, createdAt);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function seedStores(db, at) {
  db.prepare(`
    INSERT INTO stores (
      id, name, address, latitude, longitude, timezone, business_hours_json, status, created_at, updated_at
    )
    VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      timezone = excluded.timezone,
      business_hours_json = excluded.business_hours_json,
      status = excluded.status,
      updated_at = excluded.updated_at
  `).run(
    'store_default',
    '静谧空间旗舰店',
    '上海市示例路 88 号 2F',
    'Asia/Shanghai',
    '{"mon":["08:00","23:00"],"tue":["08:00","23:00"],"wed":["08:00","23:00"],"thu":["08:00","23:00"],"fri":["08:00","23:00"],"sat":["09:00","23:30"],"sun":["09:00","23:30"]}',
    'open',
    at,
    at,
  );
}

function seedAreas(db, at) {
  const statement = db.prepare(`
    INSERT INTO store_areas (id, store_id, name, area_type, sort_order, status, created_at, updated_at)
    VALUES (?, 'store_default', ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      area_type = excluded.area_type,
      sort_order = excluded.sort_order,
      status = excluded.status,
      updated_at = excluded.updated_at
  `);

  [
    ['area_common', '普通区', 'common', 10],
    ['area_quiet', '安静区', 'quiet', 20],
    ['area_vip', 'VIP 区', 'vip', 30],
  ].forEach((area) => statement.run(area[0], area[1], area[2], area[3], at, at));
}

function seedSeats(db, at) {
  const statement = db.prepare(`
    INSERT INTO seats (id, store_id, area_id, seat_no, seat_type, status, features_json, created_at, updated_at)
    VALUES (?, 'store_default', ?, ?, ?, 'available', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      area_id = excluded.area_id,
      seat_no = excluded.seat_no,
      seat_type = excluded.seat_type,
      status = excluded.status,
      features_json = excluded.features_json,
      updated_at = excluded.updated_at
  `);

  for (let index = 1; index <= 12; index += 1) {
    const seatNo = `A${String(index).padStart(2, '0')}`;
    statement.run(`seat_${seatNo.toLowerCase()}`, 'area_common', seatNo, 'standard', '["power"]', at, at);
  }

  for (let index = 1; index <= 8; index += 1) {
    const seatNo = `Q${String(index).padStart(2, '0')}`;
    statement.run(`seat_${seatNo.toLowerCase()}`, 'area_quiet', seatNo, 'standard', '["quiet","power"]', at, at);
  }

  for (let index = 1; index <= 4; index += 1) {
    const seatNo = `V${String(index).padStart(2, '0')}`;
    statement.run(`seat_${seatNo.toLowerCase()}`, 'area_vip', seatNo, 'vip', '["quiet","power","wide_desk"]', at, at);
  }
}

function seedPlans(db, at) {
  const statement = db.prepare(`
    INSERT INTO plans (
      id, name, plan_type, price_cents, currency, minutes_total, uses_total, valid_days,
      available_store_id, status, sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'CNY', ?, ?, ?, NULL, 'active', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      plan_type = excluded.plan_type,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      minutes_total = excluded.minutes_total,
      uses_total = excluded.uses_total,
      valid_days = excluded.valid_days,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at
  `);

  [
    ['plan_single_day', '单次自习票', 'single_use', 3900, null, 1, 7, 10],
    ['plan_20h', '20 小时卡', 'minutes_pack', 19900, 1200, null, 90, 20],
    ['plan_month', '月卡', 'period_pass', 49900, null, null, 30, 30],
  ].forEach((plan) => statement.run(...plan, at, at));
}

function seedUsers(db, at) {
  const statement = db.prepare(`
    INSERT INTO users (id, nickname, avatar_url, phone, status, last_login_at, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nickname = excluded.nickname,
      phone = excluded.phone,
      status = excluded.status,
      updated_at = excluded.updated_at
  `);

  [
    ['user_mock_001', '测试用户A', '13800000001', 'active'],
    ['user_mock_002', '测试用户B', '13800000002', 'active'],
    ['user_disabled_001', '禁用用户', '13800000003', 'disabled'],
  ].forEach((user) => statement.run(...user, at, at));
}

function seedWechatIdentities(db, at) {
  const statement = db.prepare(`
    INSERT INTO wechat_identities (
      id, user_id, app_id, openid, unionid, session_key_version, last_seen_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, NULL, 1, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      app_id = excluded.app_id,
      openid = excluded.openid,
      updated_at = excluded.updated_at
  `);

  [
    ['wx_mock_001', 'user_mock_001', APP_ID, 'mock_openid_001'],
    ['wx_mock_002', 'user_mock_002', APP_ID, 'mock_openid_002'],
  ].forEach((identity) => statement.run(...identity, at, at));
}

function seedEntitlements(db, at, monthUntil) {
  const entitlementStatement = db.prepare(`
    INSERT INTO user_entitlements (
      id, user_id, plan_id, order_id, entitlement_type, store_id,
      total_minutes, remaining_minutes, total_uses, remaining_uses,
      valid_from, valid_until, status, created_at, updated_at
    )
    VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  entitlementStatement.run(
    'ent_mock_20h_001',
    'user_mock_001',
    'plan_20h',
    'minutes',
    1200,
    1200,
    null,
    null,
    at,
    addDaysIso(at, 90),
    at,
    at,
  );
  entitlementStatement.run(
    'ent_mock_month_001',
    'user_mock_002',
    'plan_month',
    'period',
    null,
    null,
    null,
    null,
    at,
    monthUntil,
    at,
    at,
  );

  const ledgerStatement = db.prepare(`
    INSERT INTO entitlement_ledger (
      id, entitlement_id, user_id, event_type, delta_minutes, delta_uses,
      balance_minutes_after, balance_uses_after, idempotency_key, note, created_at
    )
    VALUES (?, ?, ?, 'grant', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(idempotency_key) DO NOTHING
  `);

  ledgerStatement.run(
    'ledger_seed_20h_001',
    'ent_mock_20h_001',
    'user_mock_001',
    1200,
    0,
    1200,
    null,
    'seed:ent_mock_20h_001',
    'Seed 20 hour entitlement',
    at,
  );
  ledgerStatement.run(
    'ledger_seed_month_001',
    'ent_mock_month_001',
    'user_mock_002',
    0,
    0,
    null,
    null,
    'seed:ent_mock_month_001',
    'Seed monthly entitlement',
    at,
  );
}

function seedAccessDevices(db, at) {
  db.prepare(`
    INSERT INTO access_devices (
      id, store_id, name, device_type, device_code, secret_hash, status, last_seen_at, config_json, created_at, updated_at
    )
    VALUES (
      'access_device_main', 'store_default', '主入口门禁', 'door_lock', 'MAIN_DOOR_001',
      NULL, 'active', NULL, '{"unlockTimeoutSeconds":5}', ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      device_type = excluded.device_type,
      device_code = excluded.device_code,
      status = excluded.status,
      config_json = excluded.config_json,
      updated_at = excluded.updated_at
  `).run(at, at);
}
