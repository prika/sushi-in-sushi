/**
 * Validates Portuguese mobile phone numbers.
 * Accepts: 9 digits (9X XXXXXXX), optional prefix +351, 00351, or 351.
 * Mobile prefixes: 91, 92, 93, 96 (Vodafone, NOS, MEO, etc.)
 */
export function isValidPortuguesePhone(phone: string): boolean {
  const cleaned = phone
    .replace(/[\s-]/g, "")
    .replace(/^(\+351|00351|351)/, "");
  return /^9[1236]\d{7}$/.test(cleaned);
}
