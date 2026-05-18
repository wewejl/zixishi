import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { nowIso } from '../utils/time.js';
import { toApiUser } from './user.js';

const TOKEN_PREFIX = 'mock_access_token';
const DEFAULT_USER_ID = process.env.MOCK_DEFAULT_USER_ID || 'user_mock_002';
const EXPIRES_IN_SECONDS = 7200;
const TOKEN_SECRET = process.env.MOCK_AUTH_SECRET || 'zixishi-mock-auth-secret';

function sign(payload) {
  return createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
}

export function issueMockToken(userId, issuedAt = Date.now()) {
  const expiresAt = issuedAt + EXPIRES_IN_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, exp: expiresAt })).toString('base64url');
  return `${TOKEN_PREFIX}.${payload}.${sign(payload)}`;
}

export function verifyMockToken(token) {
  if (!token?.startsWith(`${TOKEN_PREFIX}.`)) {
    throw unauthorizedToken();
  }

  const [, payload, signature] = token.split('.');
  if (!payload || !signature) {
    throw unauthorizedToken();
  }

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw unauthorizedToken();
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw unauthorizedToken();
  }

  if (!parsed.userId || !parsed.exp || parsed.exp <= Date.now()) {
    throw unauthorizedToken();
  }

  return parsed;
}

function unauthorizedToken() {
  return new AppError({
    code: 'UNAUTHORIZED',
    message: '未登录或 token 无效',
    status: 401,
    details: { authHeader: 'Bearer token required' }
  });
}

export class AuthService {
  constructor({ userRepository, userService }) {
    this.userRepository = userRepository;
    this.userService = userService;
  }

  loginWithWechat({ code }) {
    if (typeof code !== 'string' || code.trim() === '') {
      throw new AppError({
        code: 'INVALID_ARGUMENT',
        message: 'code 不能为空',
        status: 400,
        details: { field: 'code' }
      });
    }

    const user = this.userService.assertActiveUser(DEFAULT_USER_ID);
    this.userRepository.updateLastLogin(user.id, nowIso());
    const entitlementSummary = this.userService.getEntitlementSummary(user.id);

    return {
      accessToken: issueMockToken(user.id),
      tokenType: 'Bearer',
      expiresIn: EXPIRES_IN_SECONDS,
      user: toApiUser(user, entitlementSummary),
      mock: true
    };
  }
}
