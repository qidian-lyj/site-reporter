import { getCategory } from '../services/categories.js';
import { softDeleteReport } from '../services/db.js';

/**
 * "Read" + entry point for Update/Delete of a single report.
 * Shows the captured GPS position, compass heading, accelerometer tilt,
 * photos and the routed recipient, with an OpenStreetMap cross-link.
 */
export default function ReportDetail({ report, onEdit, onBack }) {
  const cat = getCategory(report.category);
  const loc = report.location;

  async function handleDelete() {
    if (!window.confirm('Delete this report? It disappears from the device now and is removed from the server on the next sync.')) return;
    await softDeleteReport(report.id); // tombstone: the sync engine takes it from here
    onBack();
  }

  return (
    <section aria-label="Report detail">
      <div className="detail-head">
        {cat ? (
          <span className="cat-chip" style={{ '--cat': cat.color }}>
            <span className="cat-dot" />
            {cat.icon} {cat.label}
          </span>
        ) : null}
        <span className={`pill pill-${report.syncStatus || 'new'}`}>
          {report.syncStatus || 'new'}
        </span>
      </div>
      <h2>{report.title || 'Untitled'}</h2>

      <p className="report-meta">
        {cat ? cat.label : report.category} · created{' '}
        {new Date(report.createdAt).toLocaleString()} · last updated{' '}
        {new Date(report.updatedAt).toLocaleString()}
      </p>

      <div className="detail-block">
        <h3>📝 Description</h3>
        <p>{report.description || '—'}</p>
      </div>

      {loc && (
        <div className="detail-block">
          <h3>📍 Location &amp; orientation</h3>
          <p>
            {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)} (±
            {Math.round(loc.accuracy || 0)}m)
          </p>
          <p>
            🧭 Compass heading: {loc.heading != null ? `${Math.round(loc.heading)}°` : '—'} ·
            📐 Tilt: {loc.tilt ? `${loc.tilt.angle}° (camera pointing ${loc.tilt.direction})` : '—'}
          </p>
          <p>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`}
            >
              View on OpenStreetMap ↗
            </a>
          </p>
        </div>
      )}

      {report.photos && report.photos.length > 0 && (
        <div className="detail-block">
          <h3>📷 Photos ({report.photos.length})</h3>
          <div className="photo-grid">
            {report.photos.map((src, i) => (
              <img key={i} className="detail-photo" src={src} alt={`Report photo ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {report.recipient && (
        <p className="report-meta">✉️ Recipient: {report.recipient}</p>
      )}

      <div className="detail-actions">
        <button type="button" onClick={onEdit}>
          ✏️ Edit
        </button>
        <button type="button" className="danger" onClick={handleDelete}>
          🗑️ Delete
        </button>
        <button type="button" onClick={onBack}>
          ← Back to list
        </button>
      </div>
    </section>
  );
}
