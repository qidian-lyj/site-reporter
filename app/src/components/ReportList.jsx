import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db.js';
import { CATEGORIES, getCategory } from '../services/categories.js';

/**
 * "Read" part of CRUD: lists every stored report (newest first) with a
 * category filter. The list is a Dexie live query, so it updates by itself
 * after any create/update/delete anywhere in the app.
 */
export default function ReportList({ onOpen, onNew }) {
  const [filter, setFilter] = useState('all');

  const reports = useLiveQuery(
    () =>
      db.reports
        .orderBy('createdAt')
        .reverse()
        .filter((r) => filter === 'all' || r.category === filter)
        .toArray(),
    [filter],
    []
  );

  return (
    <section aria-label="Report list">
      <div className="toolbar">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
        <span className="report-meta">{reports.length} report(s)</span>
        <button type="button" className="primary" onClick={onNew}>
          ➕ New
        </button>
      </div>

      <ul className="report-list">
        {reports.map((r) => {
          const cat = getCategory(r.category);
          return (
            <li
              key={r.id}
              className="report-card"
              onClick={() => onOpen(r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(r)}
            >
              <div className="report-card-top">
                {cat ? (
                  <span className="cat-chip" style={{ '--cat': cat.color }}>
                    <span className="cat-dot" />
                    {cat.icon} {cat.label}
                  </span>
                ) : (
                  <span className="cat-chip">
                    <span className="cat-dot" />
                    {r.category}
                  </span>
                )}
                <span className={`pill pill-${r.syncStatus || 'new'}`}>
                  {r.syncStatus || 'new'}
                </span>
              </div>
              <div className="report-title">{r.title || 'Untitled'}</div>
              <p className="report-meta">
                {new Date(r.createdAt).toLocaleString()}
                {r.location &&
                  ` · 📍 ${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}`}
                {r.photos && r.photos.length > 0 && ` · 📷 ${r.photos.length}`}
              </p>
            </li>
          );
        })}
      </ul>

      {reports.length === 0 && (
        <p className="empty">
          <span className="empty-emoji">🌲</span>
          Nothing logged yet — the site is quiet. Create a report with <strong>➕ New</strong>,
          or pull the demo data from the <strong>🔄 Sync</strong> tab. Reports live on this
          device (IndexedDB via Dexie) and work fully offline.
        </p>
      )}
    </section>
  );
}
