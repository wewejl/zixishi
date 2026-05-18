# 上线清单

## 需要你准备的资料

1. 微信小程序
   - 小程序 AppID
   - 小程序 AppSecret
   - 微信公众平台配置 `request 合法域名`：`https://api.example.com`
   - `frontend/src/manifest.json` 的 `mp-weixin.appid`

2. 微信支付商户平台
   - 商户号 `mch_id`
   - 商户 API 证书序列号
   - 商户 API 私钥 `apiclient_key.pem`
   - API v3 密钥，必须为 32 字节
   - 平台公钥或平台证书
   - 将小程序 AppID 绑定到商户号
   - 支付回调地址：`https://api.example.com/api/payments/wechat/notify`

3. 服务器和域名
   - HTTPS API 域名
   - Node 版本需支持 `node:sqlite`
   - SQLite 数据文件持久化目录和备份策略
   - 生产环境变量按 `.env.example` 填写

## 当前代码状态

- `POST /api/auth/wechat-login`：生产配置完整时使用微信 `jscode2session` 换取 openid，并创建/绑定本地用户。
- `POST /api/orders/{orderId}/wechat-pay`：返回小程序 `uni.requestPayment` 所需参数。
- `POST /api/payments/wechat/notify`：处理微信支付成功通知，验签、解密、按订单号幂等完成订单。
- 开发环境未配置微信资料时仍可走 mock，生产环境缺配置会报错，不会静默 mock。
- 门禁能力保留现有 mock 接口，等真实门锁供应商确定后接适配层。

## 最小验收顺序

1. 填好后端环境变量，启动 API。
2. 用微信开发者工具运行小程序，确认 `wx.login` 能换到业务 token。
3. 创建 1 分钱测试套餐或测试订单。
4. 拉起微信支付，完成支付。
5. 确认微信支付回调打到 `/api/payments/wechat/notify`。
6. 确认订单变为 `paid`，套餐权益或预约状态更新。
7. 再重复支付同一订单，确认不会重复发权益。

## 仍然必须补的上线项

- 商家端权限模型：商家接口不能复用普通用户登录。
- 订单过期任务：超时关闭 `pending_payment` 订单和预约。
- CORS 生产白名单。
- CI：后端启动、H5 构建、商家端构建、核心 API 冒烟。
- 微信开发者工具真机验收：登录、支付、合法域名、页面跳转、包体。
