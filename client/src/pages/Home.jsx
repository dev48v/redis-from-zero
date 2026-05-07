// STEP 9 — Home page.
//
// Three pieces of UI here, all wired to the API client from Step 8:
//   - Search form: validates locally, navigates to /lookup/:query on submit.
//   - Stats grid: hits, misses, hit-rate %, total keys. Polls every 5s so a
//     classroom demo can watch the numbers move in real time.
//   - Recent lookups: bounded list (LPUSH+LTRIM on the server). Each is a
//     clickable chip so re-clicking serves the next request from cache and
//     visibly bumps the HIT counter.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStats } from '../api.js';

const VALID_QUERY = /^[A-Za-z0-9.\-:]{1,253}$/;

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  function onSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!VALID_QUERY.test(q)) {
      setError('Enter an IPv4/IPv6 address or domain (letters, digits, dots, dashes only).');
      return;
    }
    setError('');
    navigate(`/lookup/${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const s = await fetchStats();
        if (!cancelled) setStats(s);
      } catch {
        // Silent — stats are decorative. Don't block the UI on a polling miss.
      }
    }
    tick();
    // 5s poll keeps the dashboard live without hammering the API. Each poll
    // is one cheap pipelined Redis call (4 commands → 1 round trip).
    const id = setInterval(tick, 5_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Redis-backed <span className="accent">IP Geolocation</span></h1>
        <p>
          Type an IP address or domain. The server hits ip-api.com on first
          ask, caches the response in Redis for 1 hour, and serves every
          repeat instantly — watch the <code>X-Cache</code> badge flip from{' '}
          <span style={{ color: 'var(--miss)' }}>MISS</span> to{' '}
          <span style={{ color: 'var(--hit)' }}>HIT</span>.
        </p>
      </section>

      <form className="search-form" onSubmit={onSubmit}>
        <input
          autoFocus
          inputMode="text"
          placeholder="8.8.8.8  or  github.com  or  2606:4700:4700::1111"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(''); }}
        />
        <button type="submit">Look up</button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {stats && (
        <>
          <div className="section-title">Cache stats</div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Hits</div>
              <div className="stat-value hit">{stats.hits}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Misses</div>
              <div className="stat-value miss">{stats.misses}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Hit rate</div>
              <div className="stat-value">{stats.hitRatePct}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Keys in Redis</div>
              <div className="stat-value">{stats.keys}</div>
            </div>
          </div>
        </>
      )}

      {stats?.recent?.length > 0 && (
        <>
          <div className="section-title">Recent lookups</div>
          <div className="recent-grid">
            {stats.recent.map((q, i) => (
              <a
                key={`${q}-${i}`}
                href={`/lookup/${encodeURIComponent(q)}`}
                className="recent-chip"
                onClick={(e) => { e.preventDefault(); navigate(`/lookup/${encodeURIComponent(q)}`); }}
              >
                {q}
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}
