import * as cheerio from 'cheerio';
import { normalizeSpecs } from './normalize-specs';

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
      const rawItems: any[] = Array.isArray(data) ? data : [data]; // eslint-disable-line @typescript-eslint/no-explicit-any
      // Flatten @graph (many modern sites wrap everything in @graph)
      const items: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const raw of rawItems) {
        if (raw?.['@graph'] && Array.isArray(raw['@graph'])) {
          items.push(...raw['@graph']);
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
            // Pick the lowest price (sale price beats regular price)
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

        // Extract specs from Schema.org additionalProperty and direct fields
        const rawSpecs: Record<string, string> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractAdditionalProps = (node: any) => {
          if (!Array.isArray(node?.additionalProperty)) return;
          for (const prop of node.additionalProperty) {
            const name = typeof prop.name === 'string' ? prop.name : null;
            const val = typeof prop.value === 'string' ? prop.value
              : typeof prop.value === 'number' ? String(prop.value) : null;
            if (name && val) rawSpecs[name] = val;
          }
        };

        extractAdditionalProps(item);
        if (source !== item) extractAdditionalProps(source);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tryStr = (v: any): string | null =>
          typeof v === 'string' && v ? v
          : typeof v === 'object' && v !== null ? (typeof v.value === 'string' ? v.value : typeof v.name === 'string' ? v.name : null)
          : null;

        for (const field of ['material', 'color', 'size'] as const) {
          const v = tryStr(item[field] ?? source[field]);
          if (v) rawSpecs[field] = v;
        }

        const brandStr = tryStr(item.brand ?? source.brand);
        if (brandStr) rawSpecs['brand'] = brandStr;

        return {
          name: item.name ?? null,
          price,
          currency: offer?.priceCurrency ?? currency,
          image_url: images[0] ?? null,
          images,
          specs: rawSpecs,
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

// Server-side store-specific spec extractors (Cheerio). Mirrors the extension's STORE_EXTRACTORS.
// JSON-LD covers most cases; these fill in what JSON-LD misses on each site.
const STORE_SPEC_EXTRACTORS: Array<[string, ($: cheerio.CheerioAPI) => Record<string, string>]> = [
  ['amazon.', ($) => {
    const specs: Record<string, string> = {};
    $('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim().replace(/\s+/g, ' ');
        const val = $(cells[1]).text().trim().replace(/\s+/g, ' ');
        if (key && val && key.length < 60) specs[key] = val;
      }
    });
    return specs;
  }],
  ['ebay.', ($) => {
    const specs: Record<string, string> = {};
    $('.ux-labels-values, .itemAttr').each((_, row) => {
      const label = $(row).find('.ux-labels-values__labels, .attrLabels').text().trim().replace(/:$/, '');
      const value = $(row).find('.ux-labels-values__values, .attrValues').text().trim();
      if (label && value && label.length < 60) specs[label] = value;
    });
    return specs;
  }],
  ['zalando.', ($) => {
    const specs: Record<string, string> = {};
    $('[class*="Detail"] li, [data-testid*="detail"] li, [class*="details"] li').each((_, li) => {
      const text = $(li).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
    });
    return specs;
  }],
  ['zara.', ($) => {
    const specs: Record<string, string> = {};
    const compositionEl = $('[class*="product-detail-extra-detail"], [class*="composition"]').first();
    if (compositionEl.length) specs['Composition'] = compositionEl.text().trim();
    $('[class*="expandable-text"] li, [class*="product-detail-extra-detail"] li').each((_, li) => {
      const text = $(li).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
    });
    return specs;
  }],
  ['asos.', ($) => {
    const specs: Record<string, string> = {};
    $('[class*="product-description"] li, [data-testid*="description"] li, [class*="ProductDescription"] li').each((_, li) => {
      const text = $(li).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
    });
    return specs;
  }],
  ['hm.', ($) => {
    const specs: Record<string, string> = {};
    $('[class*="description-accordion"] [class*="description-item"], [class*="product-description"] li').each((_, el) => {
      const text = $(el).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
    });
    return specs;
  }],
  ['thenorthface.', ($) => {
    const specs: Record<string, string> = {};
    $('[class*="product-details"] li, [class*="pdp-description"] li').each((_, li) => {
      const text = $(li).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
    });
    return specs;
  }],
  ['etsy.com', ($) => {
    const specs: Record<string, string> = {};
    $('[class*="product-details"] li, [data-region="product_details"] li').each((_, li) => {
      const text = $(li).text().trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
    });
    return specs;
  }],
];

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

  const images: string[] = (jsonLd.images ?? []).length > 0
    ? (jsonLd.images as string[])
    : [og.image_url].filter((u): u is string => !!u);
  const image_url = images[0] ?? null;

  // Store-specific DOM specs (fallback for what JSON-LD doesn't cover)
  const storeKey = STORE_SPEC_EXTRACTORS.find(([k]) => store_domain.includes(k));
  const domSpecs = storeKey ? storeKey[1]($) : {};

  return {
    name: name || 'Unknown product',
    price,
    currency,
    image_url,
    images,
    product_url: url,
    store_name,
    store_domain,
    specs: normalizeSpecs({
      ...(jsonLd.specs ?? {}),
      ...domSpecs,
    }),
  };
}
