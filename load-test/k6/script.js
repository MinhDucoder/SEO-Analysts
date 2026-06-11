import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const EMAIL = __ENV.DEMO_EMAIL || 'demo@loadtest.local';
const PASSWORD = __ENV.DEMO_PASSWORD || 'Demo12345!';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // warm-up ramp
    { duration: '60s', target: 50 }, // plateau
    { duration: '30s', target: 0 },  // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  const token = res.json('accessToken');
  if (!token) throw new Error(`Login failed: ${res.status} ${res.body}`);
  return { token };
}

export default function (data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}` } };

  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const me = http.get(`${BASE}/auth/me`, auth);
  check(me, { 'me 200': (r) => r.status === 200 });

  const audits = http.get(`${BASE}/audits`, auth);
  check(audits, { 'audits 200': (r) => r.status === 200 });

  sleep(1);
}
