import { createId } from '../utils/id.js';
import { addDaysIso } from '../utils/time.js';

export class OrderEntitlementService {
  constructor({ entitlementRepository }) {
    this.entitlementRepository = entitlementRepository;
  }

  grantForPaidPackageOrder({ order, item, paidAt }) {
    const existing = this.entitlementRepository.findByOrderId(order.id);
    if (existing) {
      return existing;
    }

    const entitlementType = mapPlanType(item.plan_type);
    const entitlement = this.entitlementRepository.createEntitlement({
      id: createId('ent'),
      userId: order.user_id,
      planId: item.plan_id,
      orderId: order.id,
      entitlementType,
      storeId: item.available_store_id,
      totalMinutes: entitlementType === 'minutes' ? item.minutes_total : null,
      remainingMinutes: entitlementType === 'minutes' ? item.minutes_total : null,
      totalUses: entitlementType === 'uses' ? item.uses_total : null,
      remainingUses: entitlementType === 'uses' ? item.uses_total : null,
      validFrom: paidAt,
      validUntil: item.valid_days ? addDaysIso(paidAt, item.valid_days) : null,
      createdAt: paidAt,
      updatedAt: paidAt,
    });

    this.entitlementRepository.createLedger({
      id: createId('ledger'),
      entitlementId: entitlement.id,
      userId: order.user_id,
      eventType: 'grant',
      deltaMinutes: entitlement.remaining_minutes ?? 0,
      deltaUses: entitlement.remaining_uses ?? 0,
      balanceMinutesAfter: entitlement.remaining_minutes,
      balanceUsesAfter: entitlement.remaining_uses,
      reservationId: null,
      studySessionId: null,
      orderId: order.id,
      idempotencyKey: `pay:${order.order_no}`,
      note: `Paid package order ${order.order_no}`,
      createdAt: paidAt,
    });

    return entitlement;
  }

  findActivePeriodEntitlement(input) {
    return this.entitlementRepository.findActivePeriodEntitlement(input);
  }
}

function mapPlanType(planType) {
  if (planType === 'period_pass') return 'period';
  if (planType === 'single_use') return 'uses';
  return 'minutes';
}
