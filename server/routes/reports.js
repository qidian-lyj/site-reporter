/**
 * REST API for reports + the bulk sync endpoint.
 *
 * Mounted at /api by server.js:
 *
 *   GET    /api/reports          list all (optional ?since=<ISO date>)
 *   GET    /api/reports/:id      read one
 *   POST   /api/reports          create
 *   PUT    /api/reports/:id      update or create (upsert, used by "upload all")
 *   DELETE /api/reports/:id      delete
 *   POST   /api/sync             bulk push/pull used by the sync engine
 *
 * Storage: the store layer (server/store.js) — Upstash Redis in cloud
 * deployments, a local JSON file in dev. Write handlers await store.save()
 * so data is persisted before the response is sent.
 */
const crypto = require('crypto');
const express = require('express');
const store = require('../store');

const router = express.Router();

/** Forward async errors to the central error middleware. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
router.post('/reports', ah(async (req, res) => {
  const data = sanitise(req.body);
  data.id = data.id || crypto.randomUUID();
  if (store.getById(data.id)) {
    return res.status(409).json({ error: 'A report with this id already exists - use PUT to update it.' });
  }
  await store.save(store.create(data));
  res.status(201).json(data);
}));

// PUT /api/reports/:id  (upsert, so the "dumb upload" demo can push everything)
router.put('/reports/:id', ah(async (req, res) => {
  const data = sanitise({ ...req.body, id: req.params.id });
  const saved = store.getById(req.params.id)
    ? store.update(req.params.id, data)
    : store.create(data);
  await store.save();
  res.json(saved);
}));

// DELETE /api/reports/:id
router.delete('/reports/:id', ah(async (req, res) => {
  if (!store.remove(req.params.id)) {
    return res.status(404).json({ error: 'Report not found' });
  }
  await store.save();
  res.status(204).end();
}));

// POST /api/sync
// Body: { changes: [report, ...], since?: "<ISO date>" }
// Returns: { accepted: [ids], deletedIds: [ids], serverChanges: [reports], serverTime }
//
// Conflict policy: last-write-wins on updatedAt. Reports unknown to the
// server are created; if the client copy is older, the server keeps its own.
// Deletion tombstones (changes with syncStatus === 'deleted') remove the
// server copy instead - the acked ids come back as `deletedIds` so the
// client can wipe its local tombstones.
router.post('/sync', ah(async (req, res) => {
  const changes = Array.isArray(req.body && req.body.changes) ? req.body.changes : [];
  const accepted = [];
  const deletedIds = [];

  for (const incoming of changes) {
    if (
      incoming &&
      incoming.syncStatus === 'deleted' &&
      typeof incoming.id === 'string' &&
      incoming.id
    ) {
      store.remove(incoming.id); // idempotent: false if already gone
      deletedIds.push(incoming.id);
      accepted.push(incoming.id);
      continue;
    }

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

  await store.save(); // persist everything this sync changed
  res.json({ accepted, deletedIds, serverChanges, serverTime: new Date().toISOString() });
}));

module.exports = router;
