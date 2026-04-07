import * as cheerio from 'cheerio';

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

function parsePrice(raw: string | number | undefined | null): { price: number | null; currency: string } {
  if (raw == null) return { price: null, currency: 'USD' };
  if (typeof raw === 'number') return { price: raw, currency: 'USD' };

  const str = String(raw).trim();

  const currency = str.includes('€') ? 'EUR'
    : str.includes('£') ? 'GBP'
    : 'USD';

  let cleaned = str.replace(/[^0-9.,]/g, '');

  if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(',', '.');
  }

  const price = parseFloat(cleaned);
  return { price: isNaN(price) ? null : price, currency };
}

function extractFromJsonLd($: cheerio.CheerioAPI): Partial<ExtractedProduct> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    try {
      const data = JSON.parse($(script).html() ?? '');
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = item['@type'];
        if (!type) continue;

        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        const isProductGroup = type === 'ProductGroup';
        if (!isProduct && !isProductGroup) continue;

        const source = isProductGroup
          ? (Array.isArray(item.hasVariant) ? item.hasVariant[0] : null)
          : item;
        if (!source) continue;

        let offer = null;
        if (source.offers) {
          const offersType = source.offers['@type'];
          if (offersType === 'Offer') {
            offer = source.offers;
          } else if (offersType === 'AggregateOffer') {
            offer = { price: source.offers.lowPrice, priceCurrency: source.offers.priceCurrency };
          } else if (Array.isArray(source.offers)) {
            offer = source.offers[0];
          }
        }
        const { price, currency } = parsePrice(offer?.price);

        return {
          name: item.name ?? null,
          price,
          currency: offer?.priceCurrency ?? currency,
          image_url: typeof item.image === 'string' ? item.image : item.image?.[0] ?? null,
        };
      }
    } catch {
      // skip malformed JSON-LD
    }
  }

  return null;
}

function extractFromOpenGraph($: cheerio.CheerioAPI): Partial<ExtractedProduct> {
  const getMeta = (property: string) =>
    $(`meta[property="${property}"]`).attr('content') ??
    $(`meta[name="${property}"]`).attr('content') ??
    null;

  const rawPrice = getMeta('product:price:amount') ?? getMeta('og:price:amount');

  return {
    name: getMeta('og:title') ?? $('title').text() ?? '',
    image_url: getMeta('og:image'),
    price: rawPrice ? parsePrice(rawPrice).price : null,
    currency: getMeta('product:price:currency') ?? getMeta('og:price:currency') ?? 'USD',
  };
}

export function extractProductFromHtml(html: string, url: string): ExtractedProduct {
  const $ = cheerio.load(html);

  const parsed = new URL(url);
  const store_domain = parsed.hostname.replace('www.', '');
  const parts = store_domain.split('.');
  const store_name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);

  const jsonLd = extractFromJsonLd($) ?? {};
  const og = extractFromOpenGraph($);

  const name = (jsonLd.name ?? og.name ?? $('title').text() ?? 'Unknown product').trim().slice(0, 300);
  const price = jsonLd.price ?? og.price ?? null;
  const currency = jsonLd.currency ?? og.currency ?? 'USD';
  const image_url = jsonLd.image_url ?? og.image_url ?? null;

  return {
    name: name || 'Unknown product',
    price,
    currency,
    image_url,
    product_url: url,
    store_name,
    store_domain,
    specs: {},
  };
}
