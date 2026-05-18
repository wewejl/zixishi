import { http } from '../request';

export const orderService = {
  createOrder(payload) {
    return http.post('/orders', payload);
  },

  mockPay(orderId, payload = { payResult: 'success' }) {
    return http.post(`/orders/${orderId}/mock-pay`, payload);
  },

  mockPayOrder(orderId, payload = { payResult: 'success' }) {
    return http.post(`/orders/${orderId}/mock-pay`, payload);
  },

  listOrders(params = {}) {
    return http.get('/orders', params);
  }
};

export default orderService;
