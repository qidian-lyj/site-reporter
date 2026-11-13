/**
 * Orientation sensors.
 *
 * - Compass (DeviceOrientation API): the heading the camera is pointing,
 *   stored alongside the GPS position ("orientation as well as location").
 * - Accelerometer (DeviceMotion API): how far the device is from flat and
 *   whether the camera points vertically UP or DOWN.
 *
 * Note: iOS 13+ requires an explicit user gesture before sensors can be
 * used - call requestPermission() from a button click handler first
 * (the "Enable sensors (iOS)" button).
 */

let heading = null; // compass degrees 0-359, null until a reading arrives
let tilt = null;    // { angle, direction } - angle from vertical, direction: up/down/side

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn({ heading, tilt }));
}

function onOrientation(event) {
  if (event.alpha !== null && event.alpha !== undefined) {
    heading = (event.alpha + 360) % 360;
    notify();
  }
}

function onMotion(event) {
  const g = event.accelerationIncludingGravity;
  if (!g || g.z === null || g.z === undefined) return;

  // 0° = device flat (camera pointing up/down), 90° = device upright
  const horizontal = Math.hypot(g.x || 0, g.y || 0);
  const angleFromVertical = Math.round((Math.atan2(horizontal, Math.abs(g.z)) * 180) / Math.PI);

  // accelerationIncludingGravity.z is ~ +9.8 when the screen faces up
  const direction = g.z > 5 ? 'up' : g.z < -5 ? 'down' : 'side';

  tilt = { angle: angleFromVertical, direction };
  notify();
}

/** iOS 13+ permission gate - must run inside a user gesture (click). */
export async function requestPermission() {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    const state = await DeviceOrientationEvent.requestPermission();
    if (state !== 'granted') throw new Error('Orientation sensor permission was denied.');
  }
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    await DeviceMotionEvent.requestPermission();
  }
}

export function startSensors() {
  window.addEventListener('deviceorientation', onOrientation, true);
  window.addEventListener('devicemotion', onMotion, true);
}

export function stopSensors() {
  window.removeEventListener('deviceorientation', onOrientation, true);
  window.removeEventListener('devicemotion', onMotion, true);
}

/** Live updates for consumers: subscribe(fn) returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getHeading() {
  return heading;
}

export function getTilt() {
  return tilt;
}
