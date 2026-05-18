# 自习室 MVP 数据模型

本文档定义微信小程序自习室 MVP 的领域边界、SQLite 表结构建议、关键约束和种子数据。目标是方便后端并发实现 migrations、repositories 和 API，不包含业务代码。

## 1. 领域拆分

### 1.1 用户 / 微信身份

- `users`：平台用户主档，承载昵称、手机号、状态等通用信息。
- `wechat_identities`：微信小程序身份，保存 `openid`、可选 `unionid`、会话态元数据。

设计原则：

- 业务表统一引用 `users.id`，不直接依赖微信 `openid`。
- `openid` 对同一个小程序唯一；若未来接入公众号或开放平台，再用 `unionid` 聚合多个身份。
- 会员展示字段不写入 `users`：API 返回的 `membershipLevel`、`isLongTermMember` 必须由 `user_entitlements` 的有效权益聚合得到。

### 1.2 门店 / 区域 / 座位

- `stores`：门店，包含营业状态、地址、时区和营业时间配置。
- `store_areas`：门店下的区域，例如安静区、VIP 区、包间区。
- `seats`：具体座位，属于某个区域，可独立上下架、维护或锁定。

设计原则：

- 预约和会话最终落到 `seat_id`。
- 区域用于筛选、定价扩展和统计聚合。

### 1.3 预约

- `reservations`：预约单，记录用户、门店、座位、预约时间段、状态和取消原因。

设计原则：

- MVP 使用具体座位预约，不做“只约区域自动分配”。
- 所有时间使用 UTC ISO 字符串存储，展示时按门店时区转换。

### 1.4 学习会话

- `study_sessions`：实际入座学习记录，绑定预约或临时到店，记录开始、结束、时长和结算来源。

设计原则：

- 预约代表“占用计划”，学习会话代表“实际使用”。
- 会话可由门禁核验、扫码入座或后台补录创建。

### 1.5 套餐 / 订单 / 权益

- `plans`：可购买套餐，例如单次票、小时卡、月卡。
- `orders`：订单主表，保存金额、支付状态和微信支付交易号。
- `order_items`：订单明细，MVP 通常一单一项，但保留扩展。
- `user_entitlements`：用户权益账户，表示可用次数、分钟数或有效期。
- `entitlement_ledger`：权益流水，用于充值、扣减、退款和人工调整。

设计原则：

- 可用权益不要只靠订单推导，使用 `user_entitlements` 做当前余额，`entitlement_ledger` 做审计。
- 扣减必须写流水并更新余额，放在同一个事务中。

### 1.6 门禁 / 通行码 / 设备

- `access_devices`：门禁设备或扫码终端。
- `access_codes`：用户通行码，支持预约短码和长期码。
- `access_events`：门禁核验流水，记录成功、拒绝、设备和原因。

设计原则：

- 通行码表不保存明文码，只保存哈希和后缀展示信息。
- 门禁权限由预约、学习会话、权益和通行码状态共同决定。

### 1.7 统计

- `daily_store_stats`：门店日统计快照，用于后台和首页概览。

设计原则：

- MVP 可先由定时任务或管理接口重算。
- 明细事实仍以 `reservations`、`study_sessions`、`orders`、`access_events` 为准。

## 2. 通用约定

- 主键：所有业务表使用 `TEXT PRIMARY KEY`，建议生成 UUID/ULID，便于迁移到 PostgreSQL/MySQL。
- 时间字段：`created_at`、`updated_at`、业务时间统一存 UTC ISO-8601 文本，例如 `2026-05-18T12:00:00.000Z`。
- 金额字段：使用整数分 `amount_cents`，币种默认 `CNY`。
- 布尔字段：SQLite 使用 `INTEGER NOT NULL DEFAULT 0/1`。
- 软删除：MVP 只对核心配置表保留 `status`，暂不引入通用 `deleted_at`。
- 外键：SQLite 启用 `PRAGMA foreign_keys = ON`，迁移和测试都必须打开。
- JSON：SQLite MVP 使用 `TEXT` 存 JSON 字符串，例如营业时间、设备配置、微信原始回调；repository 层负责序列化和校验。

### 2.1 API 与数据库命名映射

API 面向小程序用户，命名可以更贴近前端语义；数据库表名以领域实体和内部实现稳定性为准。实现时必须保持以下映射：

