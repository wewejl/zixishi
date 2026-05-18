import { db } from '../db.js';
import { AppError, notFound } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { withTransaction } from '../repositories/transaction.js';
import { PlanRepository } from '../repositories/PlanRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderEntitlementRepository } from '../repositories/OrderEntitlementRepository.js';
import { createMockPrepayId, createMockTransactionId, createOrderNo, toPaymentDto } from './payment.js';
import { OrderEntitlementService } from './orderEntitlement.js';

const ORDER_STATUSES = new Set(['pending_payment', 'paid', 'closed', 'refunded', 'partially_refunded']);

export class OrderService {
  constructor({
    database = db,
    planRepository = new PlanRepository(database),
    orderRepository = new OrderRepository(database),
    entitlementRepository = new OrderEntitlementRepository(database),
  } = {}) {
    this.database = database;
    this.planRepository = planRepository;
    this.orderRepository = orderRepository;
    this.entitlementRepository = entitlementRepository;
  }

  createOrder({ userId, type, packageId, storeId = null, reservationId, payAmountCent = null }) {
    if (type === 'package') {
      return this.createPackageOrder({ userId, packageId, storeId });
    }

    if (type === 'reservation') {
      return this.createReservationOrder({ userId, reservationId, payAmountCent });
    }

    throw badRequest('订单类型无效', { type });
  }

  createPackageOrder({ userId, packageId, storeId }) {
    if (!packageId) {
      throw badRequest('packageId 不能为空');
    }

    return withTransaction((tx) => {
      const planRepository = new PlanRepository(tx);
      const orderRepository = new OrderRepository(tx);
      const plan = planRepository.findActiveById(packageId, { storeId });

      if (!plan) {
        throw notFound('套餐不存在或已下架', { packageId });
      }

      const at = nowIso();
      const order = orderRepository.createOrder({
        id: createId('order'),
        userId,
        orderNo: createOrderNo(),
        amountCents: plan.price_cents,
        currency: plan.currency,
        wechatPrepayId: createMockPrepayId(),
        createdAt: at,
        updatedAt: at,
      });

      orderRepository.createOrderItem({
        id: createId('item'),
        orderId: order.id,
        planId: plan.id,
        quantity: 1,
        unitPriceCents: plan.price_cents,
        totalPriceCents: plan.price_cents,
        createdAt: at,
      });

      return {
        order: toOrderDto({ ...order, plan_name: plan.name }, { type: 'package' }),
        payment: toPaymentDto(order),
      };
    }, { db: this.database });
  }

  createReservationOrder({ userId, reservationId, payAmountCent }) {
    if (!reservationId) {
      throw badRequest('reservationId 不能为空');
    }

    return withTransaction((tx) => {
      const orderRepository = new OrderRepository(tx);
      const reservation = orderRepository.findReservationForPayment(reservationId, userId);

      if (!reservation) {
        throw notFound('预约不存在', { reservationId });
      }

      if (reservation.status !== 'pending_payment') {
        throw badRequest('预约状态不可支付', { reservationId, status: reservation.status });
      }

      if (reservation.order_id) {
        const existing = orderRepository.findByIdForUser(reservation.order_id, userId);
        if (existing) {
          return {
            order: toOrderDto(existing, { type: 'reservation', reservation }),
            payment: toPaymentDto(existing),
          };
        }
      }

      const at = nowIso();
      const amountCents = Number.isInteger(payAmountCent) && payAmountCent >= 0 ? payAmountCent : 0;
      const order = orderRepository.createOrder({
        id: createId('order'),
        userId,
        orderNo: createOrderNo(),
        amountCents,
        currency: 'CNY',
        wechatPrepayId: createMockPrepayId(),
        createdAt: at,
        updatedAt: at,
      });

      orderRepository.attachOrderToReservation(reservation.id, order.id, at);

      return {
        order: toOrderDto(order, { type: 'reservation', reservation }),
        payment: toPaymentDto(order),
      };
    }, { db: this.database });
  }

