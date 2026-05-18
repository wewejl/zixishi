import { randomBytes } from 'node:crypto';

function timestampCompact(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

export function createRequestId() {
  return `req_${timestampCompact()}_${randomBytes(3).toString('hex')}`;
}
