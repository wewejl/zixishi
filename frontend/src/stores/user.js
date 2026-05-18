import { reactive, computed } from 'vue';
import { userService } from '../api/services/user';
import { STORAGE_KEYS } from '../utils/constants';

const state = reactive({
  user: null,
  stats: null,
  entitlement: null,
  loading: false,
  error: null,
  initialized: false
});

function readCachedUser() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.user) || null;
  } catch (error) {
    return null;
  }
}

function writeCachedUser(user) {
  if (user) {
    uni.setStorageSync(STORAGE_KEYS.user, user);
  } else {
    uni.removeStorageSync(STORAGE_KEYS.user);
  }
}

function setProfile(profile = {}) {
  state.user = profile.user || null;
  state.stats = profile.stats || null;
  state.entitlement = profile.entitlement || null;
  state.initialized = true;
  writeCachedUser(state.user);
}

function clearProfile() {
  state.user = null;
  state.stats = null;
  state.entitlement = null;
  state.error = null;
  state.initialized = true;
  writeCachedUser(null);
}

async function fetchMe() {
  state.loading = true;
  state.error = null;

  try {
    const profile = await userService.getMe();
    setProfile(profile);
    return profile;
  } catch (error) {
    state.error = error;
    throw error;
  } finally {
    state.loading = false;
  }
}

function initFromStorage() {
  if (state.initialized) return;

  state.user = readCachedUser();
  state.initialized = true;
}

export const userStore = {
  state,
  user: computed(() => state.user),
  stats: computed(() => state.stats),
  entitlement: computed(() => state.entitlement),
  isLongTermMember: computed(() => Boolean(state.user?.isLongTermMember)),
  setProfile,
  clearProfile,
  fetchMe,
  initFromStorage
};

export default userStore;
