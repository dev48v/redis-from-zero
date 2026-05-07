// STEP 8 — Top-level App + router.
//
// Two pages:
//   /               → Home (search bar, stats, recent lookups)
//   /lookup/:query  → Detail (Leaflet map, cache badge, TTL countdown)
//
// We co-locate the header and footer here so both pages share them without
// each page needing to import them individually.

import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Detail from './pages/Detail.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark">R</span>
          <span>redis-from-zero</span>
        </Link>
        <nav className="nav-links">
          <a href="https://github.com/dev48v/redis-from-zero" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://dev48v.infy.uk/from-zero.php" target="_blank" rel="noreferrer">Showcase</a>
          <a href="https://dev48v.infy.uk" target="_blank" rel="noreferrer">dev48v.infy.uk</a>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lookup/:query" element={<Detail />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>Day 29 · TechFromZero · Redis 7 + Express + React</span>
        <a href="https://dev48v.infy.uk" target="_blank" rel="noreferrer">← Back to dev48v.infy.uk</a>
      </footer>
    </div>
  );
}
