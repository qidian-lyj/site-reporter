/**
 * "Simple dumb storage" required by the brief: an in-memory array persisted
 * to a single JSON file on every write. Deliberately boring - no database,
 * easy to inspect, easy to explain in a demo.
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'reports.json');

let reports = [];

function load() {
  try {
    reports = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(reports)) reports = [];
  } catch {
    reports = []; // first run or unreadable file - start fresh
  }
  return reports;
}

function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
}

const getAll = () => reports;

const getById = (id) => reports.find((r) => r.id === id) || null;

const create = (report) => {
  reports.push(report);
  save();
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
  save();
  return reports[index];
};

const remove = (id) => {
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return false;
  reports.splice(index, 1);
  save();
  return true;
};

module.exports = { DATA_FILE, load, save, getAll, getById, create, update, remove };
