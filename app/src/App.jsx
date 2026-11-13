import { useState } from 'react';
import TabBar from './components/TabBar.jsx';
import ConnectionBadge from './components/ConnectionBadge.jsx';
import ReportList from './components/ReportList.jsx';
import ReportDetail from './components/ReportDetail.jsx';
import ReportForm from './components/ReportForm.jsx';
import MapView from './components/MapView.jsx';
import SyncPanel from './components/SyncPanel.jsx';
import AboutPage from './components/AboutPage.jsx';

/**
 * Root component: owns the current "route" as plain state (a mobile-style
 * tab layout, so a router dependency is not needed) and passes callbacks
 * down. All report data flows through Dexie live queries, so every view
 * re-renders automatically when the stored data changes.
 */
export default function App() {
  // route = { name: 'list'|'form'|'detail'|'map'|'sync'|'about', report? }
  const [route, setRoute] = useState({ name: 'list' });

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
    </div>
  );
}
