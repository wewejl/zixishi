import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PackageService } from '../services/package.js';

export const packagesRouter = Router();

const packageService = new PackageService();

packagesRouter.use(requireAuth);

packagesRouter.get('/packages', (req, res, next) => {
  try {
    res.json(packageService.listPackages({ storeId: req.query.storeId ?? null }));
  } catch (error) {
    next(error);
  }
});
