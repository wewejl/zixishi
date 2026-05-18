import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';
import { EntitlementReadRepository } from '../repositories/EntitlementReadRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { UserService } from '../services/user.js';

export const meRouter = Router();

const userRepository = new UserRepository(db);
const entitlementReadRepository = new EntitlementReadRepository(db);
const userService = new UserService({ userRepository, entitlementReadRepository });

meRouter.get('/me', requireAuth, (req, res, next) => {
  try {
    res.json(userService.getMe(req.auth.userId));
  } catch (error) {
    next(error);
  }
});
