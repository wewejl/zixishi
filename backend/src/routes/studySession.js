import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { StudySessionService } from '../services/studySession.js';
import { unauthorized } from '../utils/errors.js';

export const studySessionRouter = Router();

studySessionRouter.use(requireAuth);

studySessionRouter.get('/study-session/current', (req, res, next) => {
  try {
    const service = new StudySessionService({ db });
    res.json(service.getCurrentSession(getAuthenticatedUserId(req)));
  } catch (error) {
    next(error);
  }
});

studySessionRouter.post('/study-session/check-in', (req, res, next) => {
  try {
    const service = new StudySessionService({ db });
    res.status(201).json(service.checkIn({
      userId: getAuthenticatedUserId(req),
      reservationId: req.body?.reservationId,
      checkInSource: req.body?.checkInSource,
    }));
  } catch (error) {
    next(error);
  }
});

studySessionRouter.post('/study-session/:sessionId/end', (req, res, next) => {
  try {
    const service = new StudySessionService({ db });
    res.json(service.endSession({
      userId: getAuthenticatedUserId(req),
      sessionId: req.params.sessionId,
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
