// ============================================================
// vite.config.js — Vite build tool configuration.
//
// Two key jobs:
//   1. Register the React plugin so Vite understands JSX and Fast Refresh
//   2. Set up a dev-server proxy so API calls to /api/* are forwarded
//      to the Express backend running on port 5000
//
// Why proxy?
//   During development the React app runs on http://localhost:5173 and
//   the backend on http://localhost:5000. Browsers block cross-origin
//   fetch calls unless the server sets CORS headers. Rather than relying
//   only on CORS, the Vite dev server acts as a middleman: the browser
//   talks to localhost:5173/api/... and Vite silently forwards those
//   requests to localhost:5000/api/..., making everything same-origin.
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Register the official Vite React plugin.
  // It enables JSX compilation and React Fast Refresh (hot module replacement
  // that preserves component state while you edit code).
  plugins: [react()],

  server: {
    proxy: {
      // Any request whose path starts with /api will be proxied.
      '/api': {
        target: 'http://localhost:5000', // Forward to the Express backend
        changeOrigin: true,              // Rewrite the Host header to match the target
      },
    },
  },
});
