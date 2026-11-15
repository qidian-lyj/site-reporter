import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db.js';
import { syncNow, uploadAll, downloadAll, getLastSync } from '../services/sync.js';
import { useConnection } from '../hooks/useConnection.js';
import { useStorageEstimate } from '../hooks/useStorageEstimate.js';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '–';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Server demo + sync control room:
 *  - Upload all / Download all = the brief's "simple dumb storage/retrieval"
 *  - Sync now = two-way sync with last-write-wins conflict resolution
 * Also shows the Connection API state and the device storage quota
 * (the brief's "photo album depends on storage capacity" point).
 */
export default function SyncPanel() {
  const { online, info } = useConnection();
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  const total = useLiveQuery(
    () => db.reports.filter((r) => r.syncStatus !== 'deleted').count(),
    [],
    0
  );
  const pending = useLiveQuery(
    () => db.reports.filter((r) => r.syncStatus !== 'synced').count(),
    [],
    0
  );
  const storage = useStorageEstimate(total);
  const last = getLastSync();

  function run(action, label) {
    setLog([`▶ ${label}`]);
    setBusy(true);
    action((message) => setLog((lines) => [...lines, message]))
      .catch((err) => setLog((lines) => [...lines, `✖ ${err.message}`]))
      .finally(() => setBusy(false));
  }

  return (
    <section aria-label="Synchronisation">
      <h2>🔄 Sync &amp; server demo</h2>

      <p className="report-meta">
        {online
          ? `Connected${info && info.effectiveType ? ` · ${info.effectiveType}` : ''}`
          : 'Offline - reconnect to sync with the server.'}
      </p>
      <p className="report-meta">
        {total} report(s) on device · {pending} waiting to sync
      </p>
      <p className="report-meta">
        {storage
          ? `Device storage used: ${formatBytes(storage.usage)} of ${formatBytes(storage.quota)}`
          : 'Device storage usage not available in this browser.'}
      </p>
      <p className="report-meta">
        {last ? `Last sync: ${new Date(last).toLocaleString()}` : 'Last sync: never'}
      </p>

      <div className="detail-actions">
        <button
          type="button"
          disabled={busy || !online}
          onClick={() => run(uploadAll, 'Upload all (dumb storage)')}
        >
          ⬆️ Upload all
        </button>
        <button
          type="button"
          disabled={busy || !online}
          onClick={() => run(downloadAll, 'Download all (dumb retrieval)')}
        >
          ⬇️ Download all
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy || !online}
          onClick={() => run(syncNow, 'Sync now (two-way)')}
        >
          🔄 Sync now
        </button>
      </div>

      <pre className="sync-log" aria-live="polite">
        {log.length > 0 ? log.join('\n') : 'Sync log will appear here…'}
      </pre>
    </section>
  );
}
