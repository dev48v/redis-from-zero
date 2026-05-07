// STEP 10 placeholder — Leaflet map + cache badge land in the next commit.

import { useParams, Link } from 'react-router-dom';

export default function Detail() {
  const { query } = useParams();
  return (
    <section>
      <Link to="/" className="back-link">← Back</Link>
      <h2>{query}</h2>
      <p>Map + cache badge land in Step 10.</p>
    </section>
  );
}
