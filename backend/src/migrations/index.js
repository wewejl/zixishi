import { migrateMvpSchema } from './001_mvp_schema.js';

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  migrateMvpSchema(db);

  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES ('schema_version', '001_mvp_schema')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run();
}
