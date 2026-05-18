let defaultApiBaseUrl = '';

// #ifdef MP-WEIXIN
defaultApiBaseUrl = 'http://localhost:3000';
// #endif

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;

export const API_PREFIX = '/api';

export const ENABLE_DEV_AUTO_LOGIN = Boolean(
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTO_LOGIN === 'true'
);

export const ENABLE_DEV_MOCK_PAYMENT = Boolean(
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_MOCK_PAYMENT === 'true'
);

export const DEFAULT_STORE_ID = 'store_default';

export const DEFAULT_ACCESS_DEVICE_ID = 'access_device_main';

export const STORAGE_KEYS = {
  accessToken: 'zixishi_access_token',
  tokenType: 'zixishi_token_type',
  tokenExpiresAt: 'zixishi_token_expires_at',
  user: 'zixishi_user'
};

export const AUTH_ERROR_CODES = {
  unauthorized: 'UNAUTHORIZED',
  loginExpired: 'LOGIN_EXPIRED'
};

export const RESERVATION_STATUS = {
  pendingPayment: 'pending_payment',
  confirmed: 'confirmed',
  checkedIn: 'checked_in',
  completed: 'completed',
  cancelled: 'cancelled',
  expired: 'expired',
  noShow: 'no_show'
};

export const STUDY_SESSION_STATUS = {
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled'
};

export const ORDER_STATUS = {
  pendingPayment: 'pending_payment',
  paid: 'paid',
  closed: 'closed',
  refunded: 'refunded',
  partiallyRefunded: 'partially_refunded'
};

export const SEAT_AVAILABILITY_STATUS = {
  available: 'available',
  reserved: 'reserved',
  occupied: 'occupied',
  locked: 'locked',
  maintenance: 'maintenance',
  disabled: 'disabled'
};
