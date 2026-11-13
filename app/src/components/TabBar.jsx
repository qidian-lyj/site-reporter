import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db.js';

const TABS = [
  { id: 'list', label: 'Reports' },
  { id: 'map', label: 'Map' },
  { id: 'form', label: 'New' },
  { id: 'sync', label: 'Sync' },
  { id: 'about', label: 'About' },
];

/**
 * Bottom tab navigation (mobile app pattern). The Sync tab shows a live
 * badge with the number of unsynced reports, powered by a Dexie live query.
 */
export default function TabBar({ active, onNavigate }) {
  // Live count of reports still waiting to be pushed to the server.
  const pending = useLiveQuery(
    () => db.reports.filter((r) => r.syncStatus !== 'synced').count(),
    [],
    0
  );

  return (
    <nav className="tab-bar" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? 'active' : ''}
          onClick={() => onNavigate(tab.id)}
        >
          {tab.label}
          {tab.id === 'sync' && pending > 0 && (
            <span className="tab-count" aria-label={`${pending} unsynced`}>
              {pending}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
