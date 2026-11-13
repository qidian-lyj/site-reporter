/**
 * Geolocation API helper - GPS position for reports on a large outdoor site.
 */

const DEFAULT_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

/** Promise wrapper around navigator.geolocation.getCurrentPosition. */
export function getPosition(options = DEFAULT_OPTIONS) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation API is not available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => reject(new Error(err.message)),
      options
    );
  });
}

/** Continuous tracking (e.g. a future "walk the site" mode). Returns a watch id. */
export function watchLocation(onUpdate, onError, options = DEFAULT_OPTIONS) {
  return navigator.geolocation.watchPosition(onUpdate, onError, options);
}

export function stopWatching(watchId) {
  navigator.geolocation.clearWatch(watchId);
}

/** "55.860916, -4.251421 (±12m)" */
export function formatCoords(position) {
  const { latitude, longitude, accuracy } = position.coords;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`;
}

/** Flatten a position into the object stored on a report.
 *  Compass heading and accelerometer tilt are captured at the same moment. */
export function toLocationObject(position, sensors = {}) {
  const { latitude, longitude, accuracy, altitude } = position.coords;
  return {
    latitude,
    longitude,
    accuracy,
    altitude: altitude ?? null,
    heading: sensors.heading ?? null, // compass bearing when captured
    tilt: sensors.tilt ?? null,       // accelerometer orientation when captured
    timestamp: new Date(position.timestamp || Date.now()).toISOString(),
  };
}