- API 的 `Package` 对象对应数据库 `plans` 表；API 字段 `packageId` 对应 `plans.id`。外部接口继续使用 packages/packageId，内部表名统一使用 plans/plan_id，不另建 `packages` 表。
- API 的 `Store`、`Area`、`Seat` 分别对应 `stores`、`store_areas`、`seats`。
- API 的 `Reservation` 对应 `reservations`。
- API 的 `StudySession` 对应 `study_sessions`，状态枚举统一为 `active/completed/cancelled`，其中 `completed` 表示会话已结束。
- API 的 `Order` 对应 `orders`，状态枚举统一为 `pending_payment/paid/closed/refunded/partially_refunded`。
- API 门禁请求或事件中的 `deviceId` 对应 `access_devices.id`；不要引入独立 `doorId` 概念。如需表达门、闸机或扫码器类型，使用 `access_devices.device_type`。
- API 用户对象中的 `membershipLevel`、`isLongTermMember` 不落到 `users` 表字段；由 `user_entitlements` 聚合计算后返回。

## 3. MVP 表清单

### 3.1 `app_meta`

当前后端已存在，用于记录初始化信息和迁移元数据。

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `key` | TEXT | PK | 元数据键 |
| `value` | TEXT | NOT NULL | 元数据值 |

索引：

- 主键索引：`key`

状态枚举：无。

### 3.2 `users`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 用户 ID |
| `nickname` | TEXT | NULL | 微信昵称或用户昵称 |
| `avatar_url` | TEXT | NULL | 头像 |
| `phone` | TEXT | NULL | 手机号，授权后写入 |
| `status` | TEXT | NOT NULL | 用户状态 |
| `last_login_at` | TEXT | NULL | 最近登录时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：无。

关键索引：

- `idx_users_phone`：`phone`
- `idx_users_status`：`status`

状态枚举：

- `active`：正常
- `disabled`：禁用

### 3.3 `wechat_identities`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 微信身份 ID |
| `user_id` | TEXT | FK, NOT NULL | 关联用户 |
| `app_id` | TEXT | NOT NULL | 小程序 AppID |
| `openid` | TEXT | NOT NULL | 小程序 OpenID |
| `unionid` | TEXT | NULL | 开放平台 UnionID |
| `session_key_version` | INTEGER | NOT NULL DEFAULT 1 | 会话密钥版本，不保存明文 session_key 时也可用于轮换 |
| `last_seen_at` | TEXT | NULL | 最近使用时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `user_id` -> `users.id`

关键索引：

- `ux_wechat_app_openid`：唯一索引 `app_id, openid`
- `idx_wechat_user_id`：`user_id`
- `idx_wechat_unionid`：`unionid`

状态枚举：无，状态从 `users.status` 继承。

### 3.4 `stores`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 门店 ID |
| `name` | TEXT | NOT NULL | 门店名称 |
| `address` | TEXT | NOT NULL | 地址 |
| `latitude` | REAL | NULL | 纬度 |
| `longitude` | REAL | NULL | 经度 |
| `timezone` | TEXT | NOT NULL DEFAULT 'Asia/Shanghai' | 展示和营业规则时区 |
| `business_hours_json` | TEXT | NULL | 营业时间 JSON |
| `status` | TEXT | NOT NULL | 门店状态 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：无。

关键索引：

- `idx_stores_status`：`status`

状态枚举：

- `open`：营业
- `closed`：暂停营业
- `maintenance`：维护中

### 3.5 `store_areas`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 区域 ID |
| `store_id` | TEXT | FK, NOT NULL | 所属门店 |
| `name` | TEXT | NOT NULL | 区域名称 |
| `area_type` | TEXT | NOT NULL | 区域类型 |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 展示排序 |
| `status` | TEXT | NOT NULL | 区域状态 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `store_id` -> `stores.id`

关键索引：

- `idx_store_areas_store_id`：`store_id`
- `ux_store_areas_name`：唯一索引 `store_id, name`

状态枚举：

- `active`：可用
- `inactive`：停用

`area_type` 枚举：

- `quiet`：安静区
- `vip`：VIP 区
- `room`：独立房间
- `common`：普通区

### 3.6 `seats`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 座位 ID |
| `store_id` | TEXT | FK, NOT NULL | 所属门店，冗余便于查询和约束 |
| `area_id` | TEXT | FK, NOT NULL | 所属区域 |
| `seat_no` | TEXT | NOT NULL | 座位编号 |
| `seat_type` | TEXT | NOT NULL | 座位类型 |
| `status` | TEXT | NOT NULL | 座位状态 |
| `features_json` | TEXT | NULL | 插座、台灯、窗边等特性 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `store_id` -> `stores.id`
- `area_id` -> `store_areas.id`

