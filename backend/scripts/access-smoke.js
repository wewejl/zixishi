const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  const login = await request('/api/auth/wechat-login', {
    method: 'POST',
    body: { code: 'dev' },
    auth: false,
  });

  if (!login.accessToken) {
    throw new Error('login did not return accessToken');
  }

  const headers = {
    Authorization: `${login.tokenType || 'Bearer'} ${login.accessToken}`,
  };

  const unlock = await request('/api/access/unlock', {
    method: 'POST',
    headers,
    body: {
      storeId: 'store_default',
      deviceId: 'access_device_main',
      source: 'smoke',
    },
  });

  if (unlock.unlock?.status !== 'granted') {
    throw new Error('unlock was not granted');
  }

  const code = await request('/api/access/long-term-code?storeId=store_default', {
    headers,
  });

  if (!code.code?.maskedCode) {
    throw new Error('long-term code was not returned');
  }

  const badStore = await request('/api/access/unlock', {
    method: 'POST',
    headers,
    body: {
      storeId: 'bad_store',
      deviceId: 'access_device_main',
    },
    expectOk: false,
  });

  if (badStore.status !== 404) {
    throw new Error(`bad store should return 404, got ${badStore.status}`);
  }

  console.log('access smoke ok');
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

  const data = await response.json();
  if (options.expectOk === false) {
    return { status: response.status, data };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
