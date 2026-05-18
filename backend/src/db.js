import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrations/index.js';
import { seedDatabase } from './seed/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'zixishi.sqlite'));

export function configureDatabase(database = db) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);
}

configureDatabase();

export function migrate() {
  runMigrations(db);
}

export function initMeta() {
  db.prepare(`
    INSERT OR IGNORE INTO app_meta (key, value)
    VALUES ('initialized_at', ?)
  `).run(new Date().toISOString());
}

export function seed() {
  seedDatabase(db);
}
