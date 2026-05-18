import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AccessService } from '../services/access.js';

export const accessRouter = Router();

const accessService = new AccessService();

accessRouter.use(requireAuth);

accessRouter.post('/access/unlock', (req, res, next) => {
  try {
    res.json(accessService.unlock({
      userId: resolveUserId(req),
      storeId: req.body?.storeId,
      deviceId: req.body?.deviceId,
      source: req.body?.source,
      clientContext: req.body?.clientContext,
    }));
  } catch (error) {
    next(error);
  }
});

accessRouter.get('/access/long-term-code', (req, res, next) => {
  try {
    res.json(accessService.getLongTermCode({
      userId: resolveUserId(req),
      storeId: req.query.storeId,
    }));
  } catch (error) {
    next(error);
  }
});

accessRouter.post('/access/long-term-code/refresh', (req, res, next) => {
  try {
    res.json(accessService.refreshLongTermCode({
      userId: resolveUserId(req),
      storeId: req.body?.storeId,
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
