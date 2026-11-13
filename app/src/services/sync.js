/**
 * Sync engine - three demo modes required by the brief:
 *
 *  1. uploadAll()   "dumb storage":   PUT every local report to the server
 *  2. downloadAll() "dumb retrieval": replace local store with server JSON
 *  3. syncNow()     real two-way sync: push local changes (reports flagged
 *     'new'/'modified'), pull server changes, merge with last-write-wins.
 *
 * All modes require an active connection (hooks/useConnection.js) before
 * they run; offline reports simply stay on the device until connectivity
 * returns.
 */

import { db, allReports, getReport, saveReport, clearReports } from './db.js';
import * as api from './api.js';

const LAST_SYNC_KEY = 'site-reporter:lastSync';

export function getLastSync() {
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function isOnline() {
  return navigator.onLine;
}

/** Dumb upload: push every local report to the server (server upserts). */
export async function uploadAll(log = () => {}) {
  const local = await allReports();
  log(`Uploading ${local.length} report(s)…`);
  for (const report of local) {
    await api.putReport(report.id, report);
  }
  log(`✔ Uploaded ${local.length} report(s) to the server.`);
  return local.length;
}

/** Dumb retrieval: replace the whole local store with the server's JSON. */
export async function downloadAll(log = () => {}) {
  const remote = await api.listReports();
  log(`Downloading ${remote.length} report(s)…`);
  await clearReports();
  for (const report of remote) {
    await saveReport({ ...report, syncStatus: 'synced' });
  }
  log('✔ Local copy replaced with server data.');
  return remote.length;
}

/** Two-way sync: push dirty local reports, pull server changes, merge. */
export async function syncNow(log = () => {}) {
  if (!isOnline()) {
    throw new Error('You are offline - turn the connection on before syncing.');
  }

  const local = await allReports();
  const dirty = local.filter((r) => r.syncStatus && r.syncStatus !== 'synced');
  log(`Pushing ${dirty.length} local change(s)…`);

  const since = getLastSync();
  const result = await api.sync(dirty, since);
  log(`Pulled ${result.serverChanges.length} server report(s)…`);

  // Merge server changes into the local store (last write wins on updatedAt).
  for (const server of result.serverChanges) {
    const existing = await getReport(server.id);
    if (!existing) {
      await saveReport({ ...server, syncStatus: 'synced' });
      continue;
    }
    const serverTime = server.updatedAt || '';
    const localTime = existing.updatedAt || '';
    if (serverTime > localTime) {
      await saveReport({ ...server, syncStatus: 'synced' }); // server wins
    } else {
      // Local copy is identical or newer - keep it and mark as synced.
      await saveReport({ ...existing, syncStatus: 'synced' });
    }
  }

  localStorage.setItem(LAST_SYNC_KEY, result.serverTime);
  log('✔ Sync complete (conflicts resolved last-write-wins).');
  return result;
}

/** Number of reports waiting to be pushed (for the tab badge). */
export const unsyncedCount = () =>
  db.reports.filter((r) => r.syncStatus !== 'synced').count();
