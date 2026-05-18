import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';
import { SeatRepository } from '../repositories/SeatRepository.js';
import { StoreRepository } from '../repositories/StoreRepository.js';
import { SeatService } from '../services/seat.js';
import { StoreService } from '../services/store.js';

export const storesRouter = Router();

const storeRepository = new StoreRepository(db);
const seatRepository = new SeatRepository(db);
const seatService = new SeatService({ storeRepository, seatRepository });
const storeService = new StoreService({ storeRepository, seatService });

storesRouter.get('/stores/:storeId/summary', requireAuth, (req, res, next) => {
  try {
    res.json(storeService.getSummary(req.params.storeId));
  } catch (error) {
    next(error);
  }
});

storesRouter.get('/stores/:storeId/seat-availability', requireAuth, (req, res, next) => {
  try {
    res.json(seatService.getAvailability({
      storeId: req.params.storeId,
      date: req.query.date,
      startAt: req.query.startAt,
      endAt: req.query.endAt,
      features: req.query.features
    }));
  } catch (error) {
    next(error);
  }
});
