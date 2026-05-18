import { createHash, randomBytes } from 'node:crypto';
import { createId } from '../utils/id.js';

export function createMockPrepayId() {
  return `mock_prepay_${randomBytes(8).toString('hex')}`;
}

export function createMockTransactionId(orderNo) {
  const digest = createHash('sha256')
    .update(`${orderNo}:${Date.now()}:${randomBytes(8).toString('hex')}`)
    .digest('hex')
    .slice(0, 24);

  return `mock_tx_${digest}`;
}

export function toPaymentDto(order) {
  return {
    provider: 'mock_wechat_pay',
    mock: true,
    prepayId: order.wechat_prepay_id,
  };
}

export function createOrderNo() {
  const compact = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return `ORD${compact}${createId('').replace(/^_/, '').slice(0, 10).toUpperCase()}`;
}
