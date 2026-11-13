/**
 * On-device storage, built on Dexie (a promise-based IndexedDB wrapper -
 * the storage solution named in the module brief).
 *
 * Every report carries a syncStatus flag used by the sync engine:
 *   'new'      created locally, never uploaded
 *   'modified' edited locally since the last sync
 *   'synced'   identical on device and server
 */
import Dexie from 'dexie';

export const db = new Dexie('site-reporter');

// Only fields we query are indexed; the whole report object is the value.
db.version(1).stores({
  reports: 'id, category, createdAt, updatedAt, syncStatus',
});

/** Collision-resistant id (crypto.randomUUID with a fallback). */
export function uuid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export const allReports = () => db.reports.toArray();

export const getReport = async (id) => (await db.reports.get(id)) ?? null;

export const saveReport = (report) => db.reports.put(report);

export const deleteReport = (id) => db.reports.delete(id);

/** Wipe the local store (used by the "download all" sync demo). */
export const clearReports = () => db.reports.clear();

export const countReports = () => db.reports.count();
