/**
 * Static "About" view: what the app does and which web technologies it uses.
 */
export default function AboutPage() {
  return (
    <section aria-label="About">
      <h2>About this app</h2>
      <p>
        Site Reporter is a reporting app for large outdoor sites: countryside, city, airport,
        campus, parks, road/rail/utility networks or large industrial sites. Use it to record
        wildlife, fly-tipping, faults &amp; fault resolution, maintenance, geological features,
        archaeology or even recorded delivery.
      </p>
      <ul className="feature-list">
        <li>📍 GPS position via the <strong>Geolocation API</strong></li>
        <li>🕒 Automatic <strong>datetime stamps</strong> on create/edit</li>
        <li>📷 Photos via the <strong>Camera API</strong> + photo album (storage permitting)</li>
        <li>⌨️ Free <strong>text input</strong> (title &amp; description)</li>
        <li>🗂️ <strong>Category menu</strong> (species, fault type, maintenance status…)</li>
        <li>✉️ Categories routed to different <strong>recipients (Contacts API)</strong></li>
        <li>🧭 <strong>Compass API</strong> — camera orientation as well as location</li>
        <li>📐 <strong>Accelerometer API</strong> — camera pointing vertically up or down</li>
        <li>💾 Full in-app <strong>CRUD</strong> (IndexedDB via Dexie, works offline)</li>
        <li>🗺️ <strong>Leaflet map</strong> of all located reports</li>
        <li>🌐 <strong>Upload / download / sync</strong> with a JSON server demo</li>
        <li>📱 Installable <strong>PWA</strong> (manifest + service worker)</li>
      </ul>
      <p className="report-meta">
        Built with React + Vite. On-device storage: IndexedDB via Dexie.
        Backend: Node.js/Express with a JSON file store.
      </p>
    </section>
  );
}
