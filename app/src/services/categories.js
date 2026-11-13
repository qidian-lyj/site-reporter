/**
 * Category menu definitions.
 *
 * Each category maps to a suggested recipient so different report types can
 * be routed to different people - the Contacts API (services/contacts.js)
 * is used to pick the real contact from the device.
 */
export const CATEGORIES = [
  { id: 'wildlife',    label: 'Wildlife sighting',  icon: '🦊', color: '#E8B54B', recipientHint: 'ranger@site.example' },
  { id: 'fault',       label: 'Fault / damage',     icon: '⚠️', color: '#E06C56', recipientHint: 'maintenance@site.example' },
  { id: 'fly-tipping', label: 'Fly-tipping',        icon: '🗑️', color: '#9BB0A4', recipientHint: 'enforcement@site.example' },
  { id: 'maintenance', label: 'Maintenance status', icon: '🛠️', color: '#64A8DC', recipientHint: 'maintenance@site.example' },
  { id: 'geological',  label: 'Geological feature', icon: '🪨', color: '#C9B458', recipientHint: 'heritage@site.example' },
  { id: 'archaeology', label: 'Archaeology find',   icon: '🏺', color: '#C98BB8', recipientHint: 'heritage@site.example' },
  { id: 'delivery',    label: 'Recorded delivery',  icon: '📦', color: '#7BC896', recipientHint: 'office@site.example' },
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}
