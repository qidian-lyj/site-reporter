/**
 * Storage layer for reports.
 *
 * Two modes, chosen automatically by environment:
 *  - Cloud (deployment): Upstash Redis (free tier) — data survives redeploys
 *    and is shared by every device. Enabled when BOTH env vars are set:
 *      UPSTASH_REDIS_REST_URL  +  UPSTASH_REDIS_REST_TOKEN
 *  - Local file (dev default): server/data/reports.json — zero config
 *
 * Reads are served from an in-memory copy (fast); every write updates the
 * memory first, then persists to Redis or the JSON file.
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'reports.json');
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = 'site-reporter:reports';

const cloud = Boolean(REDIS_URL && REDIS_TOKEN);

let reports = [];

/* ---------- local JSON file (dev fallback) ---------- */

function loadFromFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    reports = Array.isArray(parsed) ? parsed : [];
  } catch {
    reports = []; // first run or unreadable file - start fresh
  }
}

function saveToFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
}

/* ---------- Upstash Redis (REST API, no SDK needed) ---------- */

async function redisSet(value) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(REDIS_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Upstash SET failed: ${res.status} ${res.statusText}`);
}

async function redisGet() {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(REDIS_KEY)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Upstash GET failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.result ? JSON.parse(json.result) : null;
}

/* ---------- public API ---------- */

/**
 * Load data at startup.
 * Cloud mode: pull from Redis (a fresh empty database is seeded from the
 * bundled demo file, so a new deployment still shows the two demo reports).
 */
async function init() {
  if (!cloud) {
    loadFromFile();
    return { mode: 'local-file', reports: reports.length };
  }
  try {
    const remote = await redisGet();
    if (Array.isArray(remote)) {
      reports = remote;
    } else {
      loadFromFile(); // seed a fresh database with the bundled demo reports
      await redisSet(reports);
    }
    return { mode: 'upstash-redis', reports: reports.length };
  } catch (err) {
    console.warn('[store] Upstash unavailable — falling back to the local file:', err.message);
    loadFromFile();
    return { mode: 'local-file (fallback)', reports: reports.length };
  }
}

const getAll = () => reports;

const getById = (id) => reports.find((r) => r.id === id) || null;

const create = (report) => {
  reports.push(report);
  return report;
};

const update = (id, patch) => {
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return null;
  reports[index] = {
    ...reports[index],
    ...patch,
    id,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
  return reports[index];
};

const remove = (id) => {
  const index = reports.findIndex((r) => r.id === id);
  if (index !== -1) reports.splice(index, 1);
  return index !== -1;
};

/** Persist the in-memory array (Redis in cloud mode, JSON file in dev). */
async function save() {
  if (cloud) await redisSet(reports);
  else saveToFile();
}

module.exports = {
  init,
  getAll,
  getById,
  create,
  update,
  remove,
  save,
  isCloud: () => cloud,
  storageMode: () => (cloud ? 'upstash-redis' : 'local-file'),
  DATA_FILE,
};
