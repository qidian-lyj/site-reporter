/**
 * Contacts / recipient hand-off.
 *
 * Android Chrome exposes the Contact Picker API, so users can pick a real
 * contact straight from the device address book. iOS Safari does not expose
 * the address book to web pages at all (platform limitation), so there the
 * app offers an equivalent workflow instead:
 *   - one-tap category default + recently used recipients (no typing)
 *   - "Email report" / "Text report" buttons on the detail page that open
 *     Mail / Messages with the full report pre-filled.
 */

import { getCategory } from './categories.js';

export function hasContactsAPI() {
  return 'contacts' in navigator && typeof navigator.contacts.select === 'function';
}

/**
 * Android Chrome / Edge only: open the device contact picker and format the
 * chosen contact as "Name <email>" or "Name 07700…". Throws on unsupported
 * browsers - the form falls back to manual input + quick chips.
 */
export async function pickContact(properties = ['name', 'email', 'tel']) {
  if (!hasContactsAPI()) {
    throw new Error(
      'Contact Picker API is not supported in this browser - please type the recipient manually.'
    );
  }
  const [contact] = await navigator.contacts.select(properties, { multiple: false });
  if (!contact) return null;

  const name = Array.isArray(contact.name) ? contact.name[0] : contact.name;
  const email = Array.isArray(contact.email) ? contact.email[0] : contact.email;
  const tel = Array.isArray(contact.tel) ? contact.tel[0] : contact.tel;

  const parts = [name, email ? `<${email}>` : tel || ''].filter(Boolean);
  return parts.join(' ') || null;
}

/* ---------------- recipient parsing ---------------- */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s()-]{5,}\d)/;

/** Pull the first email address out of a recipient string. */
export function extractEmail(recipient = '') {
  const match = String(recipient).match(EMAIL_RE);
  return match ? match[0] : '';
}

/** Pull the first phone number out of a recipient string (digits only). */
export function extractPhone(recipient = '') {
  const match = String(recipient).match(PHONE_RE);
  return match ? match[0].replace(/[\s()-]/g, '') : '';
}

/* ---------------- message building ---------------- */

/**
 * mailto: link that opens Mail (works great on iOS) with the whole report
 * pre-filled: description, category, GPS position, map link, timestamps.
 */
export function buildMailto(report) {
  const email = extractEmail(report.recipient);
  const cat = getCategory(report.category);
  const loc = report.location;

  const subject = `[Site Reporter] ${cat ? cat.label : report.category}: ${report.title || 'Untitled'}`;
  const lines = [
    report.description || '(no description)',
    '',
    `Category: ${cat ? cat.label : report.category}`,
    loc
      ? `Location: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} (±${Math.round(loc.accuracy || 0)}m)`
      : 'Location: not captured',
    loc && loc.heading != null ? `Compass heading: ${Math.round(loc.heading)}°` : null,
    loc && loc.tilt ? `Camera tilt: ${loc.tilt.angle}° (${loc.tilt.direction})` : null,
    loc
      ? `Map: https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`
      : null,
    `Recorded: ${new Date(report.createdAt).toLocaleString()}`,
    '',
    '-- sent from Site Reporter PWA',
  ].filter((line) => line !== null);

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/**
 * sms: link for recipients recorded with a phone number. iOS and Android
 * use different separators (Apple: & / Google: ?) - detect and adapt.
 */
export function buildSmsLink(report) {
  const phone = extractPhone(report.recipient);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const text = `${report.title || 'Site report'} - ${report.description || ''}`;
  return `sms:${phone}${separator}body=${encodeURIComponent(text)}`;
}

/** Web Share API (supported on iOS Safari and Android): native share sheet. */
export function shareReport(report) {
  const cat = getCategory(report.category);
  return navigator.share({
    title: report.title || 'Site report',
    text: `${cat ? cat.label + ': ' : ''}${report.description || ''}`,
  });
}

/* ---------------- recently used recipients ---------------- */

const RECENT_KEY = 'site-reporter:recent-recipients';

/** Up to 5 most recently used recipients, for one-tap re-use in the form. */
export function getRecentRecipients() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberRecipient(recipient) {
  if (!recipient) return;
  const list = getRecentRecipients().filter((r) => r !== recipient);
  list.unshift(recipient);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    /* storage unavailable - the feature just degrades to manual typing */
  }
}
