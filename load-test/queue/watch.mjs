// Poll BullMQ job counts mỗi 1s, in bảng live. Chạy từ repo root:
//   node load-test/queue/watch.mjs
// Ctrl-C để dừng.
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL =
  process.env.REDIS_URL ||
  'redis://:redis-secret-change-in-production@localhost:6379';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const names = ['crawl.start', 'analyze.start', 'report.start'];
const queues = names.map((n) => new Queue(n, { connection }));

async function tick() {
  const rows = await Promise.all(
    queues.map(async (q) => {
      const c = await q.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      return { queue: q.name, ...c };
    }),
  );
  console.clear();
  console.log(`BullMQ queue counts @ ${new Date().toLocaleTimeString()}`);
  console.table(rows);
}

// Bọc tick: 1 cú hiccup Redis (vd worker chưa lên) không được làm sập bảng live giữa demo.
const safeTick = () => tick().catch((e) => console.error('tick failed:', e.message));
await safeTick();
const timer = setInterval(safeTick, 1000);

process.on('SIGINT', async () => {
  clearInterval(timer);
  await Promise.all(queues.map((q) => q.close()));
  await connection.quit();
  process.exit(0);
});
