// STEP 4 — ip-api.com client.
//
// Free tier: 45 requests/minute per upstream IP, no key required.
//   Endpoint: http://ip-api.com/json/<query>?fields=...
//
// Decisions:
//   - `fields` query parameter trims the response payload from ~500 bytes to
//     ~250 bytes. Cheaper to cache, faster on the wire.
//   - AbortSignal.timeout caps a stuck upstream at 5s so the client doesn't
//     hang indefinitely when ip-api.com is rate-limiting us.
//   - We accept either an IPv4/IPv6 address or a domain name. Empty / blank
//     query — caller is expected to short-circuit before calling us.

import { config } from './config.js';
import { log } from './logger.js';

// Bitmask request — ip-api.com supports a numeric `fields` value to compose
// only the fields we care about. Saves us from typing names and avoids typos.
// See https://ip-api.com/docs/api:json — composing the fields used below.
const FIELDS = [
  'status',
  'message',
  'continent',
  'country',
  'countryCode',
  'region',
  'regionName',
  'city',
  'zip',
  'lat',
  'lon',
  'timezone',
  'currency',
  'isp',
  'org',
  'as',
  'query',
].join(',');

// Quick syntactic validation. ip-api.com itself rejects invalid input with a
// JSON {"status":"fail"}, but failing fast here saves a network round trip
// and lets us return a tidy 400 to the client.
const IP_OR_DOMAIN = /^[A-Za-z0-9.\-:]{1,253}$/;

export class UpstreamError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status ?? 502;
    if (cause) this.cause = cause;
  }
}

export function isValidQuery(input) {
  if (typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 253) return false;
  return IP_OR_DOMAIN.test(trimmed);
}

export async function lookupIp(query) {
  // Defence in depth — even if a route handler forgets to validate.
  if (!isValidQuery(query)) {
    throw new UpstreamError('invalid query', { status: 400 });
  }

  const url = `http://ip-api.com/json/${encodeURIComponent(query)}?fields=${FIELDS}`;

  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(config.upstreamTimeoutMs),
      headers: { 'User-Agent': 'redis-from-zero/0.1 (+https://github.com/dev48v)' },
    });
  } catch (err) {
    log.error('ipapi.fetch_failed', { message: err.message, name: err.name });
    // AbortError → 504 (we timed out), everything else → 502 (bad upstream).
    const status = err.name === 'TimeoutError' ? 504 : 502;
    throw new UpstreamError(`upstream request failed: ${err.message}`, { status, cause: err });
  }

  if (!res.ok) {
    log.warn('ipapi.bad_status', { status: res.status });
    throw new UpstreamError(`upstream returned HTTP ${res.status}`, { status: 502 });
  }

  const body = await res.json();

  // ip-api wraps errors in {"status":"fail","message":"..."}. We translate
  // that into a 4xx UpstreamError because the *caller* is at fault, not the
  // upstream — bad query, private IP, reserved range, etc.
  if (body.status === 'fail') {
    throw new UpstreamError(body.message ?? 'upstream rejected query', { status: 422 });
  }

  return body;
}