关键索引：

- `ux_seats_store_no`：唯一索引 `store_id, seat_no`
- `idx_seats_area_status`：`area_id, status`
- `idx_seats_store_status`：`store_id, status`

状态枚举：

- `available`：基础可运营/可参与预约计算，最终能否预约以 API 的 `availabilityStatus` 为准
- `disabled`：停用
- `maintenance`：维护中
- `locked`：临时锁定

说明：

- `seats.status` 只表示座位基础物理状态或运营配置状态，不保存 `reserved`、`occupied`。
- API 展示的 `availabilityStatus` 由 `seats.status`、有效时间窗内的 `reservations` 和进行中的 `study_sessions` 计算得到。例如座位基础状态为 `available`，但存在冲突预约时可对外展示为 reserved；存在 `active` 学习会话时可对外展示为 occupied。

`seat_type` 枚举：

- `standard`：普通座
- `vip`：VIP 座
- `room`：房间座

### 3.7 `reservations`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 预约 ID |
| `user_id` | TEXT | FK, NOT NULL | 用户 |
| `store_id` | TEXT | FK, NOT NULL | 门店 |
| `area_id` | TEXT | FK, NOT NULL | 区域 |
| `seat_id` | TEXT | FK, NOT NULL | 座位 |
| `start_at` | TEXT | NOT NULL | 预约开始时间 UTC |
| `end_at` | TEXT | NOT NULL | 预约结束时间 UTC |
| `status` | TEXT | NOT NULL | 预约状态 |
| `source` | TEXT | NOT NULL DEFAULT 'miniapp' | 来源 |
| `entitlement_id` | TEXT | FK, NULL | 预约锁定或消费的权益 |
| `order_id` | TEXT | FK, NULL | 单次购买产生的订单 |
| `cancelled_at` | TEXT | NULL | 取消时间 |
| `cancel_reason` | TEXT | NULL | 取消原因 |
| `checked_in_at` | TEXT | NULL | 签到时间 |
| `checked_out_at` | TEXT | NULL | 签退时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `user_id` -> `users.id`
- `store_id` -> `stores.id`
- `area_id` -> `store_areas.id`
- `seat_id` -> `seats.id`
- `entitlement_id` -> `user_entitlements.id`
- `order_id` -> `orders.id`

关键索引：

- `idx_reservations_user_time`：`user_id, start_at, end_at`
- `idx_reservations_seat_time`：`seat_id, start_at, end_at`
- `idx_reservations_store_status_time`：`store_id, status, start_at`
- `idx_reservations_status`：`status`

状态枚举：

- `pending_payment`：待支付
- `confirmed`：已确认
- `checked_in`：已签到
- `completed`：已完成
- `cancelled`：已取消
- `expired`：已过期
- `no_show`：爽约

约束建议：

- `CHECK (end_at > start_at)`
- SQLite 无法用普通唯一索引表达时间段不重叠，需 repository 事务中显式查询冲突。

### 3.8 `study_sessions`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 学习会话 ID |
| `user_id` | TEXT | FK, NOT NULL | 用户 |
| `store_id` | TEXT | FK, NOT NULL | 门店 |
| `area_id` | TEXT | FK, NOT NULL | 区域 |
| `seat_id` | TEXT | FK, NOT NULL | 座位 |
| `reservation_id` | TEXT | FK, NULL | 关联预约 |
| `started_at` | TEXT | NOT NULL | 实际开始时间 |
| `ended_at` | TEXT | NULL | 实际结束时间 |
| `duration_minutes` | INTEGER | NOT NULL DEFAULT 0 | 已结算分钟数 |
| `status` | TEXT | NOT NULL | 会话状态 |
| `settlement_status` | TEXT | NOT NULL | 结算状态 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `user_id` -> `users.id`
- `store_id` -> `stores.id`
- `area_id` -> `store_areas.id`
- `seat_id` -> `seats.id`
- `reservation_id` -> `reservations.id`

关键索引：

- `idx_sessions_user_started`：`user_id, started_at`
- `idx_sessions_seat_active`：`seat_id, status`
- `idx_sessions_store_started`：`store_id, started_at`
- `ux_sessions_reservation`：唯一索引 `reservation_id`，允许 NULL

状态枚举：

- `active`：进行中
- `completed`：已结束
- `cancelled`：已取消

说明：

