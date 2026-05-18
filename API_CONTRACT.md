# API 契约 - 微信小程序 + Node 后端 MVP

本文档定义「静谧空间」MVP 阶段 API 契约，供微信小程序前端、Node 后端、数据模型和页面实现并发对齐使用。当前后端已存在 `GET /api/health`，必须保留。

## 1. 统一约定

### 1.1 Base URL

- 本地开发：`http://localhost:3000`
- API 前缀：`/api`
- 示例完整地址：`http://localhost:3000/api/health`

### 1.2 认证 Header

除 `GET /api/health`、`POST /api/auth/wechat-login` 外，MVP 业务接口默认需要登录态。

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

MVP 阶段 `accessToken` 可由后端 mock 签发；接口形态保留 Bearer Token，后续可替换为真实微信登录换取的业务 token。

### 1.3 时间格式

- 所有时间字段使用 ISO 8601 字符串，带时区偏移或 `Z`，例如：`2026-05-18T10:00:00+08:00`。
- 仅表示日期时使用 `YYYY-MM-DD`，例如：`2026-05-18`。
- 门店营业时间等本地展示时间由服务端返回完整时间或 `HH:mm` 展示字段，业务判断以 ISO 时间为准。

### 1.4 金额单位

- 所有金额字段使用整数，单位为分，字段命名使用 `amountCent`、`priceCent`、`payAmountCent`。
- 例如 `1500` 表示 `15.00` 元。
- 币种字段使用 ISO 4217，人民币为 `CNY`。

### 1.5 分页

列表接口统一使用游标分页：

请求参数：

```text
limit=20
cursor=<opaqueCursor>
```

响应结构：

```json
{
  "items": [],
  "page": {
    "limit": 20,
    "nextCursor": "eyJpZCI6IjEyMyJ9",
    "hasMore": true
  }
}
```

MVP 中数据量较小的配置类接口可不分页，例如套餐列表。

### 1.6 错误响应格式

所有错误响应统一返回：

```json
{
  "error": {
    "code": "SEAT_NOT_AVAILABLE",
    "message": "座位当前不可预约",
    "requestId": "req_20260518100000_abc123",
    "details": {
      "seatId": "seat_b3"
    }
  }
}
```

常用 HTTP 状态码：

- `400`：参数错误或业务前置条件不满足
- `401`：未登录或 token 无效
- `403`：无权限，例如非长期会员访问长期通行码
- `404`：资源不存在
- `409`：资源状态冲突，例如座位已被预约
- `500`：服务端错误

常用错误码：

- `INVALID_ARGUMENT`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `SEAT_NOT_AVAILABLE`
- `RESERVATION_CONFLICT`
- `RESERVATION_NOT_ACTIVE`
- `PACKAGE_NOT_FOUND`
- `ORDER_NOT_PAYABLE`
- `ACCESS_DENIED`
- `MOCK_PROVIDER_ERROR`

## 2. 通用对象

### 2.1 User

```json
{
  "id": "user_001",
  "nickname": "陈默",
  "avatarUrl": "https://example.com/avatar.png",
  "membershipLevel": "premium",
  "isLongTermMember": true
}
```

字段说明：

- `membershipLevel`、`isLongTermMember` 是 API 聚合字段，由用户当前有效权益、套餐和长期会员资格计算得出，不要求直接落在 `users` 表。

### 2.2 Store

```json
{
  "id": "store_default",
  "name": "静谧空间 A 区",
  "status": "open",
  "todayCloseAt": "2026-05-18T23:00:00+08:00",
  "timezone": "Asia/Shanghai"
}
```

### 2.3 Seat

```json
{
  "id": "seat_b3",
  "code": "B3",
  "area": "安静区",
  "features": ["quiet", "window", "power"],
  "physicalStatus": "available"
}
```

基础座位对象只描述座位主数据和物理状态。DB `seats.status` 如保留 `status` 命名，也必须只表示物理状态，不承载预约占用结果。

座位物理状态枚举：

- `available`：基础可运营/可参与预约计算
- `locked`：人工锁定，暂不可预约
- `maintenance`：维护中
- `disabled`：停用

计算后的座位可用性只由座位可用性接口返回，字段名为 `availabilityStatus`，枚举为 `available`、`reserved`、`occupied`、`locked`、`maintenance`、`disabled`。预约、签到和会话占用不得写回座位主表作为物理状态。

