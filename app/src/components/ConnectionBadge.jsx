import { useConnection } from '../hooks/useConnection.js';

/** Online/offline badge in the header, driven by the Connection API. */
export default function ConnectionBadge() {
  const { online, info } = useConnection();

  const label = online
    ? `Online${info && info.effectiveType ? ` · ${info.effectiveType}` : ''}`
    : 'Offline';

  return (
    <span className={`badge ${online ? 'online' : 'offline'}`}>{label}</span>
  );
}
