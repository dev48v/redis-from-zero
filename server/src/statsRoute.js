// STEP 6 — /api/cache/stats and /api/cache/recent.
//
// Two new Redis primitives in this step:
//   - INCR — atomic counter. We bump `stats:hits` on every cache HIT and
//            `stats:misses` on every MISS. Atomic means two concurrent
//            requests can't lose an increment to a read-modify-write race.
//   - LPUSH + LTRIM + LRANGE — bounded-list trick. After every successful
//            lookup we LPUSH the query onto `recent:lookups`, then LTRIM
//            to keep only the newest N. The list never grows unbounded.

import express from 'express';
import { redis, isRedisReady } from './redis.js';
import { config } from './config.js';

export const statsRouter = express.Router();

statsRouter.get('/cache/stats', async (_req, res) => {
  if (!isRedisReady()) {
    return res.status(503).json({ error: 'cache_unavailable' });
  }

  // Pipeline = one round trip for four commands. Without pipelining this
  // is a 4× round-trip-time cost which feels sluggish on Render's free tier.
  const [hits, misses, dbsize, recent] = await redis
    .pipeline()
    .get('stats:hits')
    .get('stats:misses')
    .dbsize()
    .lrange('recent:lookups', 0, config.recentListMax - 1)
    .exec()
    .then((rows) => rows.map(([, value]) => value));

  const hitNum = Number.parseInt(hits ?? '0', 10);
  const missNum = Number.parseInt(misses ?? '0', 10);
  const total = hitNum + missNum;
  const hitRate = total === 0 ? 0 : Math.round((hitNum / total) * 1000) / 10;

  res.json({
    hits: hitNum,
    misses: missNum,
    total,
    hitRatePct: hitRate,
    keys: dbsize,
    recent,
  });
});

statsRouter.get('/cache/recent', async (_req, res) => {
  if (!isRedisReady()) {
    return res.status(503).json({ error: 'cache_unavailable' });
  }
  const recent = await redis.lrange('recent:lookups', 0, config.recentListMax - 1);
  res.json({ recent });
});
