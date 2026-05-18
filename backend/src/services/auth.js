import { createHmac, timingSafeEqual } from 'node:crypto';
import { env, isProduction } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { toApiUser } from './user.js';

const TOKEN_PREFIX = 'mock_access_token';
const DEFAULT_USER_ID = process.env.MOCK_DEFAULT_USER_ID || 'user_mock_002';
const EXPIRES_IN_SECONDS = env.authTokenExpiresSeconds;
const TOKEN_SECRET = env.authTokenSecret || (isProduction() ? '' : 'zixishi-dev-auth-secret');
const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

function sign(payload) {
  if (!TOKEN_SECRET) {
    throw new AppError({
      code: 'CONFIG_MISSING',
      message: 'AUTH_TOKEN_SECRET 未配置',
      status: 500,
    });
  }

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

  async loginWithWechat({ code }) {
    if (typeof code !== 'string' || code.trim() === '') {
      throw new AppError({
        code: 'INVALID_ARGUMENT',
        message: 'code 不能为空',
        status: 400,
        details: { field: 'code' }
      });
    }

    const normalizedCode = code.trim();
    const useMock = shouldUseMockLogin(normalizedCode);
    const user = useMock
      ? this.userService.assertActiveUser(DEFAULT_USER_ID)
      : await this.loginWithWechatCode(normalizedCode);

    this.userRepository.updateLastLogin(user.id, nowIso());
    const entitlementSummary = this.userService.getEntitlementSummary(user.id);

    return {
      accessToken: issueMockToken(user.id),
      tokenType: 'Bearer',
      expiresIn: EXPIRES_IN_SECONDS,
      user: toApiUser(user, entitlementSummary),
      mock: useMock
    };
  }

  async loginWithWechatCode(code) {
    assertWechatLoginConfig();

    const result = await code2Session(code);
    if (!result.openid) {
      throw new AppError({
        code: 'WECHAT_LOGIN_FAILED',
        message: '微信登录未返回 openid',
        status: 502,
        details: { errcode: result.errcode, errmsg: result.errmsg },
      });
    }

    const at = nowIso();
    const identity = this.userRepository.findWechatIdentity({
      appId: env.wechat.miniAppId,
      openid: result.openid,
    });

    if (identity) {
      this.userRepository.updateWechatIdentitySeen({
        appId: env.wechat.miniAppId,
        openid: result.openid,
        unionid: result.unionid || null,
        at,
      });
      return this.userService.assertActiveUser(identity.user_id);
    }

    const user = this.userRepository.createUser({
      id: createId('user'),
      nickname: '微信用户',
      at,
    });

    this.userRepository.createWechatIdentity({
      id: createId('wx'),
      userId: user.id,
      appId: env.wechat.miniAppId,
      openid: result.openid,
      unionid: result.unionid || null,
      at,
    });

    return user;
  }
}

function shouldUseMockLogin(code) {
  if (env.wechat.authProvider === 'mock') return true;
  if (env.wechat.authProvider === 'wechat') return false;
  return !isProduction() && (!env.wechat.miniAppId || !env.wechat.miniAppSecret || code === 'dev' || code === 'merchant-web-dev');
}

function assertWechatLoginConfig() {
  if (!env.wechat.miniAppId || !env.wechat.miniAppSecret) {
    throw new AppError({
      code: 'CONFIG_MISSING',
      message: '微信小程序登录配置缺失',
      status: 500,
      details: { required: ['WECHAT_MINI_APP_ID', 'WECHAT_MINI_APP_SECRET'] },
    });
  }
}

async function code2Session(code) {
  const url = new URL(CODE2SESSION_URL);
  url.searchParams.set('appid', env.wechat.miniAppId);
  url.searchParams.set('secret', env.wechat.miniAppSecret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.errcode) {
    throw new AppError({
      code: 'WECHAT_LOGIN_FAILED',
      message: data.errmsg || '微信登录失败',
      status: 502,
      details: { status: response.status, errcode: data.errcode, errmsg: data.errmsg },
    });
  }

  return data;
}
