export const ROUTES = {
  home: '/pages/home/index',
  booking: '/pages/booking/index',
  bookingConfirm: '/pages/booking/confirm',
  access: '/pages/access/index',
  packages: '/pages/packages/index',
  profile: '/pages/profile/index',
  seatStatus: '/pages/seat-status/index',
  longTermPassword: '/pages/long-term-password/index',
  orders: '/pages/orders/index',
  login: '/pages/login/index',
  webview: '/pages/webview/index'
};

export function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => {
    return value !== undefined && value !== null && value !== '';
  });

  if (!entries.length) return '';

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export function withQuery(path, params = {}) {
  const query = buildQuery(params);
  return query ? `${path}?${query}` : path;
}

export function navigateTo(path, params = {}) {
  return uni.navigateTo({ url: withQuery(path, params) });
}

export function hideNativeTabBar() {
  if (typeof uni === 'undefined' || typeof uni.hideTabBar !== 'function') {
    return;
  }

  uni.hideTabBar({
    animation: false,
    fail: () => {}
  });
}

export function switchTab(path) {
  return uni.switchTab({
    url: path,
    fail: () => {
      uni.reLaunch({ url: path });
    }
  });
}

export function redirectTo(path, params = {}) {
  return uni.redirectTo({ url: withQuery(path, params) });
}

export function reLaunch(path, params = {}) {
  return uni.reLaunch({ url: withQuery(path, params) });
}