- 学习会话状态与 API 统一为 `active/completed/cancelled`。
- `completed` 表示会话已经结束，通常应有 `ended_at`，并完成或进入结算流程。

`settlement_status` 枚举：

- `pending`：待结算
- `settled`：已结算
- `refunded`：已退款
- `manual_review`：需人工确认

### 3.9 `plans`

API 映射：

- `plans` 是内部套餐表，对外 API 对象名为 `Package`。
- API 字段 `packageId` 必须映射到 `plans.id`；订单明细内部使用 `order_items.plan_id` 引用套餐。
- 外部接口路径和响应可继续使用 packages/packageId，数据库和 repository 层统一使用 plans/plan_id。

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 套餐 ID |
| `name` | TEXT | NOT NULL | 套餐名称 |
| `plan_type` | TEXT | NOT NULL | 套餐类型 |
| `price_cents` | INTEGER | NOT NULL | 售价，单位分 |
| `currency` | TEXT | NOT NULL DEFAULT 'CNY' | 币种 |
| `minutes_total` | INTEGER | NULL | 总分钟数，小时卡使用 |
| `uses_total` | INTEGER | NULL | 总次数，次卡使用 |
| `valid_days` | INTEGER | NULL | 购买后有效天数 |
| `available_store_id` | TEXT | FK, NULL | 限定门店，NULL 表示通用 |
| `status` | TEXT | NOT NULL | 套餐状态 |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 展示排序 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `available_store_id` -> `stores.id`

关键索引：

- `idx_plans_status_sort`：`status, sort_order`
- `idx_plans_store`：`available_store_id`

状态枚举：

- `active`：上架
- `inactive`：下架

`plan_type` 枚举：

- `single_use`：单次票
- `minutes_pack`：分钟/小时包
- `period_pass`：期限卡，例如月卡

### 3.10 `orders`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 订单 ID |
| `user_id` | TEXT | FK, NOT NULL | 用户 |
| `order_no` | TEXT | NOT NULL | 业务订单号 |
| `status` | TEXT | NOT NULL | 订单状态 |
| `pay_channel` | TEXT | NOT NULL DEFAULT 'wechat_pay' | 支付渠道 |
| `amount_cents` | INTEGER | NOT NULL | 应付金额 |
| `paid_cents` | INTEGER | NOT NULL DEFAULT 0 | 实付金额 |
| `currency` | TEXT | NOT NULL DEFAULT 'CNY' | 币种 |
| `wechat_prepay_id` | TEXT | NULL | 微信预支付 ID |
| `wechat_transaction_id` | TEXT | NULL | 微信支付交易号 |
| `paid_at` | TEXT | NULL | 支付完成时间 |
| `closed_at` | TEXT | NULL | 关闭时间 |
| `refunded_at` | TEXT | NULL | 退款完成时间 |
| `raw_notify_json` | TEXT | NULL | 最近一次支付回调摘要 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `user_id` -> `users.id`

关键索引：

- `ux_orders_order_no`：唯一索引 `order_no`
- `ux_orders_wechat_transaction`：唯一索引 `wechat_transaction_id`，允许 NULL
- `idx_orders_user_created`：`user_id, created_at`
- `idx_orders_status_created`：`status, created_at`

状态枚举：

- `pending_payment`：待支付
- `paid`：已支付
- `closed`：已关闭
- `refunded`：已退款
- `partially_refunded`：部分退款

说明：

- 订单状态与 API 统一为 `pending_payment/paid/closed/refunded/partially_refunded`。
- 支付超时、用户取消支付、后台关闭未支付订单都统一归为 `closed`，不另设 `cancelled` 或 `expired` 订单状态。

### 3.11 `order_items`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 订单明细 ID |
| `order_id` | TEXT | FK, NOT NULL | 订单 |
| `plan_id` | TEXT | FK, NOT NULL | 套餐 |
| `quantity` | INTEGER | NOT NULL DEFAULT 1 | 数量 |
| `unit_price_cents` | INTEGER | NOT NULL | 单价 |
| `total_price_cents` | INTEGER | NOT NULL | 小计 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

外键：

- `order_id` -> `orders.id`
- `plan_id` -> `plans.id`

关键索引：

- `idx_order_items_order`：`order_id`
- `idx_order_items_plan`：`plan_id`

状态枚举：无，继承 `orders.status`。

