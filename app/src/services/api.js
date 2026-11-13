/**
 * Thin fetch wrapper around the server's JSON REST API.
 *
 * In dev, Vite proxies /api to the Express server (see vite.config.js).
 * In production the app is served by the same Express server, so relative
 * URLs work everywhere. To host the app and the API on different origins
 * (e.g. Vercel + Render), set VITE_API_BASE at build time:
 *   VITE_API_BASE=https://your-api.example.com/api npm run build
 */
const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch {
      /* body was not JSON - keep the status message */
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/** GET /api/reports (optionally only those updated since an ISO date). */
export const listReports = (since) =>
  request(`/reports${since ? `?since=${encodeURIComponent(since)}` : ''}`);

/** GET /api/reports/:id */
export const getReport = (id) => request(`/reports/${encodeURIComponent(id)}`);

/** POST /api/reports */
export const createReport = (report) =>
  request('/reports', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(report) });

/** PUT /api/reports/:id - update or create (upsert). */
export const putReport = (id, report) =>
  request(`/reports/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(report),
  });

/** DELETE /api/reports/:id */
export const deleteReport = (id) =>
  request(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** POST /api/sync - bulk push/pull used by the sync engine. */
export const sync = (changes, since = null) =>
  request('/sync', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ changes, since }),
  });

/** GET /api/health */
export const health = () => request('/health');
