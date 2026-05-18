import { db } from '../db.js';
import { PlanRepository } from '../repositories/PlanRepository.js';

const PLAN_COPY = {
  single_use: {
    description: '适合临时到店自习使用。',
    features: ['开放式座位使用权限', '极速无线网络'],
    disabledFeatures: [],
    badge: null,
  },
  minutes_pack: {
    description: '适合阶段性自习和周末集中学习。',
    features: ['开放式座位使用权限', '极速无线网络'],
    disabledFeatures: ['会议室使用权限'],
    badge: null,
  },
  period_pass: {
    description: '深度、无干扰的沉浸式专注。',
    features: ['有效期内长期通行', '优先预约座位', '极速无线网络'],
    disabledFeatures: [],
    badge: '推荐',
  },
};

export class PackageService {
  constructor({ planRepository = new PlanRepository(db) } = {}) {
    this.planRepository = planRepository;
  }

  listPackages({ storeId = null } = {}) {
    return {
      items: this.planRepository.listActive({ storeId }).map(toPackageDto),
    };
  }
}

export function toPackageDto(plan) {
  const copy = PLAN_COPY[plan.plan_type] ?? PLAN_COPY.minutes_pack;

  return {
    id: plan.id,
    name: plan.name,
    description: copy.description,
    priceCent: plan.price_cents,
    currency: plan.currency,
    durationDays: plan.valid_days,
    includedMinutes: plan.plan_type === 'period_pass' ? null : plan.minutes_total,
    features: copy.features,
    disabledFeatures: copy.disabledFeatures,
    badge: copy.badge,
    purchaseEnabled: plan.status === 'active',
  };
}
