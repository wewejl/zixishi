import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { OrderService } from '../services/order.js';

export const ordersRouter = Router();

const orderService = new OrderService();

ordersRouter.post('/payments/wechat/notify', (req, res, next) => {
  try {
    orderService.handleWechatPayNotify({
      headers: req.headers,
      rawBody: req.rawBody || JSON.stringify(req.body || {}),
      body: req.body || {},
    });
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    next(error);
  }
});

ordersRouter.use(requireAuth);

ordersRouter.post('/orders', async (req, res, next) => {
  try {
    res.json(await orderService.createOrder({
      userId: resolveUserId(req),
      type: req.body?.type,
      packageId: req.body?.packageId,
      storeId: req.body?.storeId ?? null,
      reservationId: req.body?.reservationId,
      payAmountCent: req.body?.payAmountCent,
      clientIp: req.ip,
    }));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/orders/:orderId/wechat-pay', async (req, res, next) => {
  try {
    res.json(await orderService.createWechatPayment({
      userId: resolveUserId(req),
      orderId: req.params.orderId,
      clientIp: req.ip,
    }));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/orders/:orderId/mock-pay', (req, res, next) => {
  try {
    res.json(orderService.mockPay({
      userId: resolveUserId(req),
      orderId: req.params.orderId,
      payResult: req.body?.payResult ?? 'success',
    }));
  } catch (error) {
    next(error);
  }
});

ordersRouter.get('/orders', (req, res, next) => {
  try {
    res.json(orderService.listOrders({
      userId: resolveUserId(req),
      status: req.query.status ?? null,
      limit: req.query.limit,
      cursor: req.query.cursor ?? null,
    }));
  } catch (error) {
    next(error);
  }
});

function resolveUserId(req) {
  if (req.user?.id) return req.user.id;
  if (req.auth?.userId) return req.auth.userId;
  if (req.auth?.user?.id) return req.auth.user.id;
  if (req.auth?.token?.startsWith('user_')) return req.auth.token;

  const match = req.auth?.token?.match(/user_(\d+)/);
  return match ? `user_mock_${match[1]}` : 'user_mock_001';
}
