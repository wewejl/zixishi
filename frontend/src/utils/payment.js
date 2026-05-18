import orderService from '../api/services/order';

export async function payOrderWithWechat(orderId, existingPayment = null) {
  const result = existingPayment
    ? { payment: existingPayment }
    : await orderService.createWechatPayment(orderId);
  const payment = result.payment || {};

  if (payment.mock) {
    return orderService.mockPay(orderId, { payResult: 'success' });
  }

  await requestWechatPayment(payment);
  return result;
}

export function requestWechatPayment(payment) {
  return new Promise((resolve, reject) => {
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
