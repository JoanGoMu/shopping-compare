// Affiliate URL config - add entries here as programs get approved.
// Key: store domain (lowercase, no www). Value: function that injects affiliate params.
const AFFILIATE_CONFIG: Record<string, (url: string) => string> = {
  // Example (uncomment and fill in when approved):
  // 'amazon.com': (url) => {
  //   const u = new URL(url);
  //   u.searchParams.set('tag', 'YOUR-AMAZON-TAG');
  //   return u.toString();
  // },
  // 'amazon.co.uk': (url) => {
  //   const u = new URL(url);
  //   u.searchParams.set('tag', 'YOUR-UK-TAG');
  //   return u.toString();
  // },
};

// Returns an affiliate URL if we have a program for the store,
// otherwise returns the raw URL (Skimlinks will auto-convert those on public pages).
export function getAffiliateUrl(productUrl: string, storeDomain: string): string {
  const domain = storeDomain.toLowerCase().replace(/^www\./, '');
  const handler = AFFILIATE_CONFIG[domain];
  if (!handler) return productUrl;
  try {
    return handler(productUrl);
  } catch {
    return productUrl;
  }
}