### 3.12 `user_entitlements`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 权益 ID |
| `user_id` | TEXT | FK, NOT NULL | 用户 |
| `plan_id` | TEXT | FK, NOT NULL | 来源套餐 |
| `order_id` | TEXT | FK, NULL | 来源订单 |
| `entitlement_type` | TEXT | NOT NULL | 权益类型 |
| `store_id` | TEXT | FK, NULL | 限定门店，NULL 表示通用 |
| `total_minutes` | INTEGER | NULL | 总分钟数 |
| `remaining_minutes` | INTEGER | NULL | 剩余分钟数 |
| `total_uses` | INTEGER | NULL | 总次数 |
| `remaining_uses` | INTEGER | NULL | 剩余次数 |
| `valid_from` | TEXT | NOT NULL | 生效时间 |
| `valid_until` | TEXT | NULL | 失效时间，NULL 表示长期 |
| `status` | TEXT | NOT NULL | 权益状态 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `user_id` -> `users.id`
- `plan_id` -> `plans.id`
- `order_id` -> `orders.id`
- `store_id` -> `stores.id`

关键索引：

- `idx_entitlements_user_status_valid`：`user_id, status, valid_until`
- `idx_entitlements_order`：`order_id`
- `idx_entitlements_store`：`store_id`

状态枚举：

- `active`：可用
- `exhausted`：已用尽
- `expired`：已过期
- `frozen`：冻结
- `refunded`：已退款

`entitlement_type` 枚举：

- `minutes`：按分钟扣减
- `uses`：按次数扣减
- `period`：有效期内不限次或按规则使用

### 3.13 `entitlement_ledger`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 流水 ID |
| `entitlement_id` | TEXT | FK, NOT NULL | 权益 |
| `user_id` | TEXT | FK, NOT NULL | 用户，冗余便于查询 |
| `event_type` | TEXT | NOT NULL | 事件类型 |
| `delta_minutes` | INTEGER | NOT NULL DEFAULT 0 | 分钟变化，可为负 |
| `delta_uses` | INTEGER | NOT NULL DEFAULT 0 | 次数变化，可为负 |
| `balance_minutes_after` | INTEGER | NULL | 变更后分钟余额 |
| `balance_uses_after` | INTEGER | NULL | 变更后次数余额 |
| `reservation_id` | TEXT | FK, NULL | 关联预约 |
| `study_session_id` | TEXT | FK, NULL | 关联会话 |
| `order_id` | TEXT | FK, NULL | 关联订单 |
| `idempotency_key` | TEXT | NULL | 幂等键 |
| `note` | TEXT | NULL | 备注 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

外键：

- `entitlement_id` -> `user_entitlements.id`
- `user_id` -> `users.id`
- `reservation_id` -> `reservations.id`
- `study_session_id` -> `study_sessions.id`
- `order_id` -> `orders.id`

关键索引：

- `idx_ledger_entitlement_created`：`entitlement_id, created_at`
- `idx_ledger_user_created`：`user_id, created_at`
- `ux_ledger_idempotency`：唯一索引 `idempotency_key`，允许 NULL

状态枚举：无。

`event_type` 枚举：

- `grant`：发放
- `reserve_hold`：预约占用
- `reserve_release`：取消释放
- `consume`：实际扣减
- `refund`：退款回滚
- `adjust`：人工调整

### 3.14 `access_devices`

API 映射：

- API 的 `deviceId` 对应 `access_devices.id`。
- 不使用独立 `doorId` 概念；门锁、闸机、扫码器等差异通过 `device_type` 表达。

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 设备 ID |
| `store_id` | TEXT | FK, NOT NULL | 所属门店 |
| `name` | TEXT | NOT NULL | 设备名称 |
| `device_type` | TEXT | NOT NULL | 设备类型 |
| `device_code` | TEXT | NOT NULL | 设备编码 |
| `secret_hash` | TEXT | NULL | 设备密钥哈希 |
| `status` | TEXT | NOT NULL | 设备状态 |
| `last_seen_at` | TEXT | NULL | 最近心跳 |
| `config_json` | TEXT | NULL | 设备配置 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `store_id` -> `stores.id`

关键索引：

- `ux_access_devices_code`：唯一索引 `device_code`
- `idx_access_devices_store_status`：`store_id, status`

状态枚举：

- `active`：可用
- `inactive`：停用
- `maintenance`：维护中

`device_type` 枚举：

- `door_lock`：门锁
- `gate`：闸机
- `qr_scanner`：扫码器
- `admin_terminal`：后台终端

