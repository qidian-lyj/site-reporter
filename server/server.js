/**
 * Server entry point.
 * Serves the built React PWA from app/dist and exposes a small JSON REST
 * API under /api (see server/routes/reports.js for the routes).
 *
 * Development:  npm run server   (API on its own; Vite serves the UI)
 * Production:   npm run build && npm start
 *               (Express serves app/dist - one process, one port)
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const store = require('./store');
const reportsRouter = require('./routes/reports');

const app = express();
const DIST_DIR = path.join(__dirname, '..', 'app', 'dist');

store.load(); // read server/data/reports.json into memory

// Reports can embed base64 photos, so allow generous JSON bodies
app.use(express.json({ limit: '30mb' }));

// Allow a separately-hosted front end (e.g. Vercel) to call this API.
// Lock it down with CORS_ORIGIN=https://your-app.vercel.app in production.
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));

// Static front end: the built React PWA (npm run build -> app/dist).
// In dev, the Vite dev server serves the UI and proxies /api here instead.
app.use(express.static(DIST_DIR));

// REST API + sync endpoint
app.use('/api', reportsRouter);

// Health check (handy for demos: is the server up and is the clock sane?)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), reports: store.getAll().length });
});

// Unknown API routes -> JSON 404 (everything else falls through to the SPA)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API route' });
});

// SPA fallback: any non-API GET serves index.html so the PWA can be opened
// directly on any path (e.g. after a service-worker navigation).
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res
      .status(503)
      .send('Front end not built yet. Run "npm run build" first, or use the Vite dev server.');
  }
});

// Central error handler - always answer with JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Start listening, with automatic port fallback.
 *
 * On Windows, Hyper-V / winNAT often reserves whole port ranges (port 3000
 * is frequently inside one), which makes Node fail with EACCES even though
 * nothing is using the port. If that happens - or the port is simply taken
 * (EADDRINUSE) - try the next candidate port instead.
 */
const FALLBACK_PORTS = [3000, 3100, 4000, 5000, 8080, 5500];
const candidates = [process.env.PORT, ...FALLBACK_PORTS]
  .filter((p) => p !== undefined && p !== '')
  .map(Number);
const ports = [...new Set(candidates)];

function listen(index) {
  if (index >= ports.length) {
    console.error(`Could not find a free port. Tried: ${ports.join(', ')}`);
    process.exit(1);
  }
  const port = ports[index];
  const server = app.listen(port, () => {
    console.log(`Site Reporter server running:  http://localhost:${port}`);
    console.log(`API health check:               http://localhost:${port}/api/health`);
    if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
      console.warn('Note: app/dist not found - run "npm run build" to build the React front end.');
    }
  });
  server.on('error', (err) => {
    if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} unavailable (${err.code}) - trying the next port…`);
      listen(index + 1);
    } else {
      throw err;
    }
  });
}

listen(0);
