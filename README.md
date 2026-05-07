# redis-from-zero

> Redis-backed IP Geolocation Explorer. Cache-aside pattern, Express + React, step-by-step build for beginners.

## Quick start

```bash
# Boot Redis + API together
docker compose up --build

# In another terminal, start the React frontend
cd client
npm install
npm run dev
```

- API: http://localhost:8080
- Web:  http://localhost:5173
- Redis: localhost:6379

## What this teaches

- **Cache-aside pattern** — read-through cache that falls back to upstream, then writes back with TTL
- **Redis primitives** — `GET`, `SETEX`, `INCR` (counters), `LPUSH` + `LTRIM` + `LRANGE` (recent-lookups list), `DBSIZE`
- **Connection lifecycle** — ioredis with retry strategy, ready/error events
- **Response headers** — surfacing cache state via `X-Cache: HIT|MISS` and `X-Cache-TTL`
- **Why caching matters** — ip-api.com free tier rate-limits to 45 req/min from one IP. With Redis, the same lookup served 1000 times costs 1 upstream call

## Architecture

```
React (Vite, port 5173)
   │  fetch /api/lookup/:query
   ▼
Express (port 8080)
   │  GET cache:ip:<query>
   ▼
Redis 7
   │  cache MISS  → fetch ip-api.com
   │  SETEX 3600  → store JSON
   ▼
ip-api.com (45 req/min free)
```

## Step-by-step build

Each commit on `main` adds one concept. Read them in order.

| # | Commit | What it adds |
|---|--------|--------------|
| 1 | monorepo skeleton | npm workspaces (server + client) |
| 2 | Express skeleton  | `/healthz`, dotenv, structured JSON logging |
| 3 | Redis wrapper     | ioredis client, retry strategy, ready guard |
| 4 | ip-api.com client | input validation, AbortSignal timeout |
| 5 | lookup route      | cache-aside via `GET` → upstream → `SETEX` |
| 6 | stats + recents   | `INCR` counters, `LPUSH`+`LTRIM` recent list |
| 7 | Docker            | multi-stage Dockerfile + docker-compose |
| 8 | client scaffold   | Vite + React 19 + react-router-dom 7 |
| 9 | Home page         | search bar + recent-lookups feed |
| 10| Detail page       | Leaflet map + cache badge + TTL countdown |
| 11| Deploy config     | render.yaml Blueprint (web + redis services) |

## Why these choices

- **ioredis** over node-redis — better cluster support, cleaner retry hooks, drop-in API
- **ip-api.com** over ipapi.co/ipinfo — no key, generous 45 req/min, fields parameter to slim payload
- **Leaflet + OpenStreetMap** — zero key, well-known tile servers, ~40 KB unminified
- **Cache-aside** over write-through — upstream is read-only, so write-through has no use case here

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `8080` | API port |
| `REDIS_URL` | `redis://redis:6379` | ioredis connection string |
| `CACHE_TTL_SECONDS` | `3600` | TTL for cached lookups (1h) |
| `RECENT_LIST_MAX` | `10` | Max entries kept in `recent:lookups` list |

## Deploying

- **API + Redis** → Render Blueprint (`render.yaml`). Free Redis tier is 25 MB which is plenty for cached geo lookups.
- **Frontend** → Vercel. Set `VITE_API_URL` to the Render API URL.
