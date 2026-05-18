import { http } from '../request';

export const packageService = {
  listPackages(params = {}) {
    return http.get('/packages', params);
  },

  getPackages(params = {}) {
    return http.get('/packages', params);
  }
};

export default packageService;
