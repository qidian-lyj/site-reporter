/**
 * Connection API wrapper.
 *
 * The Connection / Network Information API plus the online/offline events
 * tell the app whether syncing is possible right now - the "turn on/off the
 * internet connection" requirement. React components consume this through
 * the useConnection() hook (hooks/useConnection.js).
 */

const listeners = new Set();

export function isOnline() {
  return navigator.onLine;
}

/** Effective connection type etc., when the browser exposes it (Chromium). */
export function connectionInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  return {
    effectiveType: conn.effectiveType || null,
    downlink: typeof conn.downlink === 'number' ? conn.downlink : null,
    saveData: Boolean(conn.saveData),
  };
}

/** Register a callback fired with (online, info) whenever connectivity changes. */
export function onConnectionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const online = isOnline();
  listeners.forEach((fn) => fn(online, connectionInfo()));
}

/** Wire up the browser events. Safe to call more than once. */
export function initConnectionListener() {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && typeof conn.addEventListener === 'function') {
    conn.addEventListener('change', notify);
  }
  notify();
}
