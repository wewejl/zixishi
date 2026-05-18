import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMerchantStoreAccess } from '../middleware/merchantAuth.js';
import { MerchantRepository } from '../repositories/MerchantRepository.js';
import { StoreRepository } from '../repositories/StoreRepository.js';
import { MerchantService } from '../services/merchant.js';

export const merchantRouter = Router();

const storeRepository = new StoreRepository(db);
const merchantRepository = new MerchantRepository(db);
const merchantService = new MerchantService({ storeRepository, merchantRepository });

merchantRouter.use('/merchant', requireAuth);

merchantRouter.get('/merchant/stores/:storeId/operations-summary', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.getOperationSummary({
      storeId: req.params.storeId,
      from: req.query.from,
      to: req.query.to,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/summary', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.getOperationSummary({
      storeId: req.params.storeId,
      from: req.query.from,
      to: req.query.to,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/members', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.listMembers({
      storeId: req.params.storeId,
      keyword: req.query.keyword,
      status: req.query.status,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/customers', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.listMembers({
      storeId: req.params.storeId,
      keyword: req.query.keyword,
      status: req.query.status,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/users', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.listMembers({
      storeId: req.params.storeId,
      keyword: req.query.keyword,
      status: req.query.status,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/access-events', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.listAccessEvents({
      storeId: req.params.storeId,
      result: req.query.result,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/reservations', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.listReservations({
      storeId: req.params.storeId,
      status: req.query.status,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});

merchantRouter.get('/merchant/stores/:storeId/orders', (req, res, next) => {
  try {
    assertMerchantStoreAccess(req, req.params.storeId);
    res.json(merchantService.listOrders({
      storeId: req.params.storeId,
      status: req.query.status,
      limit: req.query.limit,
      cursor: req.query.cursor,
    }));
  } catch (error) {
    next(error);
  }
});
