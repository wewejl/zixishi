# Zixishi Backend

Initialized Node + SQLite API scaffold.

## Commands

```bash
npm install
npm run dev
```

Requires Node.js 22+ with `node:sqlite` support. The API runs at `http://localhost:3000` by default. SQLite data is stored in `data/zixishi.sqlite`.

Core endpoints now include login, stores, reservations, study sessions, packages, orders, WeChat Pay, and access control. See `../API_CONTRACT.md` and `../LAUNCH_CHECKLIST.md`.

Production WeChat login and WeChat Pay are configured through environment variables. Use `../.env.example` as the required variable list.

## Door access smoke test

Start the API first:

```bash
npm run start
```

Then run:

```bash
npm run access:smoke
```

The mock login returns a signed `mock_access_token.<payload>.<signature>` token. The dev default user is `user_mock_002` because the seeded account has a period entitlement that can unlock the access device. Override with `MOCK_DEFAULT_USER_ID=user_mock_001` when you need to test a minutes-card-only account.

## Acceptance smoke test

Start from a clean seeded database, then keep the API running:

```bash
npm run db:reset -- --yes
npm run start
```

In another terminal, during seeded business hours (`08:00-22:00 Asia/Shanghai`), run:

```bash
npm run acceptance:smoke
```

The script verifies the usable data chain:

- package order -> mock pay -> entitlement grant
- entitlement reservation -> check-in -> access unlock event -> end session
- merchant operations summary, members, access events, reservations, and orders

Merchant endpoints currently reuse normal bearer authentication. Store-scoped merchant roles are centralized as a TODO in `src/middleware/merchantAuth.js`.

## Merchant endpoints

- `GET /api/merchant/stores/:storeId/operations-summary?from=&to=`
- `GET /api/merchant/stores/:storeId/summary?from=&to=`
- `GET /api/merchant/stores/:storeId/members?keyword=&status=&limit=&cursor=`
- `GET /api/merchant/stores/:storeId/users?keyword=&status=&limit=&cursor=`
- `GET /api/merchant/stores/:storeId/access-events?result=&limit=&cursor=`
- `GET /api/merchant/stores/:storeId/reservations?status=&limit=&cursor=`
- `GET /api/merchant/stores/:storeId/orders?status=&limit=&cursor=`