### 3.15 `access_codes`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 通行码 ID |
| `user_id` | TEXT | FK, NOT NULL | 用户 |
| `store_id` | TEXT | FK, NOT NULL | 门店 |
| `reservation_id` | TEXT | FK, NULL | 关联预约，长期码可为空 |
| `code_type` | TEXT | NOT NULL | 通行码类型 |
| `code_hash` | TEXT | NOT NULL | 通行码哈希 |
| `code_suffix` | TEXT | NULL | 后 4 位，用于客服核对 |
| `valid_from` | TEXT | NOT NULL | 生效时间 |
| `valid_until` | TEXT | NOT NULL | 失效时间 |
| `max_uses` | INTEGER | NULL | 最大使用次数，NULL 表示不限 |
| `used_count` | INTEGER | NOT NULL DEFAULT 0 | 已使用次数 |
| `status` | TEXT | NOT NULL | 通行码状态 |
| `rotated_from_id` | TEXT | FK, NULL | 从哪个码轮换而来 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `user_id` -> `users.id`
- `store_id` -> `stores.id`
- `reservation_id` -> `reservations.id`
- `rotated_from_id` -> `access_codes.id`

关键索引：

- `ux_access_codes_hash`：唯一索引 `code_hash`
- `idx_access_codes_user_status`：`user_id, status`
- `idx_access_codes_store_valid`：`store_id, valid_from, valid_until`
- `idx_access_codes_reservation`：`reservation_id`

状态枚举：

- `active`：可用
- `revoked`：已吊销
- `expired`：已过期
- `rotated`：已轮换

`code_type` 枚举：

- `reservation_once`：预约一次性码
- `reservation_window`：预约时间窗码
- `long_term`：长期通行码
- `admin`：管理员码

### 3.16 `access_events`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 通行事件 ID |
| `store_id` | TEXT | FK, NOT NULL | 门店 |
| `device_id` | TEXT | FK, NULL | 设备 |
| `user_id` | TEXT | FK, NULL | 用户，识别失败时可为空 |
| `access_code_id` | TEXT | FK, NULL | 通行码 |
| `reservation_id` | TEXT | FK, NULL | 关联预约 |
| `study_session_id` | TEXT | FK, NULL | 关联会话 |
| `direction` | TEXT | NOT NULL | 进出方向 |
| `result` | TEXT | NOT NULL | 核验结果 |
| `reason` | TEXT | NULL | 拒绝或异常原因 |
| `occurred_at` | TEXT | NOT NULL | 发生时间 |
| `raw_payload_json` | TEXT | NULL | 设备原始载荷 |
| `created_at` | TEXT | NOT NULL | 入库时间 |

外键：

- `store_id` -> `stores.id`
- `device_id` -> `access_devices.id`
- `user_id` -> `users.id`
- `access_code_id` -> `access_codes.id`
- `reservation_id` -> `reservations.id`
- `study_session_id` -> `study_sessions.id`

关键索引：

- `idx_access_events_store_time`：`store_id, occurred_at`
- `idx_access_events_user_time`：`user_id, occurred_at`
- `idx_access_events_code_time`：`access_code_id, occurred_at`
- `idx_access_events_result_time`：`result, occurred_at`

状态枚举：

- `result`: `granted`、`denied`、`error`
- `direction`: `entry`、`exit`、`unknown`

### 3.17 `daily_store_stats`

字段建议：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PK | 统计 ID |
| `store_id` | TEXT | FK, NOT NULL | 门店 |
| `stat_date` | TEXT | NOT NULL | 门店本地日期，格式 `YYYY-MM-DD` |
| `reservation_count` | INTEGER | NOT NULL DEFAULT 0 | 预约数 |
| `completed_session_count` | INTEGER | NOT NULL DEFAULT 0 | 完成会话数 |
| `active_minutes` | INTEGER | NOT NULL DEFAULT 0 | 学习分钟数 |
| `paid_order_count` | INTEGER | NOT NULL DEFAULT 0 | 支付订单数 |
| `revenue_cents` | INTEGER | NOT NULL DEFAULT 0 | 收入，单位分 |
| `access_granted_count` | INTEGER | NOT NULL DEFAULT 0 | 开门成功数 |
| `access_denied_count` | INTEGER | NOT NULL DEFAULT 0 | 开门拒绝数 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

外键：

- `store_id` -> `stores.id`

关键索引：

- `ux_daily_store_stats_date`：唯一索引 `store_id, stat_date`
- `idx_daily_store_stats_date`：`stat_date`

状态枚举：无。

## 4. 关键业务约束

### 4.1 预约冲突

有效占用状态：

