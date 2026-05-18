import { http } from '../request';

export const userService = {
  getMe() {
    return http.get('/me');
  }
};

export default userService;
