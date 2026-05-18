const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_STORE_ID = import.meta.env.VITE_STORE_ID || 'store_default';
const DEFAULT_DEVICE_ID = import.meta.env.VITE_ACCESS_DEVICE_ID || 'access_device_main';
const TOKEN_KEY = 'zixishi_merchant_access_token';

let loginPromise = null;

export class ApiError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = detail.code || 'REQUEST_FAILED';
    this.status = detail.status || 0;
    this.details = detail.details || null;
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}/api${path}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    params,
    auth = true,
    retryAuth = true
  } = options;

  if (auth && !getToken()) {
    await login();
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;

  if (response.status === 401 && auth && retryAuth) {
    localStorage.removeItem(TOKEN_KEY);
    await login();
    return request(path, { ...options, retryAuth: false });
  }

  const error = data.error || {};
  throw new ApiError(error.message || response.statusText || '请求失败', {
    code: error.code,
    status: response.status,
    details: error.details
  });
}

export async function login() {
  if (!loginPromise) {
    loginPromise = request('/auth/wechat-login', {
      method: 'POST',
      auth: false,
      body: { code: 'merchant-web-dev' }
    })
      .then((result) => {
        setToken(result.accessToken);
        return result;
      })
      .finally(() => {
        loginPromise = null;
      });
  }
  return loginPromise;
}

export function loadStoreSummary() {
  return request(`/stores/${DEFAULT_STORE_ID}/summary`);
}

export function loadSeatAvailability(params) {
  return request(`/stores/${DEFAULT_STORE_ID}/seat-availability`, { params });
}

export function loadReservations(params = {}) {
  return request('/reservations', { params: { limit: 20, ...params } });
}

export function loadOrders(params = {}) {
  return request('/orders', { params: { limit: 20, ...params } });
}

export function loadPackages() {
  return request('/packages', { params: { storeId: DEFAULT_STORE_ID } });
}

export function loadMe() {
  return request('/me');
}

export function unlockDoor({ targetUserId = null, reason = 'merchant_web_remote' } = {}) {
  return request('/merchant/access/unlock', {
    method: 'POST',
    body: {
      storeId: DEFAULT_STORE_ID,
      deviceId: DEFAULT_DEVICE_ID,
      source: 'merchant_web',
      targetUserId,
      reason
    }
  });
}

export function refreshLongTermCode() {
  return request('/access/long-term-code/refresh', {
    method: 'POST',
    body: { storeId: DEFAULT_STORE_ID }
  });
}

export function loadMerchantSeats() {
  return request(`/merchant/stores/${DEFAULT_STORE_ID}/seats`);
}

export function updateMerchantSeatCode(seatId, code) {
  return request(`/merchant/seats/${seatId}/code`, {
    method: 'PATCH',
    body: { code }
  });
}

export function updateMerchantSeatStatus(seatId, status) {
  return request(`/merchant/seats/${seatId}/status`, {
    method: 'PATCH',
    body: { status }
  });
}

export function loadMerchantReservations(params = {}) {
  return request(`/merchant/stores/${DEFAULT_STORE_ID}/reservations`, { params: { limit: 20, ...params } });
}

export function loadMerchantOrders(params = {}) {
  return request(`/merchant/stores/${DEFAULT_STORE_ID}/orders`, { params: { limit: 20, ...params } });
}

export function loadMerchantCustomers(params = {}) {
  return request(`/merchant/stores/${DEFAULT_STORE_ID}/customers`, { params: { limit: 20, ...params } });
}

export function loadMerchantAccessEvents(params = {}) {
  return request(`/merchant/stores/${DEFAULT_STORE_ID}/access-events`, { params: { limit: 20, ...params } });
}
