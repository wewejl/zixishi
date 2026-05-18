import { Router } from 'express';
import { db } from '../db.js';
import { EntitlementReadRepository } from '../repositories/EntitlementReadRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { AuthService } from '../services/auth.js';
import { UserService } from '../services/user.js';

export const authRouter = Router();

const userRepository = new UserRepository(db);
const entitlementReadRepository = new EntitlementReadRepository(db);
const userService = new UserService({ userRepository, entitlementReadRepository });
const authService = new AuthService({ userRepository, userService });

authRouter.post('/auth/wechat-login', async (req, res, next) => {
  try {
    res.json(await authService.loginWithWechat(req.body || {}));
  } catch (error) {
    next(error);
  }
});
