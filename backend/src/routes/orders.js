import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { OrderService } from '../services/order.js';

export const ordersRouter = Router();

const orderService = new OrderService();

ordersRouter.use(requireAuth);

ordersRouter.post('/orders', (req, res, next) => {
  try {
    res.json(orderService.createOrder({
      userId: resolveUserId(req),
      type: req.body?.type,
      packageId: req.body?.packageId,
      storeId: req.body?.storeId ?? null,
      reservationId: req.body?.reservationId,
      payAmountCent: req.body?.payAmountCent,
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