- `confirmed`
- `checked_in`
- `pending_payment`，仅在短暂支付锁定窗口内参与冲突判断

冲突判断：

```sql
SELECT id
FROM reservations
WHERE seat_id = ?
  AND status IN ('pending_payment', 'confirmed', 'checked_in')
  AND start_at < ?
  AND end_at > ?
LIMIT 1;
```

其中参数为 `seat_id, requested_end_at, requested_start_at`。

实现要求：

- 创建预约、改期、支付确认必须放在事务里完成冲突检查和写入。
- `pending_payment` 应设置业务过期时间，MVP 可复用 `updated_at` 或后续补 `expires_at`。清理任务将超时未支付预约置为 `expired`。
- 座位状态不是 `available` 时禁止新预约。
- 同一用户同一时间段可选约束：MVP 建议禁止用户同时拥有重叠的有效预约，查询条件同上但改为 `user_id = ?`。

### 4.2 权益扣减

权益使用顺序建议：

1. 优先消耗即将过期的 `active` 权益。
2. 门店限定权益优先于通用权益。
3. 次卡按预约或签到扣 1 次；分钟包按实际学习时长扣减；期限卡校验有效期即可。

事务要求：

- 创建预约时如需要锁定权益，写入 `entitlement_ledger.event_type = 'reserve_hold'`。
- 取消预约时释放锁定，写入 `reserve_release`。
- 会话结束结算时写入 `consume`，并更新 `remaining_minutes` 或 `remaining_uses`。
- 当余额归零时更新 `user_entitlements.status = 'exhausted'`。
- 所有扣减流水必须带 `idempotency_key`，例如 `consume:{study_session_id}`，避免重复结算。

### 4.3 支付幂等

幂等边界：

- `orders.order_no` 全局唯一，业务侧生成。
- `orders.wechat_transaction_id` 唯一，微信支付成功后写入。
- 微信支付回调可能重复到达，repository 需按 `order_no` 或 `wechat_transaction_id` 查询已有订单状态。

处理规则：

- 只有 `pending_payment` 可以变更为 `paid`。
- 已是 `paid` 的订单收到相同交易号回调时直接返回成功，不重复发放权益。
- 发放权益和订单置为 `paid` 必须在同一事务内完成。
- 权益发放流水使用 `idempotency_key = 'pay:' || order_no`。
- 金额不一致、订单关闭、交易号冲突时记录回调摘要并拒绝业务变更。

### 4.4 门禁权限

开门授权应同时校验：

- 用户状态为 `active`。
- 门店、设备状态可用。
- 通行码状态为 `active`，当前时间在 `valid_from` 与 `valid_until` 之间。
- `max_uses` 为空或 `used_count < max_uses`。
- 预约码必须关联当前有效预约，且当前时间在预约开始前后允许窗口内。建议 MVP 窗口为开始前 15 分钟到结束后 15 分钟。
- 长期码必须要求用户存在有效权益，或由管理员显式授权。

事件记录：

- 无论成功或失败，都写入 `access_events`。
- 成功后递增 `access_codes.used_count`。
- 可在首次成功入场时创建或更新 `study_sessions`。

### 4.5 长期通行码安全

长期码风险较高，MVP 需保留以下约束：

- 数据库只保存 `code_hash`，不保存明文码。
- 哈希建议使用带服务端 pepper 的 SHA-256 或更强方案；pepper 放环境变量，不入库。
- 长期码必须有 `valid_until`，不允许无限期有效。建议最长 30 天。
- 支持轮换：新码创建后旧码置为 `rotated`，并设置 `rotated_from_id`。
- 支持吊销：用户禁用、权益退款或设备异常时将码置为 `revoked`。
- 普通查询接口不返回明文通行码，只返回状态、有效期和 `code_suffix` 等展示信息。
- 后端只在创建或刷新/轮换成功的应用层响应中短暂返回一次明文；后续只能展示 `code_suffix`。

## 5. SQLite MVP 可行性说明

SQLite 适合当前 MVP：

- 项目当前后端已经使用 Node `node:sqlite` 和本地 `backend/data/zixishi.sqlite`。
- MVP 写入规模低，主要是预约、支付回调、门禁事件和学习会话，单实例部署可接受。
- SQLite 支持事务、外键、唯一索引和普通复合索引，足以保证 MVP 的核心一致性。
- 通过 repository 层集中实现事务，可避免业务代码分散处理并发细节。

SQLite 需要注意：

