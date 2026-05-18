import { storeService } from './store';
import { DEFAULT_STORE_ID } from '../../utils/constants';

export const seatService = {
  getAvailability(params = {}, storeId = DEFAULT_STORE_ID) {
    return storeService.getSeatAvailability(storeId, params);
  },

  getSeatAvailability(storeId = DEFAULT_STORE_ID, params = {}) {
    return storeService.getSeatAvailability(storeId, params);
  }
};

export default seatService;
