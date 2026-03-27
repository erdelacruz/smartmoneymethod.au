// ============================================================
// vite.config.js — Vite build tool configuration.
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Group vendor libraries into shared chunks so they are cached
        // separately from app code and reused across all page chunks.
        manualChunks(id) {
          // React core — tiny, cached forever, shared by every page
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/@remix-run/')) {
            return 'vendor-react';
          }

          // mammoth — only loaded when BlogEditorPage chunk loads
          if (id.includes('node_modules/mammoth')) {
            return 'vendor-mammoth';
          }

          // xlsx — only loaded when pages that use it load
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
        },
      },
    },
  },
});
