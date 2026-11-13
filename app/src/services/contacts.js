/**
 * Contacts API helper - route report categories to different recipients.
 *
 * Uses the Contact Picker API where available (Chrome/Edge on Android).
 * On unsupported browsers pickContact() throws and the UI falls back to a
 * manual text field - both end up in the same report.recipient string.
 */

export function hasContactsAPI() {
  return 'contacts' in navigator && typeof navigator.contacts.select === 'function';
}

/**
 * Open the device contact picker and format the chosen contact as a single
 * string suitable for the recipient field: "Name <email>" or "Name 07700…".
 * Returns null if the user cancels the picker.
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
