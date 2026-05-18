import { unauthorized } from '../utils/errors.js';
import { db } from '../db.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { verifyMockToken } from '../services/auth.js';

const userRepository = new UserRepository(db);

export function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(/\s+/);

  if (scheme !== 'Bearer' || !token) {
    next(unauthorized('未登录或 token 无效', { authHeader: 'Bearer token required' }));
    return;
  }

  try {
    const payload = verifyMockToken(token);
    const user = userRepository.findById(payload.userId);
    if (!user || user.status !== 'active') {
      next(unauthorized('未登录或 token 无效', { userId: payload.userId }));
      return;
    }

    req.auth = { token, userId: payload.userId };
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
