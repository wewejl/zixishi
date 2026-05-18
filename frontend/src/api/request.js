import { API_BASE_URL, API_PREFIX, AUTH_ERROR_CODES, STORAGE_KEYS } from '../utils/constants';

let tokenGetter = null;
let unauthorizedHandler = null;
let authRequestResolver = null;

export class ApiError extends Error {
  constructor({ code, message, requestId, details, statusCode, response }) {
    super(message || '请求失败');
    this.name = 'ApiError';
    this.code = code || 'REQUEST_FAILED';
    this.message = message || '请求失败';
    this.requestId = requestId || '';
    this.details = details || null;
    this.statusCode = statusCode || 0;
    this.response = response;
  }
}

export function setAccessTokenGetter(getter) {
  tokenGetter = typeof getter === 'function' ? getter : null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

export function setAuthRequestResolver(resolver) {
  authRequestResolver = typeof resolver === 'function' ? resolver : null;
}

export function getStoredAccessToken() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.accessToken) || '';
  } catch (error) {
    return '';
  }
}

export function setStoredAuthToken({ accessToken, tokenType = 'Bearer', expiresIn, expiresAt } = {}) {
  if (!accessToken) return;

  const tokenExpiresAt = expiresAt || (expiresIn ? Date.now() + Number(expiresIn) * 1000 : '');
  uni.setStorageSync(STORAGE_KEYS.accessToken, accessToken);
  uni.setStorageSync(STORAGE_KEYS.tokenType, tokenType || 'Bearer');

  if (tokenExpiresAt) {
    uni.setStorageSync(STORAGE_KEYS.tokenExpiresAt, tokenExpiresAt);
  } else {
    uni.removeStorageSync(STORAGE_KEYS.tokenExpiresAt);
  }
}

export function clearStoredAuthToken() {
  uni.removeStorageSync(STORAGE_KEYS.accessToken);
  uni.removeStorageSync(STORAGE_KEYS.tokenType);
  uni.removeStorageSync(STORAGE_KEYS.tokenExpiresAt);
}

export function getTokenExpiresAt() {
  try {
    return Number(uni.getStorageSync(STORAGE_KEYS.tokenExpiresAt) || 0);
  } catch (error) {
    return 0;
  }
}

export function isTokenExpired() {
  const expiresAt = getTokenExpiresAt();
  return Boolean(expiresAt && expiresAt <= Date.now());
}

function getAccessToken() {
  if (tokenGetter) {
    return tokenGetter() || '';
  }

  if (isTokenExpired()) {
    clearStoredAuthToken();
    return '';
  }

  return getStoredAccessToken();
}

function getTokenType() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.tokenType) || 'Bearer';
  } catch (error) {
    return 'Bearer';
  }
}

function buildUrl(path, params) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith(API_PREFIX) ? normalizedPath : `${API_PREFIX}${normalizedPath}`;
  const query = buildQuery(params);
  return `${API_BASE_URL}${apiPath}${query ? `?${query}` : ''}`;
}

function buildQuery(params = {}) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const normalizedValue = Array.isArray(value) ? value.join(',') : value;
      return `${encodeURIComponent(key)}=${encodeURIComponent(normalizedValue)}`;
    })
    .join('&');
}

function fallbackMessageByStatus(statusCode) {
  if (statusCode === 400) return '请求参数有误，请检查后重试';
  if (statusCode === 401) return '请先登录后再操作';
  if (statusCode === 403) return '当前账号暂无操作权限';
  if (statusCode === 404) return '请求的资源不存在或已失效';
  if (statusCode === 409) return '当前状态已变化，请刷新后重试';
  if (statusCode >= 500) return '服务暂时不可用，请稍后重试';
  return '请求失败，请稍后重试';
}

function normalizeApiError(response, fallbackMessage = '') {
  const data = response?.data || {};
  const error = data.error || {};
  const statusCode = response?.statusCode || 0;

  return new ApiError({
    code: error.code || (statusCode === 401 ? AUTH_ERROR_CODES.unauthorized : 'REQUEST_FAILED'),
    message: error.message || data.message || fallbackMessage || fallbackMessageByStatus(statusCode),
    requestId: error.requestId || '',
    details: error.details || null,
    statusCode,
    response
  });
}

function handleUnauthorized(error) {
  clearStoredAuthToken();

  if (unauthorizedHandler) {
    unauthorizedHandler(error);
  }
}

function buildUnauthenticatedError() {
  return new ApiError({
    code: AUTH_ERROR_CODES.unauthorized,
    message: '请先登录后再操作',
    statusCode: 0,
    details: { authHeader: 'Bearer token required' }
  });
}

function normalizeNetworkErrorMessage(error) {
  const message = String(error?.errMsg || '');
  if (/timeout/i.test(message)) return '网络请求超时，请检查网络后重试';
  if (/abort/i.test(message)) return '请求已取消';
  return '无法连接服务，请确认后端已启动或网络可用';
}

export async function request(options = {}) {
  const {
    path,
    url,
    method = 'GET',
    data,
    params,
    header = {},
    auth = true,
    timeout = 15000
  } = options;

  const requestPath = path || url;
  const headers = {
    'Content-Type': 'application/json',
    ...header
  };

  if (auth) {
    let token = getAccessToken();
    if (!token && authRequestResolver) {
      const resolved = await authRequestResolver({ path: requestPath, method });
      token = getAccessToken();

      if (!token && resolved?.suppressUnauthenticatedRequest) {
        throw buildUnauthenticatedError();
      }
    }

    if (token) {
      headers.Authorization = `${getTokenType()} ${token}`;
    }
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(requestPath, params),
      method,
      data,
      header: headers,
      timeout,
      success(response) {
        const statusCode = response.statusCode || 0;

        if (statusCode >= 200 && statusCode < 300) {
          resolve(response.data);
          return;
        }

        const error = normalizeApiError(response);
        if (statusCode === 401) {
          handleUnauthorized(error);
        }
        reject(error);
      },
      fail(error) {
        reject(
          new ApiError({
            code: 'NETWORK_ERROR',
            message: normalizeNetworkErrorMessage(error),
            details: error || null
          })
        );
      }
    });
  });
}

export const http = {
  get(path, params, options = {}) {
    return request({ ...options, path, params, method: 'GET' });
  },
  post(path, data, options = {}) {
    return request({ ...options, path, data, method: 'POST' });
  },
  put(path, data, options = {}) {
    return request({ ...options, path, data, method: 'PUT' });
  },
  delete(path, data, options = {}) {
    return request({ ...options, path, data, method: 'DELETE' });
  }
};

export function healthCheck() {
  return http.get('/health', undefined, { auth: false });
}
