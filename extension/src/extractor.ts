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
  images: string[];
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
      const rawItems = Array.isArray(data) ? data : [data];
      // Flatten @graph (many modern sites wrap everything in @graph)
      const items: unknown[] = [];
      for (const raw of rawItems) {
        const r = raw as Record<string, unknown>;
        if (r['@graph'] && Array.isArray(r['@graph'])) {
          items.push(...r['@graph']);
        } else {
          items.push(raw);
        }
      }

      for (const item of items) {
        const type = item['@type'];
        if (!type) continue;

        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        const isProductGroup = type === 'ProductGroup';
        if (!isProduct && !isProductGroup) continue;

        // ProductGroup (e.g. Zalando): price lives in hasVariant[0].offers
        const source = isProductGroup
          ? (Array.isArray(item.hasVariant) ? item.hasVariant[0] : null)
          : item;
        if (!source) continue;

        // Handle Offer, array of Offers, and AggregateOffer
        // Always prefer the lowest (sale) price when multiple offers exist
        let offer = null;
        if (source.offers) {
          const offersType = source.offers['@type'];
          if (offersType === 'Offer') {
            offer = source.offers;
          } else if (offersType === 'AggregateOffer') {
            // lowPrice is the sale/current price
            offer = { price: source.offers.lowPrice, priceCurrency: source.offers.priceCurrency };
          } else if (Array.isArray(source.offers)) {
            // Pick the offer with the lowest price (sale price beats regular price)
            const valid = source.offers.filter((o: any) => o.price != null); // eslint-disable-line @typescript-eslint/no-explicit-any
            if (valid.length > 0) {
              offer = valid.reduce((min: any, o: any) => parseFloat(o.price) < parseFloat(min.price) ? o : min); // eslint-disable-line @typescript-eslint/no-explicit-any
            }
          }
        }
        const { price, currency } = parsePrice(offer?.price);

        const images: string[] = Array.isArray(item.image)
          ? item.image.filter((i: unknown) => typeof i === 'string')
          : typeof item.image === 'string' ? [item.image] : [];

        return {
          name: item.name ?? null,
          price,
          currency: offer?.priceCurrency ?? currency,
          image_url: images[0] ?? null,
          images,
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

// Store-specific extractors for the top 10 shopping sites.
// Keys are matched with domain.includes(key) so 'amazon.' matches amazon.com, amazon.nl, amazon.de etc.
const STORE_EXTRACTORS: Record<string, () => Partial<ExtractedProduct>> = {
  'amazon.': () => ({
    name: document.querySelector<HTMLElement>('#productTitle')?.textContent?.trim() ?? null,
    price: (() => {
      const whole = document.querySelector('.a-price-whole')?.textContent?.replace(/[^0-9]/g, '');
      const frac = document.querySelector('.a-price-fraction')?.textContent?.replace(/[^0-9]/g, '');
      if (!whole) return null;
      return parseFloat(`${whole}.${frac ?? '0'}`);
    })(),
    currency: window.location.hostname.includes('.nl') || window.location.hostname.includes('.de') || window.location.hostname.includes('.fr') ? 'EUR' : 'USD',
    image_url: (() => {
      // Amazon lazy-loads images - try data-old-hires first, then src
      const img = document.querySelector<HTMLImageElement>('#landingImage, #imgTagWrapperId img');
      return img?.getAttribute('data-old-hires') || img?.src || null;
    })(),
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

  'ebay.': () => ({
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

  'zalando.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="Title"], span[class*="title"], h1')?.textContent?.trim() ?? null,
    // Price handled by extractFromJsonLd() via ProductGroup > hasVariant[0] > offers
    price: null,
    currency: 'EUR',
    image_url: (() => {
      const img = document.querySelector<HTMLImageElement>('img[src*="img01.ztat"], img[srcset*="img01.ztat"]');
      if (img?.src && img.src.includes('img01.ztat')) return img.src;
      const srcset = img?.getAttribute('srcset') ?? '';
      const first = srcset.split(',')[0]?.trim().split(' ')[0];
      return first || document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content || null;
    })(),
  }),

  'zara.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-detail-info__name"], h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="price__amount"], .price span, [data-price]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    // og:image is always the product image on Zara - much more reliable than DOM selectors
    // which pick up campaign/editorial banners instead of the actual item photo.
    image_url: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? null,
  }),

  'sephora.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product"], h1[data-comp*="Name"], .product-name h1, h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[data-comp="Price"] [class*="current"], [class*="product-price"] .value, [itemprop="price"], [class*="price-sales"], [class*="price__value"]')?.textContent
        ?? document.querySelector<HTMLMetaElement>('meta[itemprop="price"]')?.content
        ?? document.querySelector<HTMLMetaElement>('meta[property="product:price:amount"]')?.content;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: window.location.hostname.includes('.fr') ? 'EUR' : window.location.hostname.includes('.co.uk') ? 'GBP' : 'USD',
    image_url: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? null,
  }),

  'thenorthface.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-name"], h1[class*="ProductName"], h1[class*="pdp"], h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="product-price__value"], [class*="ProductPrice"], [class*="pdp-price"], [class*="product-price"], [itemprop="price"], .price')?.textContent
        ?? document.querySelector<HTMLMetaElement>('meta[itemprop="price"]')?.content
        ?? document.querySelector<HTMLMetaElement>('meta[property="product:price:amount"]')?.content;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: window.location.hostname.includes('.com') && window.location.pathname.includes('/nl-') ? 'EUR'
      : window.location.hostname.includes('.com') && window.location.pathname.includes('/de-') ? 'EUR'
      : window.location.hostname.includes('.com') && window.location.pathname.includes('/fr-') ? 'EUR'
      : window.location.hostname.includes('.co.uk') ? 'GBP'
      : 'EUR',
    image_url: (() => {
      const img = document.querySelector<HTMLImageElement>('[class*="product-image"] img, .primary-image, [class*="pdp"] img');
      const srcset = img?.getAttribute('srcset') ?? img?.getAttribute('data-srcset') ?? '';
      const first = srcset.split(',')[0]?.trim().split(' ')[0];
      if (first) return first;
      if (img?.src && img.src.startsWith('http')) return img.src;
      return document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? null;
    })(),
  }),

  'asos.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-hero"], h1[data-testid*="product-title"]')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[data-testid="current-price"], [class*="current-price"]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('[class*="product-photo"] img, #hero-image')?.src ?? null,
  }),

  'hm.': () => ({
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
  const allImages: string[] = (jsonLd.images ?? []).length > 0
    ? (jsonLd.images as string[])
    : [storeData.image_url ?? jsonLd.image_url ?? og.image_url].filter((u): u is string => !!u);

  // Generic DOM fallback for price - runs when all structured data sources fail
  function genericDomPrice(): { price: number | null; currency: string } {
    // Try sale/current price selectors first (most specific → least specific)
    const saleSelectors = [
      '[class*="sale-price"]', '[class*="selling-price"]', '[class*="current-price"]',
      '[class*="price-current"]', '[class*="price-now"]', '[class*="price__current"]',
      '[data-testid*="price"]:not([data-testid*="original"]):not([data-testid*="was"])',
      '[class*="product-price"]:not([class*="was"]):not([class*="old"]):not([class*="original"])',
    ];
    for (const sel of saleSelectors) {
      const el = document.querySelector<HTMLElement>(sel);
      const content = el?.getAttribute('content') ?? el?.getAttribute('data-price') ?? el?.textContent?.trim();
      if (content) { const r = parsePrice(content); if (r.price != null) return r; }
    }
    // Fallback: itemprop="price" content attribute (machine-readable, always the current price)
    const itemprop = document.querySelector<HTMLElement>('[itemprop="price"]');
    const content = itemprop?.getAttribute('content') ?? itemprop?.getAttribute('data-price') ?? itemprop?.textContent?.trim();
    return content ? parsePrice(content) : { price: null, currency: 'USD' };
  }

  // Last-resort: scan visible text for price patterns near the product heading.
  // Works on any site regardless of class names or structured data.
  function textScanPrice(): { price: number | null; currency: string } {
    // Find the main content area (skip header/nav/footer)
    const main = document.querySelector('main, [role="main"], #content, #main, .product, [class*="product-detail"], [class*="pdp"]') ?? document.body;
    const text = main.innerText?.slice(0, 3000) ?? '';
    // Match prices like €140,00  $29.99  £49.95  € 1.234,56
    const pricePattern = /([€$£])\s?([\d.,]+)/g;
    const matches: { price: number; currency: string }[] = [];
    let m;
    while ((m = pricePattern.exec(text)) !== null) {
      const symbol = m[1];
      const currency = symbol === '€' ? 'EUR' : symbol === '£' ? 'GBP' : 'USD';
      const parsed = parsePrice(m[0]);
      if (parsed.price != null && parsed.price > 0) {
        matches.push({ price: parsed.price, currency });
      }
    }
    // Return the lowest price found (sale price is always lower than original)
    if (matches.length === 0) return { price: null, currency: 'USD' };
    return matches.reduce((min, p) => p.price < min.price ? p : min);
  }

  const domFallback = (storeData.price ?? jsonLd.price ?? og.price) == null ? genericDomPrice() : null;
  const textFallback = (storeData.price ?? jsonLd.price ?? og.price ?? domFallback?.price) == null ? textScanPrice() : null;

  const merged: ExtractedProduct = {
    name: storeData.name ?? jsonLd.name ?? og.name ?? document.title ?? 'Unknown product',
    price: storeData.price ?? jsonLd.price ?? og.price ?? domFallback?.price ?? textFallback?.price ?? null,
    currency: storeData.currency ?? jsonLd.currency ?? og.currency ?? domFallback?.currency ?? textFallback?.currency ?? 'USD',
    image_url: allImages[0] ?? storeData.image_url ?? jsonLd.image_url ?? og.image_url ?? null,
    images: allImages,
    product_url: productUrl,
    store_name: storeName,
    store_domain: domain,
    specs: (storeData.specs as Record<string, string>) ?? {},
  };

  // Clean up name
  merged.name = merged.name.trim().slice(0, 300);

  return merged;
}
