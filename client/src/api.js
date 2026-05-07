// STEP 8 — Tiny API client.
//
// Centralising fetches in one file means we can swap base URLs (dev proxy
// vs production Render URL) by changing one line, and components never
// touch `fetch` directly. The cache headers (`X-Cache`, `X-Cache-TTL`) get
// surfaced as a metadata object alongside the JSON body — those headers are
// the whole point of this project, so we need them in the UI.

const BASE = import.meta.env.VITE_API_URL ?? '';

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error ?? body?.message ?? `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function lookup(query) {
  const res = await fetch(`${BASE}/api/lookup/${encodeURIComponent(query)}`);
  const cache = {
    state: res.headers.get('X-Cache') ?? 'UNKNOWN',
    ttl: Number.parseInt(res.headers.get('X-Cache-TTL') ?? '0', 10),
  };
  const data = await jsonOrThrow(res);
  return { data, cache };
}

export async function fetchStats() {
  const res = await fetch(`${BASE}/api/cache/stats`);
  return jsonOrThrow(res);
}

export async function fetchRecent() {
  const res = await fetch(`${BASE}/api/cache/recent`);
  return jsonOrThrow(res);
}
