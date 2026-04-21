/**
 * Normalizes a product URL to a canonical form for consistent storage and lookup.
 * - Amazon: strips everything except origin + /dp/ASIN (removes slug, query params, variant params)
 * - All others: strips query params and trailing slash
 *
 * Must stay in sync with normalizeProductUrl() in extension/src/background.ts.
 */
export function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const asin = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
    if (asin && parsed.hostname.includes('amazon.')) {
      return `${parsed.origin}/dp/${asin}`;
    }
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}
