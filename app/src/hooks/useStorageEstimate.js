import { useEffect, useState } from 'react';

/**
 * React hook wrapping navigator.storage.estimate() - shows how much of the
 * device storage quota the app's data (incl. photos) is using. Re-queries
 * whenever `dep` changes (e.g. the report count).
 */
export function useStorageEstimate(dep) {
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      navigator.storage
        .estimate()
        .then((result) => {
          if (!cancelled) setEstimate(result);
        })
        .catch(() => setEstimate(null));
    }
    return () => {
      cancelled = true;
    };
  }, [dep]);

  return estimate;
}
