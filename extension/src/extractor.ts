/**
 * Product data extractor.
 * Tries multiple strategies in order of reliability:
 * 1. Schema.org JSON-LD structured data
 * 2. Open Graph meta tags
 * 3. Store-specific DOM patterns
 * 4. Generic heuristics
 */

export interface ExtractedProduct {
  name: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  product_url: string;
  store_name: string;
  store_domain: string;
  specs: Record<string, string>;
}

function getMetaContent(property: string): string | null {
  return (
    document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content ??
    document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`)?.content ??
    null
  );
}

function parsePrice(raw: string | number | undefined | null): { price: number | null; currency: string } {
  if (raw == null) return { price: null, currency: 'USD' };
  if (typeof raw === 'number') return { price: raw, currency: 'USD' };

  const str = String(raw).trim();

  // Detect currency
  const currency = str.includes('€') ? 'EUR'
    : str.includes('£') ? 'GBP'
    : 'USD';

  // Remove all non-numeric except . and ,
  let cleaned = str.replace(/[^0-9.,]/g, '');

  // Handle European format: 1.234,56 → 1234.56
  if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Handle simple comma decimal: 39,95 → 39.95
    cleaned = cleaned.replace(',', '.');
  }

  const price = parseFloat(cleaned);
  return { price: isNaN(price) ? null : price, currency };
}

function extractFromJsonLd(): Partial<ExtractedProduct> | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '');
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = item['@type'];
        if (!type) continue;
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        if (!isProduct) continue;

        const offer = item.offers?.['@type'] === 'Offer' ? item.offers : item.offers?.[0];
        const { price, currency } = parsePrice(offer?.price);

        return {
          name: item.name ?? null,
          price,
          currency: offer?.priceCurrency ?? currency,
          image_url: typeof item.image === 'string' ? item.image : item.image?.[0] ?? null,
        };
      }
    } catch {
      // Skip malformed JSON-LD
    }
  }

  return null;
}

function extractFromOpenGraph(): Partial<ExtractedProduct> {
  return {
    name: getMetaContent('og:title') ?? document.title ?? '',
    image_url: getMetaContent('og:image'),
    price: (() => {
      const raw = getMetaContent('product:price:amount') ?? getMetaContent('og:price:amount');
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: getMetaContent('product:price:currency') ?? getMetaContent('og:price:currency') ?? 'USD',
  };
}

// Store-specific extractors for the top 10 shopping sites
const STORE_EXTRACTORS: Record<string, () => Partial<ExtractedProduct>> = {
  'amazon.com': () => ({
    name: document.querySelector<HTMLElement>('#productTitle')?.textContent?.trim() ?? null,
    price: (() => {
      const whole = document.querySelector('.a-price-whole')?.textContent?.replace(/[^0-9]/g, '');
      const frac = document.querySelector('.a-price-fraction')?.textContent?.replace(/[^0-9]/g, '');
      if (!whole) return null;
      return parseFloat(`${whole}.${frac ?? '0'}`);
    })(),
    currency: 'USD',
    image_url: document.querySelector<HTMLImageElement>('#landingImage, #imgTagWrapperId img')?.src ?? null,
    specs: (() => {
      const specs: Record<string, string> = {};
      document.querySelectorAll<HTMLTableRowElement>('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr').forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim().replace(/\s+/g, ' ') ?? '';
          const val = cells[1].textContent?.trim().replace(/\s+/g, ' ') ?? '';
          if (key && val && key.length < 60) specs[key] = val;
        }
      });
      return specs;
    })(),
  }),

  'ebay.com': () => ({
    name: document.querySelector<HTMLElement>('#itemTitle')?.textContent?.replace('Details about\u00a0', '').trim() ??
      document.querySelector<HTMLElement>('.x-item-title__mainTitle')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[itemprop="price"]')?.getAttribute('content') ??
        document.querySelector<HTMLElement>('.x-price-primary .ux-textspans')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'USD',
    image_url: document.querySelector<HTMLImageElement>('.ux-image-carousel img, #icImg')?.src ?? null,
  }),

  'aliexpress.com': () => ({
    name: document.querySelector<HTMLElement>('.title--wrap--UUHae_g h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('.price--current--I3Zeidd')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'USD',
    image_url: document.querySelector<HTMLImageElement>('.slider--img--K0YbWQO img')?.src ?? null,
  }),

  'etsy.com': () => ({
    name: document.querySelector<HTMLElement>('h1[data-buy-box-listing-title]')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[data-selector="price-only"]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'USD',
    image_url: document.querySelector<HTMLImageElement>('[data-carousel-first-image]')?.src ?? null,
  }),

  'zalando.nl': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="Title"], span[class*="title"], h1')?.textContent?.trim() ?? null,
    price: (() => {
      // Zalando puts price in itemprop or data attributes
      const meta = document.querySelector<HTMLMetaElement>('meta[itemprop="price"]')?.content
        ?? document.querySelector<HTMLElement>('[data-testid="price"] span, [class*="price"]')?.textContent;
      return meta ? parsePrice(meta).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('img[class*="Image"][src*="img01.ztat"]')?.src ?? null,
  }),

  'zalando.com': () => ({
    name: document.querySelector<HTMLElement>('h1')?.textContent?.trim() ?? null,
    price: (() => {
      const meta = document.querySelector<HTMLMetaElement>('meta[itemprop="price"]')?.content
        ?? document.querySelector<HTMLElement>('[data-testid="price"] span')?.textContent;
      return meta ? parsePrice(meta).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('img[src*="img01.ztat"]')?.src ?? null,
  }),

  'zara.com': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-detail-info__name"], h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="price__amount"], .price span, [data-price]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('[class*="media-image__image"], picture img')?.src ?? null,
  }),

  'thenorthface.com': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-name"], h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="product-price"], [itemprop="price"], .price')?.textContent
        ?? document.querySelector<HTMLMetaElement>('meta[itemprop="price"]')?.content;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('[class*="product-image"] img, .primary-image')?.src ?? null,
  }),

  'asos.com': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-hero"], h1[data-testid*="product-title"]')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[data-testid="current-price"], [class*="current-price"]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('[class*="product-photo"] img, #hero-image')?.src ?? null,
  }),

  'hm.com': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-item-headline"]')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="product-item-price"] .price, [data-testid="price"]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('[class*="product-detail-main-image-container"] img')?.src ?? null,
  }),
};

function getStoreDomain(): string {
  return window.location.hostname.replace('www.', '');
}

function getStoreName(domain: string): string {
  // Capitalize first part of domain
  const parts = domain.split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

export function extractProduct(): ExtractedProduct {
  const domain = getStoreDomain();
  const storeName = getStoreName(domain);
  const productUrl = window.location.href;

  // Start with JSON-LD (most reliable)
  const jsonLd = extractFromJsonLd() ?? {};
  const og = extractFromOpenGraph();

  // Try store-specific extractor
  const storeKey = Object.keys(STORE_EXTRACTORS).find((k) => domain.includes(k));
  const storeData = storeKey ? STORE_EXTRACTORS[storeKey]() : {};

  // Merge: store-specific > JSON-LD > OG
  const merged: ExtractedProduct = {
    name: storeData.name ?? jsonLd.name ?? og.name ?? document.title ?? 'Unknown product',
    price: storeData.price ?? jsonLd.price ?? og.price ?? null,
    currency: storeData.currency ?? jsonLd.currency ?? og.currency ?? 'USD',
    image_url: storeData.image_url ?? jsonLd.image_url ?? og.image_url ?? null,
    product_url: productUrl,
    store_name: storeName,
    store_domain: domain,
    specs: (storeData.specs as Record<string, string>) ?? {},
  };

  // Clean up name
  merged.name = merged.name.trim().slice(0, 300);

  return merged;
}
