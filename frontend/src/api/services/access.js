import { http } from '../request';
import { DEFAULT_ACCESS_DEVICE_ID, DEFAULT_STORE_ID } from '../../utils/constants';

export const accessService = {
  unlock(payload = {}) {
    return http.post('/access/unlock', {
      storeId: DEFAULT_STORE_ID,
      deviceId: DEFAULT_ACCESS_DEVICE_ID,
      source: 'mini_program',
      ...payload
    });
  },

  unlockDoor(payload = {}) {
    return this.unlock(payload);
  },

  getLongTermCode(params = {}) {
    return http.get('/access/long-term-code', {
      storeId: DEFAULT_STORE_ID,
      ...params
    });
  },

  refreshLongTermCode(payload = {}) {
    return http.post('/access/long-term-code/refresh', {
      storeId: DEFAULT_STORE_ID,
      ...payload
    });
  }
};

export default accessService;
