/**
 * getLocalized - Universal helper for retrieving localized text from JSONB translation objects.
 *
 * Fallback chain: locale → "pt" → fallback string
 */
export function getLocalized(
  translations: Record<string, string> | null | undefined,
  fallback: string | null | undefined,
  locale: string,
): string {
  return translations?.[locale] || translations?.['pt'] || fallback || '';
}
