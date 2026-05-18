import { computed, reactive } from 'vue';
import {
  clearStoredAuthToken,
  getStoredAccessToken,
  getTokenExpiresAt,
  isTokenExpired,
  setAccessTokenGetter,
  setAuthRequestResolver,
  setStoredAuthToken,
  setUnauthorizedHandler
} from '../api/request';
import { authService } from '../api/services/auth';
import { ENABLE_DEV_AUTO_LOGIN } from '../utils/constants';
import { bookingStore } from './booking';
import { userStore } from './user';

const state = reactive({
  accessToken: '',
  tokenType: 'Bearer',
  expiresAt: 0,
  loading: false,
  error: null,
  initialized: false,
  loginExpired: false
});

let devAutoLoginPromise = null;
let devAutoLoginFailed = false;

function getToken() {
  if (isTokenExpired()) return '';
  if (state.accessToken) return state.accessToken;
  return getStoredAccessToken();
}

function setAuth(payload = {}) {
  const expiresAt = payload.expiresAt || (payload.expiresIn ? Date.now() + Number(payload.expiresIn) * 1000 : 0);

  state.accessToken = payload.accessToken || '';
  state.tokenType = payload.tokenType || 'Bearer';
  state.expiresAt = expiresAt;
  state.loginExpired = false;
  state.initialized = true;
  devAutoLoginFailed = false;

  setStoredAuthToken({
    accessToken: state.accessToken,
    tokenType: state.tokenType,
    expiresAt: state.expiresAt
  });
}

function clearAuth(options = {}) {
  state.accessToken = '';
  state.tokenType = 'Bearer';
  state.expiresAt = 0;
  state.error = null;
  state.initialized = true;
  state.loginExpired = Boolean(options.expired);
  clearStoredAuthToken();
  userStore.clearProfile();
  bookingStore.clearBookingState();
}

function initFromStorage() {
  if (state.initialized) return;

  state.accessToken = getStoredAccessToken();
  state.expiresAt = getTokenExpiresAt();
  state.loginExpired = false;
  state.initialized = true;

  if (state.accessToken && isTokenExpired()) {
    clearAuth({ expired: true });
    return;
  }

  userStore.initFromStorage();
}

function shouldUseDevAutoLogin() {
  if (ENABLE_DEV_AUTO_LOGIN) return true;

  try {
    if (typeof wx === 'undefined' || !wx.getAccountInfoSync) return false;
    return wx.getAccountInfoSync()?.miniProgram?.envVersion === 'develop';
  } catch (error) {
    return false;
  }
}

async function getWechatLoginCode() {
  return new Promise((resolve, reject) => {
    if (!uni.login) {
      resolve('dev');
      return;
    }

    uni.login({
      provider: 'weixin',
      success(result) {
        if (result.code) {
          resolve(result.code);
          return;
        }
        reject(new Error('微信登录未返回 code'));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

async function loginWithWechat(options = {}) {
  state.loading = true;
  state.error = null;

  try {
    const code = options.code || (await getWechatLoginCode());
    const result = await authService.wechatLogin({
      code,
      encryptedData: options.encryptedData,
      iv: options.iv
    });

    setAuth(result);

    if (result.user) {
      userStore.setProfile({ user: result.user });
    }

    try {
      await userStore.fetchMe();
    } catch (error) {
      if (!result.user) throw error;
    }

    return result;
  } catch (error) {
    state.error = error;
    throw error;
  } finally {
    state.loading = false;
  }
}

async function refreshCurrentUser() {
  initFromStorage();

  if (!getToken()) return null;

  return userStore.fetchMe();
}

async function ensureAuthForRequest() {
  initFromStorage();

  if (getToken()) return { authenticated: true };

  if (!shouldUseDevAutoLogin()) return null;

  if (devAutoLoginFailed) {
    return { suppressUnauthenticatedRequest: true };
  }

  if (!devAutoLoginPromise) {
    devAutoLoginPromise = loginWithWechat({ code: 'dev' })
      .then(() => {
        devAutoLoginFailed = false;
        return { authenticated: true };
      })
      .catch((error) => {
        devAutoLoginFailed = true;
        state.error = error;
        return { suppressUnauthenticatedRequest: true, error };
      })
      .finally(() => {
        devAutoLoginPromise = null;
      });
  }

  return devAutoLoginPromise;
}

function handleUnauthorized(error) {
  clearAuth({ expired: true });
  state.error = error;
}

function logout() {
  clearAuth();
}

setAccessTokenGetter(getToken);
setAuthRequestResolver(ensureAuthForRequest);
setUnauthorizedHandler(handleUnauthorized);

export const authStore = {
  state,
  accessToken: computed(() => getToken()),
  isLoggedIn: computed(() => Boolean(getToken()) && !state.loginExpired && !isTokenExpired()),
  isLoginExpired: computed(() => state.loginExpired || isTokenExpired()),
  initFromStorage,
  loginWithWechat,
  ensureAuthForRequest,
  refreshCurrentUser,
  setAuth,
  clearAuth,
  handleUnauthorized,
  logout,
  getToken
};

export default authStore;
