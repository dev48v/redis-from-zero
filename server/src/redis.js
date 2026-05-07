// STEP 3 — Redis client wrapper.
//
// ioredis already gives us reconnection, command queueing, and a Promise API.
// What we add here:
//   1. Exponential backoff retry strategy capped at 5 seconds (default ramps
//      to 30 minutes which is way too slow for a dev workflow).
//   2. A `ready` flag so request handlers can fast-fail with HTTP 503 instead
//      of having ioredis silently queue commands during a 30s reconnect.
//   3. Structured logs on every connection state change — invaluable when a
//      Render free Redis cold-starts and produces a confusing 503.

import Redis from 'ioredis';
import { config } from './config.js';
import { log } from './logger.js';

// ioredis accepts either a URL string or an options object. Passing the URL
// is simpler and lets us flip between local docker-compose and Render's
// rediss:// (TLS) connection string with zero code changes.
export const redis = new Redis(config.redisUrl, {
  // Don't queue commands while disconnected — fail fast so callers can
  // surface the outage to the user instead of timing out at the HTTP layer.
  enableOfflineQueue: false,
  // Cap retry delay at 5s. Default jitters up to 30 minutes which feels
  // broken when you're actively debugging.
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5_000);
    log.warn('redis.retry', { attempt: times, delayMs: delay });
    return delay;
  },
  // ioredis emits an unhandled-rejection warning if we don't catch this.
  maxRetriesPerRequest: 3,
});

let ready = false;

redis.on('ready', () => {
  ready = true;
  log.info('redis.ready', { url: config.redisUrl });
});

redis.on('error', (err) => {
  // We deliberately don't crash the process here. Letting Express keep
  // serving /healthz means orchestrators can distinguish "Redis is down"
  // (cache misses but app alive) from "container is dead".
  log.error('redis.error', { message: err.message, code: err.code });
});

redis.on('end', () => {
  ready = false;
  log.warn('redis.connection_ended');
});

export function isRedisReady() {
  return ready;
}
