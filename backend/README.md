# Zixishi Backend

Initialized Node + SQLite API scaffold.

## Commands

```bash
npm install
npm run dev
```

The API runs at `http://localhost:3000` by default. SQLite data is stored in `data/zixishi.sqlite`.

Current endpoint:

- `GET /api/health`

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
