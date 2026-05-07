// STEP 5 — /api/lookup/:query — the cache-aside route.
//
// THE pattern this whole project exists to teach. Flow:
//
//   1. Normalise the query (lowercase + trim) so "8.8.8.8" and "8.8.8.8 "
//      hit the same cache entry.
//   2. GET cache:ip:<query>
//        → HIT  → respond with cached JSON, set X-Cache: HIT.
//        → MISS → fall through.
//   3. Call ip-api.com.
//   4. SETEX cache:ip:<query> <ttl> <json>  (atomic value + expiry).
//   5. Respond with X-Cache: MISS and the fresh body.
//
// We also expose the remaining TTL via X-Cache-TTL so the UI can show a
// countdown — purely educational; not how production caches advertise state.

import express from 'express';
import { redis, isRedisReady } from './redis.js';
import { lookupIp, isValidQuery, UpstreamError } from './ipApi.js';
import { config } from './config.js';
import { log } from './logger.js';

export const lookupRouter = express.Router();

const cacheKey = (q) => `cache:ip:${q}`;

function normalise(query) {
  return String(query ?? '').trim().toLowerCase();
}

lookupRouter.get('/lookup/:query', async (req, res) => {
  const query = normalise(req.params.query);

  if (!isValidQuery(query)) {
    return res.status(400).json({ error: 'invalid_query', query });
  }

  if (!isRedisReady()) {
    // Cache layer down. Could fall through directly to upstream, but then a
    // sustained Redis outage would shred our 45-req/min ip-api budget. Better
    // to surface the outage and let the caller back off.
    return res.status(503).json({ error: 'cache_unavailable' });
  }

  const key = cacheKey(query);

  try {
    // Cache lookup. We use a Redis pipeline to fetch the value AND its TTL
    // in a single round trip — saves one network hop on every cache HIT.
    const [cachedJson, ttl] = await redis
      .pipeline()
      .get(key)
      .ttl(key)
      .exec()
      .then((rows) => rows.map(([, value]) => value));

    if (cachedJson) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-TTL', String(ttl));
      // We stored JSON — parse so the response is a real object, not a
      // string-of-JSON. The frontend would still work either way, but JSON
      // bodies are friendlier in browser devtools and curl.
      return res.json(JSON.parse(cachedJson));
    }

    // MISS — go upstream.
    const fresh = await lookupIp(query);
    const json = JSON.stringify(fresh);

    // SETEX = SET + EXPIRE in one atomic command. Critical: doing SET then
    // EXPIRE separately leaves a window where the key has no TTL, which is
    // a classic "Redis is full of orphan keys" production incident.
    await redis.setex(key, config.cacheTtlSeconds, json);

    res.set('X-Cache', 'MISS');
    res.set('X-Cache-TTL', String(config.cacheTtlSeconds));
    return res.json(fresh);
  } catch (err) {
    if (err instanceof UpstreamError) {
      log.warn('lookup.upstream_error', { query, status: err.status, message: err.message });
      return res.status(err.status).json({ error: 'upstream_error', message: err.message });
    }
    log.error('lookup.unexpected_error', { query, message: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
});
