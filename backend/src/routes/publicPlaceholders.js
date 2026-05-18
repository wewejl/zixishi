import { Router } from 'express';
import { notImplemented } from '../utils/errors.js';

export const publicPlaceholderRouter = Router();

publicPlaceholderRouter.post('/auth/wechat-login', (req, res, next) => {
  next(notImplemented('POST /api/auth/wechat-login'));
});
