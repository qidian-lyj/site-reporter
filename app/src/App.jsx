import { useEffect, useRef, useState } from 'react';
import TabBar from './components/TabBar.jsx';
import ConnectionBadge from './components/ConnectionBadge.jsx';
import ReportList from './components/ReportList.jsx';
import ReportDetail from './components/ReportDetail.jsx';
import ReportForm from './components/ReportForm.jsx';
import MapView from './components/MapView.jsx';
import SyncPanel from './components/SyncPanel.jsx';
import AboutPage from './components/AboutPage.jsx';
import { useConnection } from './hooks/useConnection.js';
import { syncNow, unsyncedCount } from './services/sync.js';

/**
 * Root component: owns the current "route" as plain state (a mobile-style
 * tab layout, so a router dependency is not needed) and passes callbacks
 * down. All report data flows through Dexie live queries, so every view
 * re-renders automatically when the stored data changes.
 */
export default function App() {
  // route = { name: 'list'|'form'|'detail'|'map'|'sync'|'about', report? }
  const [route, setRoute] = useState({ name: 'list' });
  const { online } = useConnection();

  // Auto-sync on reconnect: an offline -> online transition pushes queued
  // reports by itself, so field reports reach the server without the user
  // having to remember the Sync tab. Manual sync stays available.
  const [autoSyncMsg, setAutoSyncMsg] = useState(null);
  const wasOnline = useRef(online);
  const autoSyncBusy = useRef(false);

  useEffect(() => {
    if (online && !wasOnline.current && !autoSyncBusy.current) {
      autoSyncBusy.current = true;
      (async () => {
        try {
          const pending = await unsyncedCount();
          if (pending === 0) return; // nothing queued - leave sync to the user
          setAutoSyncMsg({ text: `Back online - auto-syncing ${pending} report(s)…`, tone: 'info' });
          const result = await syncNow((m) => setAutoSyncMsg({ text: m, tone: 'info' }));
          setAutoSyncMsg({
            text: `✔ Auto-sync complete - ${result.accepted.length} report(s) pushed.`,
            tone: 'ok',
          });
          setTimeout(() => setAutoSyncMsg(null), 5000);
        } catch (err) {
          setAutoSyncMsg({ text: `✖ Auto-sync failed: ${err.message}`, tone: 'err' });
          setTimeout(() => setAutoSyncMsg(null), 6000);
        } finally {
          autoSyncBusy.current = false;
        }
      })();
    }
    wasOnline.current = online;
  }, [online]);

  const navigate = (name, extra = {}) => setRoute({ name, ...extra });
  const openDetail = (report) => navigate('detail', { report });
  const openForm = (report = null) => navigate('form', { report });

  // The detail view belongs to the "Reports" tab visually.
  const activeTab = route.name === 'detail' ? 'list' : route.name;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-badge">🧭</span>
          <div className="brand-text">
            <h1>Site Reporter</h1>
            <span className="brand-tag">Field reports for large outdoor sites</span>
          </div>
        </div>
        <ConnectionBadge />
      </header>

      <TabBar active={activeTab} onNavigate={navigate} />

      <main>
        {route.name === 'list' && (
          <ReportList onOpen={openDetail} onNew={() => openForm(null)} />
        )}

        {route.name === 'detail' && route.report && (
          <ReportDetail
            report={route.report}
            onEdit={() => openForm(route.report)}
            onBack={() => navigate('list')}
          />
        )}

        {route.name === 'form' && (
          <ReportForm editing={route.report ?? null} onDone={() => navigate('list')} />
        )}

        {route.name === 'map' && <MapView />}

        {route.name === 'sync' && <SyncPanel />}

        {route.name === 'about' && <AboutPage />}
      </main>

      {autoSyncMsg && (
        <div className={`autosync-toast tone-${autoSyncMsg.tone}`} role="status">
          {autoSyncMsg.text}
        </div>
      )}
    </div>
  );
}
