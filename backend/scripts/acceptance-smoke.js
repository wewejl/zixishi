import { issueMockToken } from '../src/services/auth.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const STORE_ID = process.env.SMOKE_STORE_ID || 'store_default';
const USER_ID = process.env.SMOKE_USER_ID || 'user_mock_001';

async function main() {
  const token = issueMockToken(USER_ID);
  const headers = { Authorization: `Bearer ${token}` };
  const window = nextCheckInWindow();

  const summaryBefore = await request(`/api/stores/${STORE_ID}/summary`, { headers });
  if (summaryBefore.metrics?.studyingUserCount === 188) {
    throw new Error('store summary returned mock fallback studyingUserCount=188');
  }

  const packageOrder = await request('/api/orders', {
    method: 'POST',
    headers,
    body: { type: 'package', packageId: 'plan_20h', storeId: STORE_ID },
  });
  await request(`/api/orders/${packageOrder.order.id}/mock-pay`, {
    method: 'POST',
    headers,
    body: { payResult: 'success' },
  });

  const availability = await request(
    `/api/stores/${STORE_ID}/seat-availability?startAt=${encodeURIComponent(window.startAt)}&endAt=${encodeURIComponent(window.endAt)}`,
    { headers },
  );
  const seat = availability.seats.find((item) => item.availabilityStatus === 'available');
  if (!seat) {
    throw new Error('no available seat for smoke reservation');
  }

  const created = await request('/api/reservations', {
    method: 'POST',
    headers,
    body: {
      storeId: STORE_ID,
      seatId: seat.id,
      startAt: window.startAt,
      endAt: window.endAt,
      useEntitlement: true,
    },
  });
  if (created.reservation?.status !== 'confirmed') {
    throw new Error(`reservation was not confirmed by entitlement: ${JSON.stringify(created)}`);
  }

  const checkIn = await request('/api/study-session/check-in', {
    method: 'POST',
    headers,
    body: { reservationId: created.reservation.id, checkInSource: 'acceptance_smoke' },
  });

  await request('/api/access/unlock', {
    method: 'POST',
    headers,
    body: { storeId: STORE_ID, deviceId: 'access_device_main', source: 'acceptance_smoke' },
  });

  const ended = await request(`/api/study-session/${checkIn.session.id}/end`, {
    method: 'POST',
    headers,
    body: { reason: 'acceptance_smoke' },
  });
  if (ended.session?.status !== 'completed') {
    throw new Error(`session did not complete: ${JSON.stringify(ended)}`);
  }

  const merchantSummary = await request(`/api/merchant/stores/${STORE_ID}/operations-summary`, { headers });
  const members = await request(`/api/merchant/stores/${STORE_ID}/members?limit=5`, { headers });
  const accessEvents = await request(`/api/merchant/stores/${STORE_ID}/access-events?limit=5`, { headers });
  const reservations = await request(`/api/merchant/stores/${STORE_ID}/reservations?limit=5`, { headers });
  const orders = await request(`/api/merchant/stores/${STORE_ID}/orders?limit=5`, { headers });

  assertArrayResponse('members', members);
  assertArrayResponse('accessEvents', accessEvents);
  assertArrayResponse('reservations', reservations);
  assertArrayResponse('orders', orders);

  console.log('acceptance smoke ok');
  console.log(JSON.stringify({
    reservationId: created.reservation.id,
    sessionId: checkIn.session.id,
    studyingUserCountBefore: summaryBefore.metrics?.studyingUserCount,
    merchantMetrics: merchantSummary.metrics,
  }, null, 2));
}

function nextCheckInWindow() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = shanghai.getUTCHours();
  if (hour < 8 || hour >= 22) {
    throw new Error('acceptance smoke must run during seeded business hours, 08:00-22:00 Asia/Shanghai');
  }

  const start = new Date(now.getTime() + 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function assertArrayResponse(name, response) {
  if (!Array.isArray(response.items)) {
    throw new Error(`${name} did not return items[]`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