- 写并发是数据库级串行，门禁设备高频上报时可能成为瓶颈。
- 时间段不重叠无法用简单唯一索引保证，必须事务内查询冲突。
- `TEXT` JSON 没有强 schema，应用层必须校验。
- 需要开启 WAL：建议启动时执行 `PRAGMA journal_mode = WAL` 和合理的 `busy_timeout`。
- 本地文件数据库需要备份策略，不能把生产数据只放在容器临时磁盘。

迁移到 PostgreSQL/MySQL 时关注：

- 主键可继续使用字符串 UUID/ULID，减少迁移成本。
- 时间字段迁移为 `TIMESTAMPTZ` 或 `DATETIME(3)`，明确 UTC 写入规则。
- JSON 文本字段可迁移为 PostgreSQL `jsonb` 或 MySQL `JSON`。
- 预约冲突在 PostgreSQL 可用排他约束或事务隔离强化；MySQL 仍建议使用事务和锁查询。
- 支付、权益和门禁事件需要幂等唯一索引保持一致。
- SQLite 的部分 NULL 唯一索引行为与目标数据库差异要在迁移脚本中验证。
- 未来多实例部署时，要把支付回调、权益扣减、预约冲突检查放在数据库事务和唯一约束下，不依赖进程内锁。

## 6. 种子数据建议

种子 ID 必须与 API 示例保持一致。如 API 文档或示例出现不同的默认门店 ID 或套餐 ID，应统一改为本节 ID。

### 6.1 默认门店

`stores`：

- `id`: `store_default`
- `name`: `静谧空间旗舰店`
- `address`: `上海市示例路 88 号 2F`
- `timezone`: `Asia/Shanghai`
- `business_hours_json`: `{"mon":["08:00","23:00"],"tue":["08:00","23:00"],"wed":["08:00","23:00"],"thu":["08:00","23:00"],"fri":["08:00","23:00"],"sat":["09:00","23:30"],"sun":["09:00","23:30"]}`
- `status`: `open`

### 6.2 默认区域

`store_areas`：

- `area_quiet`: `安静区`，`area_type = quiet`
- `area_vip`: `VIP 区`，`area_type = vip`
- `area_common`: `普通区`，`area_type = common`

### 6.3 默认座位

`seats`：

- 普通区：`A01` 到 `A12`，`seat_type = standard`，`status = available`
- 安静区：`Q01` 到 `Q08`，`seat_type = standard`，`status = available`
- VIP 区：`V01` 到 `V04`，`seat_type = vip`，`status = available`

### 6.4 默认套餐

`plans`：

- `plan_single_day`：单次自习票，`plan_type = single_use`，`price_cents = 3900`，`uses_total = 1`，`valid_days = 7`
- `plan_20h`：20 小时卡，`plan_type = minutes_pack`，`price_cents = 19900`，`minutes_total = 1200`，`valid_days = 90`
- `plan_month`：月卡，`plan_type = period_pass`，`price_cents = 49900`，`valid_days = 30`

### 6.5 Mock 用户

`users`：

- `user_mock_001`：昵称 `测试用户A`，手机号 `13800000001`，`status = active`
- `user_mock_002`：昵称 `测试用户B`，手机号 `13800000002`，`status = active`
- `user_disabled_001`：昵称 `禁用用户`，手机号 `13800000003`，`status = disabled`

`wechat_identities`：

- `wx_mock_001` -> `user_mock_001`，`openid = mock_openid_001`
- `wx_mock_002` -> `user_mock_002`，`openid = mock_openid_002`

可选权益：

- 给 `user_mock_001` 发放一张 20 小时卡权益，剩余 1200 分钟。
- 给 `user_mock_002` 发放一张月卡权益，有效期从种子创建时间起 30 天。

## 7. 后端实现顺序建议

1. 先迁移配置与主数据：`users`、`wechat_identities`、`stores`、`store_areas`、`seats`、`plans`。
2. 再迁移交易与权益：`orders`、`order_items`、`user_entitlements`、`entitlement_ledger`。
3. 再迁移预约和会话：`reservations`、`study_sessions`。
4. 最后迁移门禁和统计：`access_devices`、`access_codes`、`access_events`、`daily_store_stats`。

repository 层建议按领域拆分：

- `UserRepository`
- `StoreRepository`
- `ReservationRepository`
- `OrderRepository`
- `EntitlementRepository`
- `AccessRepository`
- `StatsRepository`

跨表业务方法必须显式接收事务或在 repository 内开启事务，尤其是预约创建、支付回调、权益扣减和门禁核验。
