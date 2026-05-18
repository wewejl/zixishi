import { AppError, notFound } from '../utils/errors.js';
import { nowIso } from '../utils/time.js';

export function toApiUser(user, entitlementSummary) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    membershipLevel: entitlementSummary.membershipLevel,
    isLongTermMember: entitlementSummary.isLongTermMember
  };
}

export class UserService {
  constructor({ userRepository, entitlementReadRepository }) {
    this.userRepository = userRepository;
    this.entitlementReadRepository = entitlementReadRepository;
  }

  getActiveUser(userId) {
    const user = this.userRepository.findById(userId);
    if (!user || user.status !== 'active') {
      throw notFound('用户不存在或不可用', { userId });
    }

    return user;
  }

  getEntitlementSummary(userId, at = nowIso()) {
    const entitlements = this.entitlementReadRepository.listActiveForUser(userId, at);
    const remainingMinutes = entitlements.reduce((sum, entitlement) => {
      return sum + (entitlement.remaining_minutes || 0);
    }, 0);
    const primary = entitlements[0] || null;
    const isLongTermMember = entitlements.some((entitlement) => entitlement.entitlement_type === 'period');

    return {
      remainingMinutes,
      activePackageName: primary?.plan_name || null,
      validUntil: primary?.valid_until || null,
      membershipLevel: entitlements.length > 0 ? 'premium' : 'basic',
      isLongTermMember
    };
  }

  getStats(userId) {
    const row = this.userRepository.db.prepare(`
      SELECT COALESCE(SUM(duration_minutes), 0) AS total
      FROM study_sessions
      WHERE user_id = ? AND status = 'completed'
    `).get(userId);

    return {
      totalStudyMinutes: row?.total || 0,
      todayRank: null,
      streakDays: 0
    };
  }

  getMe(userId) {
    const user = this.getActiveUser(userId);
    const entitlementSummary = this.getEntitlementSummary(userId);

    return {
      user: toApiUser(user, entitlementSummary),
      stats: this.getStats(userId),
      entitlement: {
        remainingMinutes: entitlementSummary.remainingMinutes,
        activePackageName: entitlementSummary.activePackageName,
        validUntil: entitlementSummary.validUntil
      }
    };
  }

  assertActiveUser(userId) {
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: '未登录或 token 无效',
        status: 401,
        details: { userId }
      });
    }
    if (user.status !== 'active') {
      throw new AppError({
        code: 'FORBIDDEN',
        message: '用户已被禁用',
        status: 403,
        details: { userId }
      });
    }
    return user;
  }
}
