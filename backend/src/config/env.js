export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appBaseUrl: process.env.APP_BASE_URL || '',
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || process.env.MOCK_AUTH_SECRET || '',
  authTokenExpiresSeconds: Number(process.env.AUTH_TOKEN_EXPIRES_SECONDS || 7200),
  wechat: {
    authProvider: process.env.WECHAT_AUTH_PROVIDER || '',
    miniAppId: process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_MINIAPP_APP_ID || '',
    miniAppSecret: process.env.WECHAT_MINI_APP_SECRET || process.env.WECHAT_MINIAPP_SECRET || '',
  },
  wechatPay: {
    mode: process.env.PAYMENT_PROVIDER || process.env.WECHAT_PAY_MODE || '',
    mchId: process.env.WECHAT_PAY_MCH_ID || '',
    mchSerialNo: process.env.WECHAT_PAY_MCH_SERIAL_NO || process.env.WECHAT_PAY_SERIAL_NO || '',
    privateKey: process.env.WECHAT_PAY_PRIVATE_KEY || '',
    privateKeyPath: process.env.WECHAT_PAY_PRIVATE_KEY_PATH || '',
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || '',
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || '',
    platformPublicKey: process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY || '',
    platformPublicKeyPath: process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH || '',
  },
};

export function isProduction() {
  return env.nodeEnv === 'production';
}
