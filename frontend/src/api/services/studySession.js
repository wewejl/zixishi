import { http } from '../request';

export const studySessionService = {
  getCurrent() {
    return http.get('/study-session/current');
  },

  checkIn(payload) {
    return http.post('/study-session/check-in', payload);
  },

  endSession(sessionId, payload = {}) {
    return http.post(`/study-session/${sessionId}/end`, payload);
  }
};

export default studySessionService;
