const pad = (value) => String(value).padStart(2, '0');

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function addMinutes(value, minutes) {
  const date = toDate(value) || new Date();
  return new Date(date.getTime() + Number(minutes || 0) * 60 * 1000);
}

export function getTodayDate() {
  return formatDate(new Date());
}

export function getDurationMinutes(startAt, endAt) {
  const start = toDate(startAt);
  const end = toDate(endAt);
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function isExpired(value) {
  const date = toDate(value);
  return Boolean(date && date.getTime() <= Date.now());
}
