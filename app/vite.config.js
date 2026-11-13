import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the Vite server proxies /api to the Express backend, so the app
// code can always call the API with relative URLs (no CORS pain).
// If your server prints a different port, change the target here or set
// the API_PROXY environment variable, e.g.:
//   set API_PROXY=http://localhost:4000 && npm run dev
const apiTarget = process.env.API_PROXY || 'http://localhost:3100';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
    },
  },
  build: {
    outDir: 'dist',
  },
});
