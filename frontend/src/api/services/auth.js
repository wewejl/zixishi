import { http } from '../request';

export const authService = {
  wechatLogin(payload) {
    return http.post('/auth/wechat-login', payload, { auth: false });
  }
};

export default authService;
