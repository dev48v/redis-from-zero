// STEP 9 placeholder — full Home page lands in the next commit.
//
// We render an empty shell so the router has something to mount and the dev
// server boots cleanly. Step 9 fills in search, stats, and recents.

export default function Home() {
  return (
    <section className="hero">
      <h1>Redis-backed <span className="accent">IP Geolocation</span></h1>
      <p>Search bar lands in Step 9.</p>
    </section>
  );
}
