/**
 * Normalize a phone number to digits-only format for dedup matching.
 * Strips all non-digit characters and replaces leading 8 with 7 (RU standard).
 *
 * "+7 (999) 123-45-67" → "79991234567"
 * "8(999)1234567"      → "79991234567"
 * "79991234567"        → "79991234567"
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }
  return digits;
}
