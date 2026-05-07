// STEP 10 — Detail page.
//
// Renders the cache state, the geolocation fields, and a Leaflet map pinned
// to the lat/lon. Three things are worth pointing out:
//
//   1. The TTL countdown ticks every second client-side. We never re-poll
//      the server for it — the server already returned `X-Cache-TTL` once;
//      decrementing locally is free and accurate to the second.
//
//   2. We dynamic-import Leaflet so the map JS only ships when this route
//      is visited. Saves ~50 KB on the initial Home-page bundle.
//
//   3. Leaflet's default marker icons reference image paths via the npm
//      package; with Vite + bundlers those paths break. We register a tiny
//      div-icon instead — zero asset gymnastics.

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lookup } from '../api.js';

export default function Detail() {
  const { query } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    lookup(query)
      .then((result) => { if (!cancelled) setState({ status: 'ok', ...result }); })
      .catch((err) => { if (!cancelled) setState({ status: 'error', error: err.message }); });
    return () => { cancelled = true; };
  }, [query]);

  return (
    <section>
      <Link to="/" className="back-link">← Back</Link>

      {state.status === 'loading' && (
        <p><span className="spinner" /> Looking up <code>{query}</code>…</p>
      )}

      {state.status === 'error' && (
        <div className="error-banner">Lookup failed: {state.error}</div>
      )}

      {state.status === 'ok' && <Result query={query} data={state.data} cache={state.cache} />}
    </section>
  );
}

function Result({ query, data, cache }) {
  return (
    <>
      <div className="detail-header">
        <h2>{data.query ?? query}</h2>
        <CacheBadge cache={cache} />
      </div>

      <div className="detail-grid">
        <div className="info-card">
          <dl>
            <Row label="Country" value={`${data.country ?? '—'} (${data.countryCode ?? '—'})`} />
            <Row label="Region" value={data.regionName ?? '—'} />
            <Row label="City" value={data.city ?? '—'} />
            <Row label="ZIP" value={data.zip || '—'} />
            <Row label="Coordinates" value={`${data.lat ?? '—'}, ${data.lon ?? '—'}`} />
            <Row label="Timezone" value={data.timezone ?? '—'} />
            <Row label="Currency" value={data.currency ?? '—'} />
            <Row label="ISP" value={data.isp ?? '—'} />
            <Row label="Org" value={data.org ?? '—'} />
            <Row label="AS" value={data.as ?? '—'} />
          </dl>
        </div>

        <Map lat={data.lat} lon={data.lon} city={data.city} />
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CacheBadge({ cache }) {
  // Local TTL countdown. Reset whenever the underlying cache object changes
  // (i.e. after a navigation) so a HIT badge counts down from the server-
  // reported remaining time, not from the original 3600.
  const [seconds, setSeconds] = useState(cache.ttl);

  useEffect(() => {
    setSeconds(cache.ttl);
    if (cache.ttl <= 0) return undefined;
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cache.ttl, cache.state]);

  const cls = cache.state === 'HIT' ? 'hit' : cache.state === 'MISS' ? 'miss' : 'unknown';
  const ttlLabel = useMemo(() => formatTtl(seconds), [seconds]);

  return (
    <span className={`cache-badge ${cls}`}>
      <span>X-Cache: {cache.state}</span>
      {cache.ttl > 0 && <span>· TTL {ttlLabel}</span>}
    </span>
  );
}

function formatTtl(s) {
  if (s <= 0) return 'expired';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m === 0 ? `${r}s` : `${m}m ${r}s`;
}

// ---------------------------------------------------------------------------

function Map({ lat, lon, city }) {
  const [LeafletMod, setLeafletMod] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Dynamic import — Leaflet + react-leaflet only ship when a Detail page
    // mounts. Home page never needs it.
    Promise.all([import('leaflet'), import('react-leaflet')]).then(([L, RL]) => {
      if (cancelled) return;
      // Override the default marker so we don't hit the broken-asset issue
      // bundlers create with Leaflet's image-relative URLs. A simple HTML
      // pin is actually clearer on a small map anyway.
      const pin = L.divIcon({
        className: 'custom-pin',
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 0 2px rgba(239,68,68,0.4)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      setLeafletMod({ L, RL, pin });
    });
    return () => { cancelled = true; };
  }, []);

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return <div className="info-card">No coordinates returned.</div>;
  }
  if (!LeafletMod) {
    return <div className="map-wrapper" style={{ display: 'grid', placeItems: 'center', color: 'var(--fg-2)' }}>Loading map…</div>;
  }

  const { RL, pin } = LeafletMod;
  const { MapContainer, TileLayer, Marker, Popup } = RL;

  return (
    <div className="map-wrapper">
      <MapContainer center={[lat, lon]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]} icon={pin}>
          <Popup>{city || `${lat}, ${lon}`}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