### 2.4 Reservation

```json
{
  "id": "resv_001",
  "storeId": "store_default",
  "seatId": "seat_b3",
  "seatCode": "B3",
  "status": "confirmed",
  "startAt": "2026-05-18T10:00:00+08:00",
  "endAt": "2026-05-18T12:00:00+08:00",
  "priceCent": 1500,
  "currency": "CNY"
}
```

预约状态枚举：

- `pending_payment`
- `confirmed`
- `checked_in`
- `completed`
- `cancelled`
- `expired`
- `no_show`

## 3. MVP 接口列表

### 3.1 健康检查

**Method / Path**

`GET /api/health`

**用途**

检查后端服务是否可用。该接口已存在，必须保持兼容。

**请求参数**

无。

**响应示例**

```json
{
  "ok": true,
  "service": "zixishi-backend"
}
```

**关键业务规则**

- 不需要认证。
- 后续可增加 `version`、`time` 字段，但不得删除现有 `ok` 和 `service` 字段。

### 3.2 微信登录

**Method / Path**

`POST /api/auth/wechat-login`

**用途**

小程序使用 `wx.login` 获取的 `code` 登录，后端返回业务 token 和用户信息。

**请求体**

```json
{
  "code": "wx_login_code_from_client",
  "encryptedData": "optional_encrypted_user_info",
  "iv": "optional_iv"
}
```

**响应示例**

```json
{
  "accessToken": "mock_access_token.<payload>.<signature>",
  "tokenType": "Bearer",
  "expiresIn": 7200,
  "user": {
    "id": "user_001",
    "nickname": "陈默",
    "avatarUrl": "https://example.com/avatar.png",
    "membershipLevel": "premium",
    "isLongTermMember": true
  },
  "mock": true
}
```

**关键业务规则**

- MVP 可 mock：允许任意非空 `code` 换取固定测试用户。
- 接口形态兼容真实微信登录：后续后端用 `code` 调用微信 `jscode2session`，保存 `openid`/`unionid`，再签发业务 token。
- 不把微信 `session_key` 返回给小程序。

### 3.3 当前用户信息

**Method / Path**

`GET /api/me`

**用途**

获取个人中心所需用户、会员、学习统计和权益摘要。

**请求参数**

无。

**响应示例**

```json
{
  "user": {
    "id": "user_001",
    "nickname": "陈默",
    "avatarUrl": "https://example.com/avatar.png",
    "membershipLevel": "premium",
    "isLongTermMember": true
  },
  "stats": {
    "totalStudyMinutes": 74400,
    "todayRank": 12,
    "streakDays": 365
  },
  "entitlement": {
    "remainingMinutes": 2550,
    "activePackageName": "月卡",
    "validUntil": "2026-06-18T23:59:59+08:00"
  }
}
```

**关键业务规则**

- 需要认证。
- `remainingMinutes` 是用户可继续使用座位/门禁的剩余套餐分钟数。
- `todayRank` MVP 可由 mock 数据返回，后续按当天学习时长计算。

### 3.4 门店首页摘要

**Method / Path**

`GET /api/stores/{storeId}/summary`

**用途**

获取首页展示的营业状态、剩余座位、正在学习人数、新人福利和推荐座位。

**路径参数**

- `storeId`：门店 ID，例如 `store_default`。

**响应示例**

```json
{
  "store": {
    "id": "store_default",
    "name": "静谧空间 A 区",
    "status": "open",
    "todayCloseAt": "2026-05-18T23:00:00+08:00",
    "timezone": "Asia/Shanghai"
  },
  "metrics": {
    "availableSeatCount": 24,
    "studyingUserCount": 188
  },
  "benefit": {
    "title": "新人专享福利",
    "description": "首次到店赠送2小时体验",
    "claimable": true
  },
  "recommendedSeats": [
    {
      "id": "seat_a1",
      "code": "A1",
      "title": "阳光窗边位",
      "area": "A区",
      "description": "自然采光",
      "availabilityStatus": "available"
    },
    {
      "id": "seat_b3",
      "code": "B3",
      "title": "深度专注区",
      "area": "安静区",
      "description": "隔音",
      "availabilityStatus": "available"
    }
  ]
}
```

**关键业务规则**

