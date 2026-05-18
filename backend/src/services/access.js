import { createHash, randomInt } from 'node:crypto';
import { db } from '../db.js';
import { AppError, notFound } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { addDaysIso, nowIso } from '../utils/time.js';
import { withTransaction } from '../repositories/transaction.js';
import { AccessRepository } from '../repositories/AccessRepository.js';
import { OrderEntitlementRepository } from '../repositories/OrderEntitlementRepository.js';
import { StoreRepository } from '../repositories/StoreRepository.js';
import { OrderEntitlementService } from './orderEntitlement.js';

const ACCESS_DEVICE_MAIN = 'access_device_main';
const CODE_PEPPER = process.env.ACCESS_CODE_PEPPER ?? 'zixishi_mvp_access_code_pepper';

export class AccessService {
  constructor({
    database = db,
    accessRepository = new AccessRepository(database),
    entitlementRepository = new OrderEntitlementRepository(database),
    storeRepository = new StoreRepository(database),
  } = {}) {
    this.database = database;
    this.accessRepository = accessRepository;
    this.entitlementRepository = entitlementRepository;
    this.storeRepository = storeRepository;
    this.entitlementService = new OrderEntitlementService({ entitlementRepository });
  }

  unlock({ userId, storeId, deviceId = ACCESS_DEVICE_MAIN, source = 'mini_program', clientContext = {} }) {
    if (!storeId) {
      throw badRequest('storeId 不能为空');
    }

    this.assertActiveStore(storeId);

    const requestedDeviceId = deviceId || ACCESS_DEVICE_MAIN;
    const at = nowIso();
    const accessRepository = this.accessRepository;
    const device = accessRepository.findActiveDevice({ storeId, deviceId: requestedDeviceId });

    if (!device) {
      this.writeEvent({
        userId,
        storeId,
        deviceId: null,
        result: 'denied',
        reason: 'device_unavailable',
        at,
        raw: { source, clientContext, requestedDeviceId },
      });
      throw accessDenied('门禁设备不可用', { storeId, deviceId: requestedDeviceId });
    }

    const grant = this.findUnlockGrant({ userId, storeId, at });

    if (!grant) {
      this.writeEvent({
        userId,
        storeId,
        deviceId: requestedDeviceId,
        result: 'denied',
        reason: 'no_active_access',
        at,
        raw: { source, clientContext },
      });
      throw accessDenied('当前没有可使用的预约或会员权益', { storeId, deviceId: requestedDeviceId });
    }

    this.writeEvent({
      userId,
      storeId,
      deviceId: requestedDeviceId,
      accessCodeId: grant.accessCodeId,
      reservationId: grant.reservationId,
      studySessionId: grant.studySessionId,
      result: 'granted',
      reason: grant.reason,
      at,
      raw: { source, clientContext },
    });

    if (grant.accessCodeId) {
      accessRepository.incrementCodeUse(grant.accessCodeId, at);
    }

    return {
      unlock: {
        id: createId('unlock'),
        status: 'granted',
        storeId,
        deviceId: requestedDeviceId,
        usableUntil: grant.usableUntil,
        mock: true,
      },
    };
  }


  unlockByMerchant({ operatorId, targetUserId = null, storeId, deviceId = ACCESS_DEVICE_MAIN, reason = 'merchant_remote_unlock', clientContext = {} }) {
    if (!storeId) throw badRequest('storeId 不能为空');
    this.assertActiveStore(storeId);

    const at = nowIso();
    const requestedDeviceId = deviceId || ACCESS_DEVICE_MAIN;
    const accessRepository = this.accessRepository;
    const device = accessRepository.findActiveDevice({ storeId, deviceId: requestedDeviceId });
    const actingUserId = targetUserId || operatorId;

    if (!device) {
      this.writeEvent({
        userId: actingUserId,
        storeId,
        deviceId: null,
        result: 'denied',
        reason: 'device_unavailable',
        at,
        raw: { source: 'merchant_console', operatorId, reason, clientContext, requestedDeviceId },
      });
      throw accessDenied('门禁设备不可用', { storeId, deviceId: requestedDeviceId });
    }

    this.writeEvent({
      userId: actingUserId,
      storeId,
      deviceId: requestedDeviceId,
      result: 'granted',
      reason: 'merchant_remote_unlock',
      at,
      raw: { source: 'merchant_console', operatorId, reason, clientContext, targetUserId },
    });

    return {
      unlock: {
        id: createId('unlock'),
        status: 'granted',
        storeId,
        deviceId: requestedDeviceId,
        targetUserId: actingUserId,
        operatorId,
        usableUntil: addMinutesIso(at, 5),
        mock: true,
      },
    };
  }
  getLongTermCode({ userId, storeId }) {
    if (!storeId) {
      throw badRequest('storeId 不能为空');
    }

    this.assertActiveStore(storeId);

    const at = nowIso();
    this.requireLongTermEntitlement({ userId, storeId, now: at });
    const code = this.accessRepository.findActiveLongTermCode({ userId, storeId, now: at });

    return {
      code: code ? toLongTermCodeDto(code) : null,
    };
  }

