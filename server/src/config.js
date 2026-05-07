// STEP 2 — Configuration loader.
//
// Centralising environment lookups in one file means the rest of the codebase
// never reads `process.env` directly. That makes the config surface explicit
// (one place to grep) and lets tests inject overrides without monkey-patching.

import 'dotenv/config';

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  // Reject NaN and negative values — a misconfigured TTL of "abc" should fail
  // loudly at boot, not silently turn into a 1-second cache later.
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid integer for ${name}: ${raw}`);
  }
  return n;
}

export const config = {
  port: intFromEnv('PORT', 8080),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  cacheTtlSeconds: intFromEnv('CACHE_TTL_SECONDS', 3600),
  recentListMax: intFromEnv('RECENT_LIST_MAX', 10),
  upstreamTimeoutMs: intFromEnv('UPSTREAM_TIMEOUT_MS', 5000),
  // Comma-separated list of allowed CORS origins. Defaults to '*' in dev so
  // the Vite dev server (port 5173) can talk to us without ceremony.
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