  mockPay({ userId, orderId, payResult = 'success' }) {
    if (payResult !== 'success') {
      throw badRequest('仅支持 mock 支付成功', { payResult });
    }

    return withTransaction((tx) => {
      const orderRepository = new OrderRepository(tx);
      const entitlementRepository = new OrderEntitlementRepository(tx);
      const entitlementService = new OrderEntitlementService({ entitlementRepository });
      const order = orderRepository.findByIdForUser(orderId, userId);

      if (!order) {
        throw notFound('订单不存在', { orderId });
      }

      const item = orderRepository.findPrimaryItem(order.id);
      const reservation = orderRepository.findReservationByOrderId(order.id);
      const type = item ? 'package' : 'reservation';

      if (order.status === 'paid') {
        return this.buildPaidResponse({ order, item, reservation, entitlementRepository });
      }

      if (order.status !== 'pending_payment') {
        throw badRequest('订单状态不可支付', { orderId, status: order.status });
      }

      const paidAt = nowIso();
      const paidOrder = orderRepository.markPaid({
        orderId: order.id,
        paidCents: order.amount_cents,
        transactionId: createMockTransactionId(order.order_no),
        rawNotifyJson: JSON.stringify({ provider: 'mock_wechat_pay', payResult }),
        paidAt,
      });

      if (type === 'package') {
        const entitlement = entitlementService.grantForPaidPackageOrder({
          order: paidOrder,
          item,
          paidAt,
        });

        return {
          order: toPaidOrderDto(paidOrder, { type }),
          entitlement: toEntitlementDto(entitlement, item),
        };
      }

      orderRepository.confirmReservationByOrderId(order.id, paidAt);
      const confirmedReservation = orderRepository.findReservationByOrderId(order.id);

      return {
        order: toPaidOrderDto(paidOrder, { type }),
        reservation: {
          id: confirmedReservation?.id ?? reservation?.id ?? null,
          status: confirmedReservation?.status ?? 'confirmed',
        },
      };
    }, { db: this.database });
  }

  buildPaidResponse({ order, item, reservation, entitlementRepository }) {
    const type = item ? 'package' : 'reservation';
    const response = { order: toPaidOrderDto(order, { type }) };

    if (type === 'package') {
      response.entitlement = toEntitlementDto(entitlementRepository.findByOrderId(order.id), item);
    } else {
      response.reservation = {
        id: reservation?.id ?? null,
        status: reservation?.status ?? 'confirmed',
      };
    }

    return response;
  }

  listOrders({ userId, status = null, limit = 20, cursor = null }) {
    if (status && !ORDER_STATUSES.has(status)) {
      throw badRequest('订单状态无效', { status });
    }

    const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 50);
    const rows = this.orderRepository.listForUser({
      userId,
      status,
      limit: normalizedLimit,
      cursor,
    });
    const pageRows = rows.slice(0, normalizedLimit);
    const hasMore = rows.length > normalizedLimit;

    return {
      items: pageRows.map((row) => toOrderListDto(row)),
      page: {
        limit: normalizedLimit,
        nextCursor: hasMore ? pageRows.at(-1).created_at : null,
        hasMore,
      },
    };
  }
}

export function toOrderDto(order, { type, reservation = null } = {}) {
  const createdAt = order.created_at;
  return {
    id: order.id,
    type,
    status: order.status,
    subject: order.plan_name ?? reservationSubject(reservation) ?? '预约支付',
    payAmountCent: order.amount_cents,
    currency: order.currency,
    createdAt,
    expiresAt: addMinutesIso(createdAt, 15),
  };
}

function toPaidOrderDto(order, { type }) {
  return {
    id: order.id,
    type,
    status: order.status,
    payAmountCent: order.amount_cents,
    currency: order.currency,
    paidAt: order.paid_at,
  };
}

function toOrderListDto(order) {
  const type = order.plan_name ? 'package' : 'reservation';
  return {
    id: order.id,
    type,
    status: order.status,
    subject: order.plan_name ?? reservationSubject(order) ?? '预约支付',
    payAmountCent: order.amount_cents,
    currency: order.currency,
    createdAt: order.created_at,
    paidAt: order.paid_at,
  };
}

function toEntitlementDto(entitlement, item) {
  if (!entitlement) return null;

  return {
    activePackageName: item?.plan_name ?? null,
    remainingMinutes: entitlement.remaining_minutes,
    validUntil: entitlement.valid_until,
  };
}

function reservationSubject(reservation) {
  if (!reservation) return null;
  if (reservation.reservation_start_at) return '预约座位';
  if (reservation.seat_no) return `${reservation.store_name ?? '门店'} ${reservation.seat_no}`;
  return '预约支付';
}

function addMinutesIso(dateIso, minutes) {
  const date = new Date(dateIso);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString();
}

function badRequest(message, details = null) {
  return new AppError({
    code: 'INVALID_ARGUMENT',
    message,
    status: 400,
    details,
  });
}
