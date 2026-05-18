export function normalizeCent(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function centToYuan(value) {
  return normalizeCent(value) / 100;
}

export function formatPrice(value, options = {}) {
  const { currency = 'CNY', showSymbol = true, empty = '¥0.00' } = options;

  if (value === null || value === undefined || value === '') {
    return empty;
  }

  const amount = centToYuan(value);

  if (currency === 'CNY' && showSymbol) {
    return `¥${amount.toFixed(2)}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

export function formatPriceCompact(value, options = {}) {
  const { currency = 'CNY' } = options;
  const amount = centToYuan(value);
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return currency === 'CNY' ? `¥${formatted}` : `${formatted} ${currency}`;
}
