import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';
import { SeatRepository } from '../repositories/SeatRepository.js';
import { StoreRepository } from '../repositories/StoreRepository.js';
import { SeatService } from '../services/seat.js';
import { StoreService } from '../services/store.js';
import { AppError, notFound } from '../utils/errors.js';
import { nowIso } from '../utils/time.js';

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

storesRouter.get('/merchant/stores/:storeId/seats', requireAuth, (req, res, next) => {
  try {
    const storeId = req.params.storeId;
    assertStoreExists(storeId);
    const seats = seatRepository.listByStore(storeId);
    res.json({
      items: seats.map((seat) => ({
        id: seat.id,
        storeId: seat.store_id,
        code: seat.seat_no,
        status: seat.status,
        area: seat.area_name,
        seatType: seat.seat_type,
      })),
    });
  } catch (error) {
    next(error);
  }
});

storesRouter.patch('/merchant/seats/:seatId/code', requireAuth, (req, res, next) => {
  try {
    const seat = seatRepository.findById(req.params.seatId);
    if (!seat) throw notFound('座位不存在', { seatId: req.params.seatId });
    const code = String(req.body?.code || '').trim();
    if (!code) throw invalidArg('座位编码不能为空');
    if (code.length > 32) throw invalidArg('座位编码长度不能超过 32');
    if (seatRepository.existsSeatNoInStore({ storeId: seat.store_id, seatNo: code, excludeSeatId: seat.id })) {
      throw invalidArg('座位编码已存在', { code, storeId: seat.store_id });
    }
    const ok = seatRepository.updateSeatCode({ seatId: seat.id, storeId: seat.store_id, seatNo: code, at: nowIso() });
    if (!ok) throw notFound('座位不存在', { seatId: req.params.seatId });
    const updated = seatRepository.findById(seat.id);
    res.json({ seat: { id: updated.id, storeId: updated.store_id, code: updated.seat_no, status: updated.status } });
  } catch (error) {
    next(error);
  }
});

storesRouter.patch('/merchant/seats/:seatId/status', requireAuth, (req, res, next) => {
  try {
    const seat = seatRepository.findById(req.params.seatId);
    if (!seat) throw notFound('座位不存在', { seatId: req.params.seatId });
    const status = String(req.body?.status || '').trim();
    if (!['available', 'locked', 'maintenance', 'disabled'].includes(status)) throw invalidArg('座位状态无效');
    const ok = seatRepository.updateSeatStatus({ seatId: seat.id, storeId: seat.store_id, status, at: nowIso() });
    if (!ok) throw notFound('座位不存在', { seatId: req.params.seatId });
    const updated = seatRepository.findById(seat.id);
    res.json({ seat: { id: updated.id, storeId: updated.store_id, code: updated.seat_no, status: updated.status } });
  } catch (error) {
    next(error);
  }
});

function invalidArg(message, details = null) {
  return new AppError({ code: 'INVALID_ARGUMENT', message, status: 400, details });
}

function assertStoreExists(storeId) {
  const store = storeRepository.findById(storeId);
  if (!store) {
    throw notFound('门店不存在', { storeId });
  }
}
