export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(dateIso, days) {
  const date = new Date(dateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
