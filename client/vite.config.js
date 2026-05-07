// STEP 8 — Vite config.
//
// Two things to notice:
//   1. The `proxy` block forwards `/api/*` to the Express server during
//      development. That means the React code can call `/api/lookup/8.8.8.8`
//      with no env var and no CORS dance — Vite's dev server stitches the
//      two ports together for us.
//   2. In production, `VITE_API_URL` (set on Vercel) overrides the proxy
//      because there's no Vite dev server in production — the bundle calls
//      Render directly.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
