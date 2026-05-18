import orderService from '../api/services/order';
import { ENABLE_DEV_MOCK_PAYMENT } from './constants';

export async function payOrderWithWechat(orderId, existingPayment = null) {
  if (!orderId) {
    throw new Error('订单信息缺失，请返回后重试');
  }

  const result = existingPayment
    ? { payment: existingPayment }
    : await createPaymentWithDevFallback(orderId);
  const payment = result.payment || {};

  if (payment.mock) {
    return orderService.mockPay(orderId, { payResult: 'success' });
  }

  if (!isWechatPaymentPayload(payment)) {
    if (ENABLE_DEV_MOCK_PAYMENT) {
      return orderService.mockPay(orderId, { payResult: 'success' });
    }
    throw new Error('支付参数不完整，请稍后重试');
  }

  await requestWechatPayment(payment);
  return result;
}

async function createPaymentWithDevFallback(orderId) {
  try {
    return await orderService.createWechatPayment(orderId);
  } catch (error) {
    if (shouldFallbackToMockPay(error)) {
      return { payment: { mock: true } };
    }
    throw error;
  }
}

function shouldFallbackToMockPay(error) {
  if (!ENABLE_DEV_MOCK_PAYMENT) return false;
  return ['CONFIG_MISSING', 'NOT_IMPLEMENTED', 'WECHAT_OPENID_MISSING'].includes(error?.code)
    || [404, 501].includes(error?.statusCode);
}

function isWechatPaymentPayload(payment) {
  return Boolean(payment?.timeStamp && payment?.nonceStr && payment?.package && payment?.paySign);
}

export function requestWechatPayment(payment) {
  return new Promise((resolve, reject) => {
    if (typeof uni.requestPayment !== 'function') {
      reject(new Error('当前环境不支持微信支付，请使用小程序或开发 mock 支付'));
      return;
    }

    uni.requestPayment({
      provider: payment.provider || 'wxpay',
      timeStamp: payment.timeStamp,
      nonceStr: payment.nonceStr,
      package: payment.package,
      signType: payment.signType || 'RSA',
      paySign: payment.paySign,
      success: resolve,
      fail: reject
    });
  });
}
