import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notImplemented } from '../utils/errors.js';

export const protectedPlaceholderRouter = Router();

protectedPlaceholderRouter.use(requireAuth);

function placeholder(resource) {
  return (req, res, next) => {
    next(notImplemented(resource));
  };
}

protectedPlaceholderRouter.get('/me', placeholder('GET /api/me'));
protectedPlaceholderRouter.get('/stores/:storeId/summary', placeholder('GET /api/stores/:storeId/summary'));
protectedPlaceholderRouter.get('/stores/:storeId/seat-availability', placeholder('GET /api/stores/:storeId/seat-availability'));
protectedPlaceholderRouter.post('/reservations', placeholder('POST /api/reservations'));
protectedPlaceholderRouter.get('/reservations/current', placeholder('GET /api/reservations/current'));
protectedPlaceholderRouter.get('/reservations', placeholder('GET /api/reservations'));
protectedPlaceholderRouter.get('/reservations/:reservationId', placeholder('GET /api/reservations/:reservationId'));
protectedPlaceholderRouter.post('/reservations/:reservationId/cancel', placeholder('POST /api/reservations/:reservationId/cancel'));
protectedPlaceholderRouter.get('/study-session/current', placeholder('GET /api/study-session/current'));
protectedPlaceholderRouter.post('/study-session/check-in', placeholder('POST /api/study-session/check-in'));
protectedPlaceholderRouter.post('/study-session/:sessionId/end', placeholder('POST /api/study-session/:sessionId/end'));
protectedPlaceholderRouter.get('/packages', placeholder('GET /api/packages'));
protectedPlaceholderRouter.post('/orders', placeholder('POST /api/orders'));
protectedPlaceholderRouter.post('/orders/:orderId/mock-pay', placeholder('POST /api/orders/:orderId/mock-pay'));
protectedPlaceholderRouter.get('/orders', placeholder('GET /api/orders'));
protectedPlaceholderRouter.post('/access/unlock', placeholder('POST /api/access/unlock'));
protectedPlaceholderRouter.get('/access/long-term-code', placeholder('GET /api/access/long-term-code'));
protectedPlaceholderRouter.post('/access/long-term-code/refresh', placeholder('POST /api/access/long-term-code/refresh'));
