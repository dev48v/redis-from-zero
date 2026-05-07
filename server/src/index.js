// STEP 2 — Express bootstrap.
//
// This file wires Express, CORS, and `/healthz`. Routes that depend on Redis
// or the upstream client land in later steps so each commit is small and
// reviewable on its own.

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { log } from './logger.js';

const app = express();

// CORS first so preflight OPTIONS requests get answered before any route
// handler runs. The default `*` is fine while we're stateless and have no
// cookies — tighten this once auth shows up.
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Tiny request logger. `res.on('finish')` fires once the status code is
// known, so we capture method, path, status, and duration in one record.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    log.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });
  next();
});

// Liveness probe. Render and Docker healthchecks hit this. Keep it cheap —
// no Redis ping here, because we want the container marked alive even when
// Redis is briefly unreachable (the lookup route still returns a 503).
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 404 fallback after every real route is registered. We register it inside
// `start()` so future steps can `app.use(...)` more routes before this fires.
function attachNotFound() {
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', path: req.path });
  });
}

export function start() {
  attachNotFound();
  app.listen(config.port, () => {
    log.info('server.listening', { port: config.port });
  });
}

export { app };

// Boot when run directly (`node src/index.js`). Importing this file from a
// test file does NOT auto-start the server.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  start();
}