- 需要认证。
- 门店 `status` 可取 `open`、`closed`、`maintenance`。
- MVP 允许 `studyingUserCount` 为 mock 统计；座位可用数应与座位状态接口口径一致。

### 3.5 座位可用性

**Method / Path**

`GET /api/stores/{storeId}/seat-availability`

**用途**

获取预约页和座位状态页需要的时间段、筛选条件和座位可用状态。

**路径参数**

- `storeId`：门店 ID。

**查询参数**

```text
date=2026-05-18
startAt=2026-05-18T10:00:00+08:00
endAt=2026-05-18T12:00:00+08:00
features=quiet,window,power
```

`startAt`、`endAt` 可选；未传时返回当天默认可预约时间段和当前状态。

**响应示例**

```json
{
  "storeId": "store_default",
  "date": "2026-05-18",
  "timeSlots": [
    {
      "startAt": "2026-05-18T09:00:00+08:00",
      "endAt": "2026-05-18T10:00:00+08:00",
      "available": true
    },
    {
      "startAt": "2026-05-18T10:00:00+08:00",
      "endAt": "2026-05-18T11:00:00+08:00",
      "available": true
    }
  ],
  "seats": [
    {
      "id": "seat_a1",
      "code": "A1",
      "area": "安静区",
      "features": ["quiet", "window", "power"],
      "physicalStatus": "available",
      "availabilityStatus": "available"
    },
    {
      "id": "seat_b2",
      "code": "B2",
      "area": "安静区",
      "features": ["quiet", "power"],
      "physicalStatus": "available",
      "availabilityStatus": "reserved"
    }
  ]
}
```

**关键业务规则**

- 需要认证。
- 只能查询门店营业时间内的时间段。
- `features` 使用逗号分隔，MVP 支持 `quiet`、`window`、`power`。
- 同一座位同一时间段只能被一个有效预约占用。
- `availabilityStatus` 为计算结果：物理锁定/维护/停用优先返回 `locked`、`maintenance`、`disabled`；存在有效预约返回 `reserved`；存在活跃学习会话返回 `occupied`；否则返回 `available`。
- 不允许因为预约或签到把 `reserved`、`occupied` 写回座位主表；这些状态应由预约、学习会话和物理状态实时计算。

### 3.6 创建预约

**Method / Path**

`POST /api/reservations`

**用途**

创建座位预约。可用于免费体验、套餐扣时或需要支付的预约。

**请求体**

```json
{
  "storeId": "store_default",
  "seatId": "seat_b3",
  "startAt": "2026-05-18T10:00:00+08:00",
  "endAt": "2026-05-18T12:00:00+08:00",
  "useEntitlement": true
}
```

**响应示例**

```json
{
  "reservation": {
    "id": "resv_001",
    "storeId": "store_default",
    "seatId": "seat_b3",
    "seatCode": "B3",
    "status": "confirmed",
    "startAt": "2026-05-18T10:00:00+08:00",
    "endAt": "2026-05-18T12:00:00+08:00",
    "priceCent": 0,
    "currency": "CNY"
  },
  "order": null
}
```

需要支付时：

```json
{
  "reservation": {
    "id": "resv_002",
    "storeId": "store_default",
    "seatId": "seat_b3",
    "seatCode": "B3",
    "status": "pending_payment",
    "startAt": "2026-05-18T10:00:00+08:00",
    "endAt": "2026-05-18T12:00:00+08:00",
    "priceCent": 1500,
    "currency": "CNY"
  },
  "order": {
    "id": "order_001",
    "type": "reservation",
    "status": "pending_payment",
    "payAmountCent": 1500,
    "currency": "CNY"
  }
}
```

**关键业务规则**

- 需要认证。
- 预约开始时间必须早于结束时间，且必须在营业时间内。
- 座位不可用时返回 `409 SEAT_NOT_AVAILABLE`。
- `useEntitlement=true` 时优先消耗套餐/新人体验权益；权益不足则返回待支付订单。
- MVP 可先不接真实支付，待支付订单通过 mock pay 接口完成。

### 3.7 当前预约

**Method / Path**

`GET /api/reservations/current`

**用途**

获取首页、座位状态和门禁页需要展示的当前有效预约。

**请求参数**

无。

**响应示例**