  refreshLongTermCode({ userId, storeId }) {
    if (!storeId) {
      throw badRequest('storeId 不能为空');
    }

    this.assertActiveStore(storeId);

    return withTransaction((tx) => {
      const accessRepository = new AccessRepository(tx);
      const entitlementRepository = new OrderEntitlementRepository(tx);
      const entitlementService = new OrderEntitlementService({ entitlementRepository });
      const at = nowIso();
      const entitlement = entitlementService.findActivePeriodEntitlement({ userId, storeId, now: at });

      if (!entitlement) {
        throw forbidden('仅长期会员或有效长期权益可查看通行码', { storeId });
      }

      const previous = accessRepository.findActiveLongTermCode({ userId, storeId, now: at });
      accessRepository.rotateLongTermCodes({ userId, storeId, rotatedAt: at });

      const displayCode = createDisplayCode();
      const code = accessRepository.createLongTermCode({
        id: createId('code'),
        userId,
        storeId,
        codeHash: hashCode(displayCode),
        codeSuffix: displayCode.replace(/\s/g, '').slice(-4),
        validFrom: at,
        validUntil: entitlement.valid_until && entitlement.valid_until < addDaysIso(at, 30)
          ? entitlement.valid_until
          : addDaysIso(at, 30),
        rotatedFromId: previous?.id ?? null,
        createdAt: at,
        updatedAt: at,
      });

      return {
        code: {
          ...toLongTermCodeDto(code),
          displayCode,
        },
      };
    }, { db: this.database });
  }

  findUnlockGrant({ userId, storeId, at }) {
    const windowStart = addMinutesIso(at, -15);
    const windowEnd = addMinutesIso(at, 15);
    const reservation = this.accessRepository.findCurrentReservation({
      userId,
      storeId,
      now: at,
      windowStart,
      windowEnd,
    });

    if (reservation) {
      return {
        reservationId: reservation.id,
        studySessionId: null,
        accessCodeId: null,
        reason: 'reservation',
        usableUntil: addMinutesIso(reservation.end_at, 15),
      };
    }

    const session = this.accessRepository.findActiveStudySession({ userId, storeId });
    if (session) {
      return {
        reservationId: session.reservation_id,
        studySessionId: session.id,
        accessCodeId: null,
        reason: 'active_study_session',
        usableUntil: addDaysIso(at, 1),
      };
    }

    const entitlement = this.entitlementService.findActivePeriodEntitlement({ userId, storeId, now: at });
    if (!entitlement) {
      return null;
    }

    const code = this.accessRepository.findActiveLongTermCode({ userId, storeId, now: at });

    return {
      reservationId: null,
      studySessionId: null,
      accessCodeId: code?.id ?? null,
      reason: 'long_term_entitlement',
      usableUntil: entitlement.valid_until ?? addDaysIso(at, 1),
    };
  }

  requireLongTermEntitlement({ userId, storeId, now }) {
    const entitlement = this.entitlementService.findActivePeriodEntitlement({ userId, storeId, now });

    if (!entitlement) {
      throw forbidden('仅长期会员或有效长期权益可查看通行码', { storeId });
    }

    return entitlement;
  }

  assertActiveStore(storeId) {
    const store = this.storeRepository.findById(storeId);
    if (!store) {
      throw notFound('门店不存在', { storeId });
    }
    if (store.status !== 'open') {
      throw accessDenied('门店当前不可用', { storeId });
    }
    return store;
  }

  writeEvent({ userId, storeId, deviceId, accessCodeId = null, reservationId = null, studySessionId = null, result, reason, at, raw }) {
    this.accessRepository.createAccessEvent({
      id: createId('access_event'),
      storeId,
      deviceId,
      userId,
      accessCodeId,
      reservationId,
      studySessionId,
      direction: 'entry',
      result,
      reason,
      occurredAt: at,
      rawPayloadJson: JSON.stringify(raw ?? {}),
      createdAt: at,
    });
  }
}

function toLongTermCodeDto(code) {
  return {
    storeId: code.store_id,
    maskedCode: `**** ${code.code_suffix}`,
    codeSuffix: code.code_suffix,
    expiresAt: code.valid_until,
    refreshAfter: addMinutesIso(code.created_at, 10),
    mock: true,
  };
}

function createDisplayCode() {
  const left = String(randomInt(0, 10000)).padStart(4, '0');
  const right = String(randomInt(0, 10000)).padStart(4, '0');
  return `${left} ${right}`;
}

function hashCode(displayCode) {
  return createHash('sha256')
    .update(`${CODE_PEPPER}:${displayCode.replace(/\s/g, '')}`)
    .digest('hex');
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

function forbidden(message, details = null) {
  return new AppError({
    code: 'FORBIDDEN',
    message,
    status: 403,
    details,
  });
}

function accessDenied(message, details = null) {
  return new AppError({
    code: 'ACCESS_DENIED',
    message,
    status: 403,
    details,
  });
}
