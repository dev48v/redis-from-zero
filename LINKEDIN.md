Day 29 - I called the same API a thousand times. Only one of them actually fired.


🚀TechFromZero Series - RedisFromZero


🌐 Try it live: https://redis-from-zero.vercel.app


This isn't a Hello World. It's a real cache-aside geolocation service:
📐 React UI → Express API → Redis → ip-api.com (only on cache miss)


🔗 The full code (with step-by-step commits you can follow):
https://github.com/dev48v/redis-from-zero


🧱 What I built (step by step):

1️⃣ Monorepo with npm workspaces — server (Node 22 + Express 5) and client (Vite + React 19)

2️⃣ ioredis wrapper — capped exponential backoff, ready flag, /readyz probe so a Redis outage doesn't pretend the cache works

3️⃣ ip-api.com client with input validation, AbortSignal timeout, and a typed UpstreamError that maps cleanly to HTTP 4xx/5xx

4️⃣ Cache-aside route — pipelined GET+TTL on hit, atomic SETEX on miss, X-Cache + X-Cache-TTL response headers so the browser sees the cache state

5️⃣ Cache stats — atomic INCR counters for hits/misses, LPUSH+LTRIM bounded recent-lookups list (the "tail of N" trick)

6️⃣ Multi-stage Dockerfile + docker-compose (api + redis 7-alpine with AOF persistence) — one command boots the whole stack

7️⃣ React Home page — search form, polled stats grid, clickable recent chips so you can watch the HIT counter tick up live

8️⃣ Detail page with Leaflet map (lazy-loaded chunk), cache HIT/MISS badge, and a TTL countdown that ticks down second by second


💡 Every file has detailed comments explaining WHY, not just what. Written for any beginner who wants to learn Redis by reading real code — with full clarity on each step.

👉 If you're a beginner learning Redis, clone it and read the commits one by one. Each commit = one concept. Each file = one lesson. Built from scratch, so nothing is hidden.

🔥 This is Day 29 of a 50-day series. A new technology every day. Follow along!


🌐 See all days: https://dev48v.infy.uk/techfromzero.php

#TechFromZero #Day29 #Redis #LearnByDoing #OpenSource #BeginnerGuide #100DaysOfCode #CodingFromScratch
