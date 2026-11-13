import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db.js';
import { getCategory } from '../services/categories.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/**
 * Leaflet map showing every report that has a captured GPS position.
 * Markers refresh automatically via the Dexie live query; tapping a marker
 * shows the report title and category in a popup.
 */
export default function MapView() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);

  const reports = useLiveQuery(() => db.reports.toArray(), [], []);

  // Create the map once.
  useEffect(() => {
    const map = L.map(containerRef.current).setView([55.86, -4.25], 13);
    // Standard OpenStreetMap tiles - the classic, familiar map style
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove(); // cleanup for React 18 StrictMode double-mount
    };
  }, []);

  // Re-draw markers whenever the stored reports change.
  useEffect(() => {
    const markers = markersRef.current;
    const map = mapRef.current;
    if (!markers || !map) return;

    markers.clearLayers();
    const points = [];

    for (const report of reports) {
      if (!report.location) continue;
      const { latitude, longitude } = report.location;
      const cat = getCategory(report.category);
      const pinColor = cat ? cat.color : '#97bc62';
      const pinGlyph = cat ? cat.icon : '📍';
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'map-pin-wrap',
          html: `<span class="map-pin" style="background:${pinColor}"><span class="map-pin-glyph">${pinGlyph}</span></span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 28],
          popupAnchor: [0, -28],
        }),
      });
      marker.bindPopup(
        `<strong>${escapeHtml(report.title || 'Untitled')}</strong><br>` +
          `<span style="color:${pinColor}">${cat ? `${cat.icon} ${cat.label}` : escapeHtml(report.category)}</span><br>` +
          `${new Date(report.createdAt).toLocaleString()}`
      );
      markers.addLayer(marker);
      points.push([latitude, longitude]);
    }

    if (points.length > 0) {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
    }
  }, [reports]);

  const withLocation = reports.filter((r) => r.location).length;

  return (
    <section aria-label="Map of reports">
      <h2>🗺️ Site map</h2>
      <p className="report-meta">
        {withLocation} of {reports.length} report(s) have GPS positions.
        Capture a position in a report to see it appear here.
      </p>
      <div ref={containerRef} className="map-container" />
    </section>
  );
}
