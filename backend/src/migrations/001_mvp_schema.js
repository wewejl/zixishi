export function migrateMvpSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT,
      avatar_url TEXT,
      phone TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wechat_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      openid TEXT NOT NULL,
      unionid TEXT,
      session_key_version INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
      business_hours_json TEXT,
      status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'maintenance')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_areas (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      area_type TEXT NOT NULL CHECK (area_type IN ('quiet', 'vip', 'room', 'common')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      seat_no TEXT NOT NULL,
      seat_type TEXT NOT NULL CHECK (seat_type IN ('standard', 'vip', 'room')),
      status TEXT NOT NULL CHECK (status IN ('available', 'locked', 'maintenance', 'disabled')),
      features_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (area_id) REFERENCES store_areas(id)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan_type TEXT NOT NULL CHECK (plan_type IN ('single_use', 'minutes_pack', 'period_pass')),
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      currency TEXT NOT NULL DEFAULT 'CNY',
      minutes_total INTEGER,
      uses_total INTEGER,
      valid_days INTEGER,
      available_store_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (available_store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_no TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending_payment', 'paid', 'closed', 'refunded', 'partially_refunded')),
      pay_channel TEXT NOT NULL DEFAULT 'wechat_pay',
      amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
      paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
      currency TEXT NOT NULL DEFAULT 'CNY',
      wechat_prepay_id TEXT,
      wechat_transaction_id TEXT,
      paid_at TEXT,
      closed_at TEXT,
      refunded_at TEXT,
      raw_notify_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
      total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS user_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      order_id TEXT,
      entitlement_type TEXT NOT NULL CHECK (entitlement_type IN ('minutes', 'uses', 'period')),
      store_id TEXT,
      total_minutes INTEGER,
      remaining_minutes INTEGER,
      total_uses INTEGER,
      remaining_uses INTEGER,
      valid_from TEXT NOT NULL,
      valid_until TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'exhausted', 'expired', 'frozen', 'refunded')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (plan_id) REFERENCES plans(id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending_payment', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show')),
      source TEXT NOT NULL DEFAULT 'miniapp',
      entitlement_id TEXT,
      order_id TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      checked_in_at TEXT,
      checked_out_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (end_at > start_at),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (area_id) REFERENCES store_areas(id),
      FOREIGN KEY (seat_id) REFERENCES seats(id),
      FOREIGN KEY (entitlement_id) REFERENCES user_entitlements(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      reservation_id TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
      settlement_status TEXT NOT NULL CHECK (settlement_status IN ('pending', 'settled', 'refunded', 'manual_review')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (area_id) REFERENCES store_areas(id),
      FOREIGN KEY (seat_id) REFERENCES seats(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    );

    CREATE TABLE IF NOT EXISTS entitlement_ledger (
      id TEXT PRIMARY KEY,
      entitlement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('grant', 'reserve_hold', 'reserve_release', 'consume', 'refund', 'adjust')),
      delta_minutes INTEGER NOT NULL DEFAULT 0,
      delta_uses INTEGER NOT NULL DEFAULT 0,
      balance_minutes_after INTEGER,
      balance_uses_after INTEGER,
      reservation_id TEXT,
      study_session_id TEXT,
      order_id TEXT,
      idempotency_key TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entitlement_id) REFERENCES user_entitlements(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id),
      FOREIGN KEY (study_session_id) REFERENCES study_sessions(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS access_devices (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      device_type TEXT NOT NULL CHECK (device_type IN ('door_lock', 'gate', 'qr_scanner', 'admin_terminal')),
      device_code TEXT NOT NULL,
      secret_hash TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')),
      last_seen_at TEXT,
      config_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS access_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      reservation_id TEXT,
      code_type TEXT NOT NULL CHECK (code_type IN ('reservation_once', 'reservation_window', 'long_term', 'admin')),
      code_hash TEXT NOT NULL,
      code_suffix TEXT,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired', 'rotated')),
      rotated_from_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id),
      FOREIGN KEY (rotated_from_id) REFERENCES access_codes(id)
    );

    CREATE TABLE IF NOT EXISTS access_events (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      device_id TEXT,
      user_id TEXT,
      access_code_id TEXT,
      reservation_id TEXT,
      study_session_id TEXT,
      direction TEXT NOT NULL CHECK (direction IN ('entry', 'exit', 'unknown')),
      result TEXT NOT NULL CHECK (result IN ('granted', 'denied', 'error')),
      reason TEXT,
      occurred_at TEXT NOT NULL,
      raw_payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (device_id) REFERENCES access_devices(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (access_code_id) REFERENCES access_codes(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id),
      FOREIGN KEY (study_session_id) REFERENCES study_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS daily_store_stats (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      stat_date TEXT NOT NULL,
      reservation_count INTEGER NOT NULL DEFAULT 0,
      completed_session_count INTEGER NOT NULL DEFAULT 0,
      active_minutes INTEGER NOT NULL DEFAULT 0,
      paid_order_count INTEGER NOT NULL DEFAULT 0,
      revenue_cents INTEGER NOT NULL DEFAULT 0,
      access_granted_count INTEGER NOT NULL DEFAULT 0,
      access_denied_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_wechat_app_openid ON wechat_identities(app_id, openid);
    CREATE INDEX IF NOT EXISTS idx_wechat_user_id ON wechat_identities(user_id);
    CREATE INDEX IF NOT EXISTS idx_wechat_unionid ON wechat_identities(unionid);
    CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
    CREATE INDEX IF NOT EXISTS idx_store_areas_store_id ON store_areas(store_id);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_store_areas_name ON store_areas(store_id, name);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_seats_store_no ON seats(store_id, seat_no);
    CREATE INDEX IF NOT EXISTS idx_seats_area_status ON seats(area_id, status);
    CREATE INDEX IF NOT EXISTS idx_seats_store_status ON seats(store_id, status);
    CREATE INDEX IF NOT EXISTS idx_plans_status_sort ON plans(status, sort_order);
    CREATE INDEX IF NOT EXISTS idx_plans_store ON plans(available_store_id);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_order_no ON orders(order_no);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_wechat_transaction ON orders(wechat_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_plan ON order_items(plan_id);
    CREATE INDEX IF NOT EXISTS idx_entitlements_user_status_valid ON user_entitlements(user_id, status, valid_until);
    CREATE INDEX IF NOT EXISTS idx_entitlements_order ON user_entitlements(order_id);
    CREATE INDEX IF NOT EXISTS idx_entitlements_store ON user_entitlements(store_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_user_time ON reservations(user_id, start_at, end_at);
    CREATE INDEX IF NOT EXISTS idx_reservations_seat_time ON reservations(seat_id, start_at, end_at);
    CREATE INDEX IF NOT EXISTS idx_reservations_store_status_time ON reservations(store_id, status, start_at);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON study_sessions(user_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_seat_active ON study_sessions(seat_id, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_store_started ON study_sessions(store_id, started_at);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_reservation ON study_sessions(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_entitlement_created ON entitlement_ledger(entitlement_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON entitlement_ledger(user_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_idempotency ON entitlement_ledger(idempotency_key);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_access_devices_code ON access_devices(device_code);
    CREATE INDEX IF NOT EXISTS idx_access_devices_store_status ON access_devices(store_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_access_codes_hash ON access_codes(code_hash);
    CREATE INDEX IF NOT EXISTS idx_access_codes_user_status ON access_codes(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_access_codes_store_valid ON access_codes(store_id, valid_from, valid_until);
    CREATE INDEX IF NOT EXISTS idx_access_codes_reservation ON access_codes(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_access_events_store_time ON access_events(store_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_access_events_user_time ON access_events(user_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_access_events_code_time ON access_events(access_code_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_access_events_result_time ON access_events(result, occurred_at);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_store_stats_date ON daily_store_stats(store_id, stat_date);
    CREATE INDEX IF NOT EXISTS idx_daily_store_stats_date ON daily_store_stats(stat_date);
  `);
}
