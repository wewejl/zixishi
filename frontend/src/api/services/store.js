import { http } from '../request';
import { DEFAULT_STORE_ID } from '../../utils/constants';

export const storeService = {
  healthCheck() {
    return http.get('/health', undefined, { auth: false });
  },

  getSummary(storeId = DEFAULT_STORE_ID) {
    return http.get(`/stores/${storeId}/summary`);
  },

  getSeatAvailability(storeId = DEFAULT_STORE_ID, params = {}) {
    return http.get(`/stores/${storeId}/seat-availability`, params);
  }
};

export default storeService;
