// Bắn N audit single-mode vào 1 URL local. Chạy từ repo root:
//   node load-test/queue/enqueue.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const EMAIL = process.env.DEMO_EMAIL || 'demo@loadtest.local';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345!';
const TARGET = process.env.TARGET_URL || 'http://web:3000';
const COUNT = Number(process.env.COUNT || 30);

const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!loginRes.ok) {
  throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
}
const { accessToken } = await loginRes.json();

let accepted = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: COUNT }, async (_, i) => {
    const res = await fetch(`${BASE}/audits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url: TARGET, mode: 'single' }),
    });
    if (res.status === 202) {
      accepted += 1;
    } else {
      failed += 1;
      console.error(`audit ${i} -> ${res.status} ${await res.text()}`);
    }
  }),
);
console.log(`Enqueued ${COUNT} audits: ${accepted} accepted (202), ${failed} failed`);
