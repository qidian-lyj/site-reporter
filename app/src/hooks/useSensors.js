import { useEffect, useState } from 'react';
import { startSensors, stopSensors, subscribe, requestPermission } from '../services/sensors.js';

export { requestPermission as requestSensorsPermission };

/**
 * React hook exposing live compass + accelerometer readings.
 * Starts the sensor listeners while the component is mounted and stops
 * them on unmount (React 18 StrictMode-safe).
 *
 * On desktop browsers no events fire, so heading/tilt simply stay null.
 */
export function useSensors() {
  const [reading, setReading] = useState({ heading: null, tilt: null });

  useEffect(() => {
    startSensors();
    const unsubscribe = subscribe(setReading);
    return () => {
      unsubscribe();
      stopSensors();
    };
  }, []);

  return reading;
}
