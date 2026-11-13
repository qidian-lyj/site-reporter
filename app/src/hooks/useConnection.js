import { useEffect, useState } from 'react';
import { isOnline, connectionInfo, onConnectionChange, initConnectionListener } from '../services/connection.js';

/**
 * React hook exposing live connectivity state from the Connection API.
 * Returns { online, info } - used by the header badge and the sync panel.
 */
export function useConnection() {
  const [state, setState] = useState(() => ({ online: isOnline(), info: connectionInfo() }));

  useEffect(() => {
    initConnectionListener();
    const unsubscribe = onConnectionChange((online, info) => setState({ online, info }));
    return unsubscribe;
  }, []);

  return state;
}
