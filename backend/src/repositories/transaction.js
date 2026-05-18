import { db as defaultDb } from '../db.js';

export function withTransaction(callback, options = {}) {
  const database = options.db ?? defaultDb;
  const mode = options.deferred ? 'BEGIN' : 'BEGIN IMMEDIATE';

  database.exec(mode);
  try {
    const result = callback(database);
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