```json
{
  "reservation": {
    "id": "resv_001",
    "storeId": "store_default",
    "seatId": "seat_b3",
    "seatCode": "B3",
    "status": "confirmed",
    "startAt": "2026-05-18T10:00:00+08:00",
    "endAt": "2026-05-18T12:00:00+08:00",
    "priceCent": 0,
    "currency": "CNY"
  }
}
```

无当前有效预约时：

```json
{
  "reservation": null
}
```

**关键业务规则**

- 需要认证。
- 当前预约优先返回 `checked_in`，其次返回当前时间可使用的 `confirmed`，再其次返回最近一条未开始的 `confirmed` 或 `pending_payment`。
- 已 `completed`、`cancelled`、`expired`、`no_show` 的预约不作为当前有效预约返回。

### 3.8 我的预约列表

**Method / Path**

`GET /api/reservations`

**用途**

获取我的预约记录，用于个人中心和预约记录页。

**查询参数**

```text
status=confirmed
limit=20
cursor=<opaqueCursor>
```

`status` 可选：`pending_payment`、`confirmed`、`checked_in`、`completed`、`cancelled`、`expired`、`no_show`。

**响应示例**

```json
{
  "items": [
    {
      "id": "resv_001",
      "storeId": "store_default",
      "seatId": "seat_b3",
      "seatCode": "B3",
      "status": "completed",
      "startAt": "2026-05-18T10:00:00+08:00",
      "endAt": "2026-05-18T12:00:00+08:00",
      "priceCent": 0,
      "currency": "CNY"
    }
  ],
  "page": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

**关键业务规则**

- 需要认证。
- 只返回当前用户预约。
- 默认按 `startAt` 倒序返回。

### 3.9 预约详情

**Method / Path**

`GET /api/reservations/{reservationId}`

**用途**

获取预约详情，用于预约确认、当前座位和门禁判断。

**路径参数**

- `reservationId`：预约 ID。

**响应示例**

```json
{
  "reservation": {
    "id": "resv_001",
    "storeId": "store_default",
    "seatId": "seat_b3",
    "seatCode": "B3",
    "status": "confirmed",
    "startAt": "2026-05-18T10:00:00+08:00",
    "endAt": "2026-05-18T12:00:00+08:00",
    "priceCent": 0,
    "currency": "CNY"
  }
}
```

**关键业务规则**

- 需要认证。
- 用户只能查看自己的预约。

### 3.10 取消预约

**Method / Path**

`POST /api/reservations/{reservationId}/cancel`

**用途**

取消未开始或允许取消的预约。

**请求体**

```json
{
  "reason": "user_cancelled"
}
```

**响应示例**

```json
{
  "reservation": {
    "id": "resv_001",
    "status": "cancelled",
    "cancelledAt": "2026-05-18T09:30:00+08:00"
  }
}
```

**关键业务规则**

- 需要认证。
- 已完成预约不可取消。
- 已扣减权益的预约，MVP 可直接退回未使用分钟数；后续可按门店规则细化。

### 3.11 当前学习会话

**Method / Path**

`GET /api/study-session/current`

**用途**

获取座位状态/空间控制页展示的当前座位、供电、网络、今日学习时长和剩余套餐时间。

**请求参数**

无。

**响应示例**

```json
{
  "session": {
    "id": "sess_001",
    "reservationId": "resv_001",
    "storeId": "store_default",
    "seatId": "seat_b12",
    "seatCode": "B12",
    "seatLabel": "B12 (窗边)",
    "status": "active",
    "startedAt": "2026-05-18T10:05:00+08:00",
    "endsAt": "2026-05-18T22:00:00+08:00",
    "todayStudyMinutes": 265,
    "remainingPackageMinutes": 750,
    "powerEnabled": true,
    "wifiConnected": true
  }
}
```

无当前会话时：

```json
{
  "session": null
}
```

**关键业务规则**

- 需要认证。
- `status` 可取 `active`、`completed`、`cancelled`。
- MVP 中 `wifiConnected` 可由 mock 返回；供电状态可先作为软件状态保存，后续接入硬件控制。

### 3.12 预约签到并开始学习

**Method / Path**

`POST /api/study-session/check-in`

**用途**

用户到店后基于预约签到，开始学习会话并激活座位状态。

**请求体**

```json
{
  "reservationId": "resv_001",
  "checkInSource": "mini_program"
}
```

**响应示例**

```json
{
  "session": {
    "id": "sess_001",
    "reservationId": "resv_001",
    "storeId": "store_default",
    "seatId": "seat_b3",
    "seatCode": "B3",
    "status": "active",
    "startedAt": "2026-05-18T10:05:00+08:00",
    "endsAt": "2026-05-18T12:00:00+08:00",
    "powerEnabled": true,
    "wifiConnected": true
  }
}
```

**关键业务规则**

- 需要认证。
- 只能对本人 `confirmed` 状态且当前可使用的预约签到。
- 重复签到同一预约应幂等返回当前会话。
- MVP 可 mock 门店定位/扫码校验；接口保留 `checkInSource` 便于后续区分扫码、蓝牙、门禁等来源。

### 3.13 结束学习会话

**Method / Path**

`POST /api/study-session/{sessionId}/end`

**用途**

结束当前学习会话，释放座位并结算学习时长。

**请求体**

```json
{
  "reason": "user_completed"
}
```

**响应示例**

```json
{
  "session": {
    "id": "sess_001",
    "status": "completed",
    "startedAt": "2026-05-18T10:05:00+08:00",
    "completedAt": "2026-05-18T12:00:00+08:00",
    "studyMinutes": 115
  },
  "entitlement": {
    "remainingMinutes": 738
  }
}
```

**关键业务规则**

- 需要认证。
- 用户只能结束自己的会话。
- 结束会话成功后返回 `completed`；异常取消或后台强制取消才使用 `cancelled`。
- 结束后座位可用性应通过 `availabilityStatus` 重新计算为 `available` 或后续预约占用状态，不写回座位主表为 `occupied`。

### 3.14 套餐列表

**Method / Path**

`GET /api/packages`

**用途**

获取商城页套餐列表。

**命名映射**

外部 API 保持 `/api/packages` 和 `Package` 命名，便于前端表达商品套餐；数据层对应 DB `plans` 表。API 字段 `packageId` 对应 `plans.id`，示例 ID 统一使用 `plan_month`、`plan_20h` 等。

**查询参数**

```text
storeId=store_default
```

**响应示例**

```json
{
  "items": [
    {
      "id": "plan_20h",
      "name": "20小时卡",
      "description": "适合阶段性自习和周末集中学习。",
      "priceCent": 9900,
      "currency": "CNY",
      "durationDays": 30,
      "includedMinutes": 1200,
      "features": ["开放式座位使用权限", "极速无线网络"],
      "disabledFeatures": ["会议室使用权限"],
      "badge": null,
      "purchaseEnabled": true
    },
    {
      "id": "plan_month",
      "name": "月卡",
      "description": "深度、无干扰的沉浸式专注。",
      "priceCent": 19000,
      "currency": "CNY",
      "durationDays": 30,
      "includedMinutes": null,
      "features": ["24/7 无限制进入", "优先预约独立舱", "10小时会议室预约", "访客通行证 (2次/月)"],
      "disabledFeatures": [],
      "badge": "推荐",
      "purchaseEnabled": true
    }
  ]
}
```

**关键业务规则**

- 需要认证。
- 响应中的 `items[]` 是 API `Package` 对象；其 `id` 对应 DB `plans.id`。
- `includedMinutes=null` 表示有效期内不限时，具体限流规则由后端权益判断。
- VIP/固定座位类套餐可返回 `purchaseEnabled=false`，前端显示申请入口。

### 3.15 创建订单

**Method / Path**

`POST /api/orders`

**用途**

为购买套餐或预约补差价创建订单。

**请求体**

购买套餐：

```json
{
  "type": "package",
  "packageId": "plan_month",
  "storeId": "store_default"
}
```

预约支付：

```json
{
  "type": "reservation",
  "reservationId": "resv_002"
}
```

**响应示例**

```json
{
  "order": {
    "id": "order_001",
    "type": "package",
    "status": "pending_payment",
    "subject": "月卡",
    "payAmountCent": 19000,
    "currency": "CNY",
    "createdAt": "2026-05-18T10:00:00+08:00",
    "expiresAt": "2026-05-18T10:15:00+08:00"
  },
  "payment": {
    "provider": "mock_wechat_pay",
    "mock": true,
    "prepayId": "mock_prepay_001"
  }
}
```

**关键业务规则**

- 需要认证。
- `type=package` 时必须传 `packageId`，其值对应 DB `plans.id`，例如 `plan_month`、`plan_20h`。
- `type=reservation` 时必须传 `reservationId`，且预约状态必须为 `pending_payment`。
- 待支付订单超时、用户主动关闭或支付前取消时统一变更为 `closed`，不返回 `cancelled` 或 `expired`。
- MVP 使用 mock 支付；响应中的 `payment` 结构保留 `provider` 和 `prepayId`，后续可扩展真实微信支付参数。

### 3.16 Mock 支付订单

**Method / Path**

`POST /api/orders/{orderId}/mock-pay`

**用途**

MVP 阶段模拟微信支付成功，触发订单完成和权益发放/预约确认。

**请求体**

```json
{
  "payResult": "success"
}
```

**响应示例**

```json
{
  "order": {
    "id": "order_001",
    "type": "package",
    "status": "paid",
    "payAmountCent": 19000,
    "currency": "CNY",
    "paidAt": "2026-05-18T10:03:00+08:00"
  },
  "entitlement": {
    "activePackageName": "月卡",
    "remainingMinutes": null,
    "validUntil": "2026-06-18T23:59:59+08:00"
  }
}
```

预约订单支付成功时：

```json
{
  "order": {
    "id": "order_002",
    "type": "reservation",
    "status": "paid",
    "payAmountCent": 1500,
    "currency": "CNY",
    "paidAt": "2026-05-18T10:03:00+08:00"
  },
  "reservation": {
    "id": "resv_002",
    "status": "confirmed"
  }
}
```

**关键业务规则**

- 需要认证。
- 只能支付本人订单。
- 已支付订单重复调用应幂等返回已支付状态。
- 真实微信支付接入后，该接口可保留为开发环境调试接口；生产使用微信支付回调更新订单。

### 3.17 订单列表

**Method / Path**

`GET /api/orders`

**用途**

个人中心查看我的订单。

**查询参数**

```text
status=paid
limit=20
cursor=<opaqueCursor>
```

`status` 可选：`pending_payment`、`paid`、`closed`、`refunded`、`partially_refunded`。

订单状态统一枚举：`pending_payment`、`paid`、`closed`、`refunded`、`partially_refunded`。其中：

- `pending_payment`：待支付，可继续发起支付。
- `paid`：已支付并完成权益发放或预约确认。
- `closed`：未支付订单已关闭，覆盖用户取消、超时过期等场景；API 不再单独返回 `cancelled` 或 `expired`。
- `refunded`：已全额退款。
- `partially_refunded`：已部分退款。

**响应示例**

```json
{
  "items": [
    {
      "id": "order_001",
      "type": "package",
      "status": "paid",
      "subject": "月卡",
      "payAmountCent": 19000,
      "currency": "CNY",
      "createdAt": "2026-05-18T10:00:00+08:00",
      "paidAt": "2026-05-18T10:03:00+08:00"
    }
  ],
  "page": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

**关键业务规则**

- 需要认证。
- 只返回当前用户订单。

### 3.18 一键开门

**Method / Path**

`POST /api/access/unlock`

**用途**

智能门禁页点击「一键开门」，后端校验用户权益/预约/当前会话后请求门禁开门。

**请求体**

```json
{
  "storeId": "store_default",
  "deviceId": "access_device_main",
  "source": "mini_program",
  "clientContext": {
    "bluetoothConnected": true
  }
}
```

**响应示例**

```json
{
  "unlock": {
    "id": "unlock_001",
    "status": "granted",
    "storeId": "store_default",
    "deviceId": "access_device_main",
    "usableUntil": "2026-05-18T22:00:00+08:00",
    "mock": true
  }
}
```

拒绝开门：

```json
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "当前没有可使用的预约或会员权益",
    "requestId": "req_20260518100000_access",
    "details": {
      "storeId": "store_default",
      "deviceId": "access_device_main"
    }
  }
}
```

**关键业务规则**

- 需要认证。
- `deviceId` 对应 DB `access_devices.id`，由后端映射到具体门、闸机或门禁厂商设备。
- 用户必须满足至少一种条件：当前有效预约、当前活跃学习会话、长期会员有效权益。
- MVP 可 mock 硬件门禁，返回 `mock=true` 和 `granted`。
- 接口形态兼容真实门禁：后续由后端调用硬件厂商 API，记录开门流水，不让小程序直接持有硬件密钥。

### 3.19 长期通行码

**Method / Path**

`GET /api/access/long-term-code`

**用途**

长期会员查看当前通行码的脱敏信息、有效期和刷新时间。该接口不得反复返回明文通行码。

**查询参数**

```text
storeId=store_default
```

**响应示例**

```json
{
  "code": {
    "storeId": "store_default",
    "maskedCode": "**** 1095",
    "codeSuffix": "1095",
    "expiresAt": "2026-05-18T23:59:59+08:00",
    "refreshAfter": "2026-05-18T12:00:00+08:00",
    "mock": true
  }
}
```

**关键业务规则**

- 需要认证。
- 仅长期会员或拥有对应长期权益的用户可访问，否则返回 `403 FORBIDDEN`。
- 只返回 `maskedCode`、`codeSuffix`、`expiresAt`、`refreshAfter` 等元信息，不返回明文 `displayCode`。
- 后端不保存明文通行码，只保存哈希、后缀、有效期和审计信息；需要与门禁系统同步时也应通过后端到设备/厂商通道完成。
- 用户需要查看新明文码时，必须通过刷新接口创建或轮换，且明文只在刷新成功响应中出现一次。

### 3.20 刷新长期通行码

**Method / Path**

`POST /api/access/long-term-code/refresh`

**用途**

长期会员手动创建或轮换通行码。刷新成功时允许返回一次明文 `displayCode`，用于用户立即录入或查看。

**请求体**

```json
{
  "storeId": "store_default"
}
```

**响应示例**

```json
{
  "code": {
    "storeId": "store_default",
    "displayCode": "1357 2468",
    "maskedCode": "**** 2468",
    "codeSuffix": "2468",
    "expiresAt": "2026-05-18T23:59:59+08:00",
    "refreshAfter": "2026-05-18T12:10:00+08:00",
    "mock": true
  }
}
```

**关键业务规则**

- 需要认证。
- 仅长期会员可刷新。
- `displayCode` 只在创建或轮换成功的本次响应中返回一次；服务端不保存明文，只保存哈希、`codeSuffix`、有效期和必要审计字段。
- 应限制刷新频率；`refreshAfter` 前重复调用不得再次返回旧明文，可返回当前 code 的 `maskedCode`、`codeSuffix`、有效期等元信息，或返回 `409` 提示刷新过于频繁。

## 4. Mock 与真实接入边界

### 4.1 微信登录

MVP：

- `POST /api/auth/wechat-login` 接受任意非空 `code`。
- 返回 mock 用户和 mock `accessToken`。

后续真实接入：

- 后端用 `appid`、`secret`、`code` 调用微信登录接口。
- 后端保存 `openid`/`unionid` 与业务用户绑定关系。
- 小程序仍只消费本契约定义的业务 `accessToken`。

### 4.2 微信支付

MVP：

- `POST /api/orders` 创建订单和 mock `prepayId`。
- `POST /api/orders/{orderId}/mock-pay` 模拟支付成功。

后续真实接入：

- `POST /api/orders` 返回微信支付所需参数，例如 `timeStamp`、`nonceStr`、`package`、`signType`、`paySign`。
- 支付状态以微信支付回调为准。
- `mock-pay` 仅用于开发/测试环境。

### 4.3 硬件门禁

MVP：

- `POST /api/access/unlock` 只做软件权限校验，返回 mock 开门成功。
- 长期通行码可由后端 mock 生成，但仍遵循只保存哈希、GET 只返回脱敏信息、刷新成功才一次性返回明文的规则。

后续真实接入：

- 后端对接门禁厂商 API 或本地网关。
- 小程序不直接调用门禁硬件，不保存门禁密钥。
- 所有开门请求和通行码刷新都记录审计流水。

## 5. 并发实现注意事项

- 本文档只定义 API 契约，不要求立即实现所有接口。
- 后端实现时必须保留 `GET /api/health` 的现有响应兼容性。
- 前端实现可先使用本文档示例数据联调页面状态。
- 数据模型实现应优先覆盖用户、门店、座位、预约、学习会话、套餐、订单、权益、门禁流水。
- 不同智能体并发开发时，接口路径、字段名、枚举值以本文档为准；如需变更，先更新本文档再同步实现。
