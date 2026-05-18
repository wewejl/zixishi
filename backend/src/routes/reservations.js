import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { ReservationService } from '../services/reservation.js';
import { unauthorized } from '../utils/errors.js';

export const reservationRouter = Router();

reservationRouter.use(requireAuth);

reservationRouter.post('/reservations', (req, res, next) => {
  try {
    const service = new ReservationService({ db });
    res.status(201).json(service.createReservation({
      userId: getAuthenticatedUserId(req),
      storeId: req.body?.storeId,
      seatId: req.body?.seatId,
      startAt: req.body?.startAt,
      endAt: req.body?.endAt,
      useEntitlement: req.body?.useEntitlement !== false,
    }));
  } catch (error) {
    next(error);
  }
});

reservationRouter.get('/reservations/current', (req, res, next) => {
  try {
    const service = new ReservationService({ db });
    res.json(service.getCurrentReservation(getAuthenticatedUserId(req)));
  } catch (error) {
    next(error);
  }
});

reservationRouter.get('/reservations', (req, res, next) => {
  try {
    const service = new ReservationService({ db });
    res.json(service.listReservations({
      userId: getAuthenticatedUserId(req),
      status: req.query.status,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});

reservationRouter.get('/reservations/:reservationId', (req, res, next) => {
  try {
    const service = new ReservationService({ db });
    res.json(service.getReservation({
      userId: getAuthenticatedUserId(req),
      reservationId: req.params.reservationId,
    }));
  } catch (error) {
    next(error);
  }
});

reservationRouter.post('/reservations/:reservationId/cancel', (req, res, next) => {
  try {
    const service = new ReservationService({ db });
    res.json(service.cancelReservation({
      userId: getAuthenticatedUserId(req),
      reservationId: req.params.reservationId,
      reason: req.body?.reason,
    }));
  } catch (error) {
    next(error);
  }
});

function getAuthenticatedUserId(req) {
  const userId = req.auth?.userId
    ?? req.auth?.user?.id
    ?? req.user?.id
    ?? userIdFromMockToken(req.auth?.token);

  if (!userId) {
    throw unauthorized('未登录或 token 无效', { reason: 'user id missing' });
  }

  return userId;
}

function userIdFromMockToken(token) {
  if (token === 'mock_access_token_user_001') {
    return 'user_mock_001';
  }

  if (token === 'mock_access_token_user_002') {
    return 'user_mock_002';
  }

  return token?.startsWith('user_') ? token : null;
}
