import { http } from '../request';

export const reservationService = {
  createReservation(payload) {
    return http.post('/reservations', payload);
  },

  getCurrent() {
    return http.get('/reservations/current');
  },

  listReservations(params = {}) {
    return http.get('/reservations', params);
  },

  getReservation(reservationId) {
    return http.get(`/reservations/${reservationId}`);
  },

  cancelReservation(reservationId, payload = {}) {
    return http.post(`/reservations/${reservationId}/cancel`, payload);
  }
};

export default reservationService;
