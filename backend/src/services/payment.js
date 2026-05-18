import { createDecipheriv, createHash, randomBytes, createSign, createVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { env, isProduction } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { createId } from '../utils/id.js';

const WECHAT_PAY_HOST = 'https://api.mch.weixin.qq.com';
const JSAPI_PREPAY_PATH = '/v3/pay/transactions/jsapi';

export function createMockPrepayId() {
  return `mock_prepay_${randomBytes(8).toString('hex')}`;
}

export function createMockTransactionId(orderNo) {
  const digest = createHash('sha256')
    .update(`${orderNo}:${Date.now()}:${randomBytes(8).toString('hex')}`)
    .digest('hex')
    .slice(0, 24);

  return `mock_tx_${digest}`;
}

export function toMockPaymentDto(order) {
  return {
    provider: 'mock_wechat_pay',
    mock: true,
    prepayId: order.wechat_prepay_id,
  };
}

export function isWechatPayEnabled() {
  if (env.wechatPay.mode === 'mock') return false;
  return Boolean(
    env.wechatPay.mchId
      && env.wechatPay.mchSerialNo
      && loadPrivateKey({ optional: true })
      && env.wechatPay.notifyUrl
      && env.wechat.miniAppId
  );
}

export function assertWechatPayConfig() {
  const missing = [];
  if (!env.wechat.miniAppId) missing.push('WECHAT_MINI_APP_ID');
  if (!env.wechatPay.mchId) missing.push('WECHAT_PAY_MCH_ID');
  if (!env.wechatPay.mchSerialNo) missing.push('WECHAT_PAY_MCH_SERIAL_NO');
  if (!loadPrivateKey({ optional: true })) missing.push('WECHAT_PAY_PRIVATE_KEY or WECHAT_PAY_PRIVATE_KEY_PATH');
  if (!env.wechatPay.notifyUrl) missing.push('WECHAT_PAY_NOTIFY_URL');

  if (missing.length) {
    throw new AppError({
      code: 'CONFIG_MISSING',
      message: '微信支付配置缺失',
      status: 500,
      details: { required: missing },
    });
  }
}

export async function createWechatJsapiPayment({ order, openid, description, clientIp }) {
  if (!isWechatPayEnabled()) {
    if (isProduction() || env.wechatPay.mode === 'wechat_pay') {
      assertWechatPayConfig();
    }

    const prepayId = order.wechat_prepay_id || createMockPrepayId();
    return {
      prepayId,
      payment: toMockPaymentDto({
        ...order,
        wechat_prepay_id: prepayId,
      }),
    };
  }

  if (!openid) {
    throw new AppError({
      code: 'WECHAT_OPENID_MISSING',
      message: '用户缺少微信 openid，无法发起小程序支付',
      status: 400,
    });
  }

  const body = {
    appid: env.wechat.miniAppId,
    mchid: env.wechatPay.mchId,
    description: sanitizeDescription(description),
    out_trade_no: order.order_no,
    notify_url: env.wechatPay.notifyUrl,
    amount: {
      total: order.amount_cents,
      currency: order.currency || 'CNY',
    },
    payer: { openid },
    scene_info: clientIp ? { payer_client_ip: clientIp } : undefined,
  };
  const response = await wechatPayRequest('POST', JSAPI_PREPAY_PATH, body);
  const prepayId = response.prepay_id;

  if (!prepayId) {
    throw new AppError({
      code: 'WECHAT_PAY_PREPAY_FAILED',
      message: '微信支付未返回 prepay_id',
      status: 502,
      details: response,
    });
  }

  return {
    prepayId,
    payment: buildMiniProgramPayment(prepayId),
  };
}

export function verifyWechatPayNotify({ headers, rawBody }) {
  const publicKey = loadPlatformPublicKey({ optional: true });

  if (!publicKey) {
    if (isProduction()) {
      throw new AppError({
        code: 'CONFIG_MISSING',
        message: '微信支付平台公钥未配置，无法验签回调',
        status: 500,
        details: { required: ['WECHAT_PAY_PLATFORM_PUBLIC_KEY or WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH'] },
      });
    }
    return true;
  }

  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const verifier = createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();

  if (!timestamp || !nonce || !signature || !verifier.verify(publicKey, signature, 'base64')) {
    throw new AppError({
      code: 'WECHAT_PAY_NOTIFY_SIGNATURE_INVALID',
      message: '微信支付回调验签失败',
      status: 401,
    });
  }

  return true;
}

export function decryptWechatPayResource(resource) {
  if (!env.wechatPay.apiV3Key || env.wechatPay.apiV3Key.length !== 32) {
    throw new AppError({
      code: 'CONFIG_MISSING',
      message: 'WECHAT_PAY_API_V3_KEY 必须是 32 字节',
      status: 500,
    });
  }

  if (resource?.algorithm !== 'AEAD_AES_256_GCM') {
    throw new AppError({
      code: 'WECHAT_PAY_NOTIFY_UNSUPPORTED_ALGORITHM',
      message: '不支持的微信支付回调加密算法',
      status: 400,
      details: { algorithm: resource?.algorithm },
    });
  }

  const ciphertext = Buffer.from(resource.ciphertext || '', 'base64');
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env.wechatPay.apiV3Key), resource.nonce);
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data));
  }
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
}

export function createOrderNo() {
  const compact = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return `ORD${compact}${createId('').replace(/^_/, '').slice(0, 10).toUpperCase()}`;
}

async function wechatPayRequest(method, path, body) {
  const bodyText = JSON.stringify(body);
  const response = await fetch(`${WECHAT_PAY_HOST}${path}`, {
    method,
    headers: {
      Authorization: buildAuthorization({ method, path, body: bodyText }),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: bodyText,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError({
      code: 'WECHAT_PAY_REQUEST_FAILED',
      message: data.message || '微信支付请求失败',
      status: 502,
      details: { status: response.status, code: data.code, message: data.message },
    });
  }

  return data;
}

function buildAuthorization({ method, path, body }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const signature = signWechatPayMessage(`${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`);

  return [
    'WECHATPAY2-SHA256-RSA2048',
    `mchid="${env.wechatPay.mchId}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${env.wechatPay.mchSerialNo}"`,
  ].join(' ');
}

function buildMiniProgramPayment(prepayId) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomBytes(16).toString('hex');
  const packageValue = `prepay_id=${prepayId}`;
  const paySign = signWechatPayMessage(`${env.wechat.miniAppId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`);

  return {
    provider: 'wxpay',
    mock: false,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign,
  };
}

function signWechatPayMessage(message) {
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(loadPrivateKey(), 'base64');
}

function loadPrivateKey({ optional = false } = {}) {
  const key = env.wechatPay.privateKey
    ? env.wechatPay.privateKey.replace(/\\n/g, '\n')
    : env.wechatPay.privateKeyPath
      ? readFileSync(env.wechatPay.privateKeyPath, 'utf8')
      : '';

  if (!key && !optional) assertWechatPayConfig();
  return key;
}

function loadPlatformPublicKey({ optional = false } = {}) {
  const key = env.wechatPay.platformPublicKey
    ? env.wechatPay.platformPublicKey.replace(/\\n/g, '\n')
    : env.wechatPay.platformPublicKeyPath
      ? readFileSync(env.wechatPay.platformPublicKeyPath, 'utf8')
      : '';

  if (!key && !optional) {
    throw new AppError({
      code: 'CONFIG_MISSING',
      message: '微信支付平台公钥未配置',
      status: 500,
    });
  }
  return key;
}

function sanitizeDescription(value) {
  return String(value || '静谧空间订单').slice(0, 127);
}
