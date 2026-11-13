/**
 * REST API for reports + the bulk sync endpoint.
 *
 * Data lives in a plain JSON file (server/data/reports.json) - the
 * "simple dumb storage" required by the brief. Mounted at /api by server.js:
 *
 *   GET    /api/reports          list all (optional ?since=<ISO date>)
 *   GET    /api/reports/:id      read one
 *   POST   /api/reports          create
 *   PUT    /api/reports/:id      update or create (upsert, used by "upload all")
 *   DELETE /api/reports/:id      delete
 *   POST   /api/sync             bulk push/pull used by the sync engine
 */
const crypto = require('crypto');
const express = require('express');
const store = require('../store');

const router = express.Router();

/** Pick only the fields the server understands (never trust the client blindly). */
function sanitise(body = {}) {
  return {
    id: typeof body.id === 'string' && body.id ? body.id : null,
    title: typeof body.title === 'string' ? body.title : '',
    category: typeof body.category === 'string' ? body.category : 'uncategorised',
    description: typeof body.description === 'string' ? body.description : '',
    recipient: typeof body.recipient === 'string' ? body.recipient : '',
    photos: Array.isArray(body.photos) ? body.photos : [],
    location: body.location && typeof body.location === 'object' ? body.location : null,
    createdAt: typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString(),
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : new Date().toISOString(),
  };
}

// GET /api/reports?since=<ISO date>
router.get('/reports', (req, res) => {
  let items = store.getAll();
  if (req.query.since) items = items.filter((r) => r.updatedAt > req.query.since);
  res.json(items);
});

// GET /api/reports/:id
router.get('/reports/:id', (req, res) => {
  const report = store.getById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

// POST /api/reports
router.post('/reports', (req, res) => {
  const data = sanitise(req.body);
  data.id = data.id || crypto.randomUUID();
  if (store.getById(data.id)) {
    return res.status(409).json({ error: 'A report with this id already exists - use PUT to update it.' });
  }
  res.status(201).json(store.create(data));
});

// PUT /api/reports/:id  (upsert, so the "dumb upload" demo can push everything)
router.put('/reports/:id', (req, res) => {
  const data = sanitise({ ...req.body, id: req.params.id });
  const saved = store.getById(req.params.id)
    ? store.update(req.params.id, data)
    : store.create(data);
  res.json(saved);
});

// DELETE /api/reports/:id
router.delete('/reports/:id', (req, res) => {
  if (!store.remove(req.params.id)) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.status(204).end();
});

// POST /api/sync
// Body: { changes: [report, ...], since?: "<ISO date>" }
// Returns: { accepted: [ids], serverChanges: [reports], serverTime }
//
// Conflict policy: last-write-wins on updatedAt. Reports unknown to the
// server are created; if the client copy is older, the server keeps its own.
router.post('/sync', (req, res) => {
  const changes = Array.isArray(req.body && req.body.changes) ? req.body.changes : [];
  const accepted = [];

  for (const incoming of changes) {
    const data = sanitise(incoming);
    if (!data.id) data.id = crypto.randomUUID();
    const existing = store.getById(data.id);
    if (!existing) {
      store.create(data);
    } else if ((data.updatedAt || '') >= (existing.updatedAt || '')) {
      store.update(data.id, data);
    }
    accepted.push(data.id);
  }

  let serverChanges = store.getAll();
  if (req.body && req.body.since) {
    serverChanges = serverChanges.filter((r) => r.updatedAt > req.body.since);
  }

  res.json({ accepted, serverChanges, serverTime: new Date().toISOString() });
});

module.exports = router;
