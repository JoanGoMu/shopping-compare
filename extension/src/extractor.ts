/**
 * Product data extractor.
 * Tries multiple strategies in order of reliability:
 * 1. Schema.org JSON-LD structured data
 * 2. Open Graph meta tags
 * 3. Store-specific DOM patterns
 * 4. Generic heuristics
 */

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

// --- Availability helpers (used by JSON-LD and store extractors) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isOfferAvailable(offer: any): boolean {
  const avail = typeof offer?.availability === 'string' ? offer.availability.toLowerCase() : '';
  if (!avail) return true; // No availability info = assume available
  if (avail.includes('outofstock') || avail.includes('soldout') || avail.includes('discontinued')) return false;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isVariantAvailable(variant: any): boolean {
  if (!variant?.offers) return true;
  const offers = Array.isArray(variant.offers) ? variant.offers : [variant.offers];
  return offers.some(isOfferAvailable);
}

// --- DOM extraction helpers (extension-only, not available server-side) ---

// Texts that are definitely not size values — CTA buttons, labels, links
const NON_SIZE_TEXT = /^(toevoegen|add to (cart|bag)|add|buy|order|checkout|submit|notify\s*me|size\s*guide|maten?wijzer|herinnering|wishlist|save|share|zoom|view|select|kies|choose|pick|afhandelen|winkelwagen|bekijk)$/i;

// Standard clothing/shoe size patterns used for content-based <select> detection
// (does NOT rely on class names, so works on stores with obfuscated CSS like Zara)
const SIZE_VAL = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/i;

function extractAvailableSizes(selectors: string): string[] {
  const sizes: string[] = [];
  document.querySelectorAll<HTMLElement>(selectors).forEach((el) => {
    const text = el.textContent?.trim();
    if (!text || text.length > 20) return; // Skip empty or long label text
    if (NON_SIZE_TEXT.test(text)) return;  // Skip CTA / label text
    const isUnavailable =
      (el as HTMLButtonElement).disabled === true
      || el.getAttribute('aria-disabled') === 'true'
      || el.hasAttribute('data-disabled')
      || /disabled|unavailable|sold-?out|out-of-stock|notify/i.test(el.className)
      || /disabled|unavailable|sold-?out|out-of-stock/i.test(el.getAttribute('data-state') ?? '')
      || /herinnering/i.test(el.textContent ?? '') // Dutch "Herinnering instellen" = OOS on Zalando
      || el.querySelector('del, s') !== null;
    if (!isUnavailable) sizes.push(text);
  });
  return sizes;
}

function extractSelectedColor(): string | null {
  const selectors = [
    '[class*="color-swatch"][aria-checked="true"]',
    '[class*="color-swatch"][aria-selected="true"]',
    '[class*="color"][aria-current="true"]',
    '[class*="selected-color"]',
    '[class*="color-name"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    const text = el?.getAttribute('aria-label') || el?.getAttribute('title') || el?.textContent?.trim();
    if (text && text.length < 60) return text;
  }
  return null;
}

// Generic size/color extractor — works on any store by scanning interactive UI elements.
// Runs as a fallback after JSON-LD and store-specific extraction.
// Returns available values found; caller decides whether to use them.
function extractGenericSizeColor(): { size: string | null; color: string | null } {
  const SIZE_KW = /\b(size|maat|taille|taglia|gr[öo](?:ss?|ße?)|tamaño|rozmiar)\b/i;
  const COLOR_KW = /\b(colou?r|kleur|couleur|farbe|colore|cor|renk)\b/i;

  let size: string | null = null;
  let color: string | null = null;

  // Get the human-readable label associated with a form control or container
  function getLabelText(el: Element): string {
    // aria-labelledby points to the label element by id
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent?.trim() ?? '';
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    // <label for="id">
    const id = el.id;
    if (id) {
      try {
        const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
        if (label) return label.textContent?.trim() ?? '';
      } catch { /* ignore invalid id chars */ }
    }
    // Nearest legend / label inside parent (covers fieldset + button groups)
    const parent = el.parentElement;
    if (parent) {
      const heading = parent.querySelector<HTMLElement>('legend, label, [class*="label"], [class*="title"], [class*="heading"]');
      if (heading && !heading.contains(el)) return heading.textContent?.trim() ?? '';
    }
    return '';
  }

  // Check whether a button/option element is available (not OOS/disabled) and a real size value
  function isAvailable(el: HTMLElement): boolean {
    const text = el.textContent?.trim() ?? '';
    return !(el as HTMLButtonElement).disabled
      && el.getAttribute('aria-disabled') !== 'true'
      && !el.hasAttribute('data-disabled')
      && !/disabled|unavailable|sold-?out|out-of-stock|notify/i.test(el.className)
      && !/herinnering/i.test(text)
      && !NON_SIZE_TEXT.test(text)
      && el.querySelector('del, s') === null;
  }

  // Strategy 1: native <select> elements
  document.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
    if (size && color) return;
    const label = getLabelText(select)
      || select.getAttribute('name') || select.getAttribute('data-option-name') || '';
    const available = Array.from(select.options)
      .filter((o) => !o.disabled && o.value !== '' && o.textContent?.trim())
      .map((o) => o.textContent!.trim());
    if (available.length === 0) return;
    if (!size && SIZE_KW.test(label)) size = available.join(', ');
    if (!color && COLOR_KW.test(label)) color = available[0]; // color: currently selected
  });

  // Strategy 1.5: <select> inside size-named containers without a SIZE_KW label
  // (Zara NL and others use a bare <select> inside a div whose class contains "size")
  if (!size) {
    const sizeContainer = document.querySelector(
      '[class*="size-selector"], [class*="size-list"], [class*="size-picker"], ' +
      '[class*="size-dropdown"], [class*="product-size"], [data-testid*="size"]'
    );
    const containerSelect = sizeContainer?.querySelector<HTMLSelectElement>('select');
    if (containerSelect) {
      const opts = Array.from(containerSelect.options)
        .filter(o => !o.disabled && o.value !== '' && o.textContent?.trim())
        .map(o => o.textContent!.trim())
        .filter(t => t.length <= 20 && !NON_SIZE_TEXT.test(t));
      if (opts.length > 0) size = opts.join(', ');
    }
  }

  // Strategy 2: button groups / radiogroups / listboxes
  const CONTAINER_SEL = [
    '[role="radiogroup"]', '[role="listbox"]',
    '[class*="size-selector"]', '[class*="size-picker"]', '[class*="size-options"]', '[class*="size-list"]',
    '[class*="color-selector"]', '[class*="color-picker"]', '[class*="color-options"]',
    '[class*="variant-selector"]', '[class*="swatch-container"]', '[class*="swatches"]',
  ].join(', ');

  document.querySelectorAll<HTMLElement>(CONTAINER_SEL).forEach((container) => {
    if (size && color) return;
    // Combine aria label + class name so class patterns like "size-selector" also match
    const label = getLabelText(container) + ' ' + container.className;
    const items = Array.from(container.querySelectorAll<HTMLElement>(
      'button, [role="radio"], [role="option"], [role="menuitem"], li'
    )).filter((el) => isAvailable(el));
    const values = items
      .map((el) => el.getAttribute('aria-label') || el.textContent?.trim())
      .filter((v): v is string => !!v && v.length > 0 && v.length <= 20);
    if (values.length === 0) return;
    if (!size && SIZE_KW.test(label)) size = values.join(', ');
    if (!color && COLOR_KW.test(label)) color = values[0];
  });

  // Strategy 3: Shopify / generic data-option-name pattern
  document.querySelectorAll<HTMLElement>('[data-option-name], [data-attribute-name]').forEach((container) => {
    if (size && color) return;
    const name = container.getAttribute('data-option-name') ?? container.getAttribute('data-attribute-name') ?? '';
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-value], input[type="radio"]'))
      .filter((el) => isAvailable(el))
      .map((el) => el.getAttribute('data-value') || (el as HTMLInputElement).value || el.textContent?.trim())
      .filter((v): v is string => !!v && v.length <= 20);
    if (items.length === 0) return;
    if (!size && SIZE_KW.test(name)) size = items.join(', ');
    if (!color && COLOR_KW.test(name)) color = items[0];
  });

  // Strategy 4: content-based select detection (stores with obfuscated class names)
  // Any <select> whose options are mostly standard size values is treated as the size picker.
  if (!size) {
    document.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
      if (size) return;
      const opts = Array.from(sel.options)
        .filter(o => !o.disabled && o.value !== '' && o.textContent?.trim())
        .map(o => o.textContent!.trim())
        .filter(t => t.length <= 20 && !NON_SIZE_TEXT.test(t));
      const sizeCount = opts.filter(o => SIZE_VAL.test(o)).length;
      if (sizeCount >= 2 && sizeCount >= opts.length * 0.5) {
        size = opts.join(', ');
      }
    });
  }

  return { size, color };
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tryStr = (v: any): string | null =>
          typeof v === 'string' && v ? v
          : typeof v === 'object' && v !== null ? (typeof v.value === 'string' ? v.value : typeof v.name === 'string' ? v.name : null)
          : null;

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

        // additionalProperty may live at group level
        extractAdditionalProps(item);

        // ProductGroup: iterate ALL variants to collect available sizes/colors
        // and pick a source variant for price extraction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let source: any = isProductGroup ? null : item;
        if (isProductGroup && Array.isArray(item.hasVariant)) { // eslint-disable-line @typescript-eslint/no-explicit-any
          const variants: any[] = item.hasVariant; // eslint-disable-line @typescript-eslint/no-explicit-any
          const availableSizes = new Set<string>();
          const availableColors = new Set<string>();
          for (const v of variants) {
            const available = isVariantAvailable(v);
            if (available) {
              const sz = tryStr(v.size);
              if (sz) availableSizes.add(sz);
              const col = tryStr(v.color);
              if (col) availableColors.add(col);
            }
            // Pick first available variant as source for price; fall back to [0]
            if (!source && available) source = v;
          }
          if (!source) source = variants[0]; // fallback
          if (availableSizes.size > 0) rawSpecs['size'] = Array.from(availableSizes).join(', ');
          if (availableColors.size > 0) rawSpecs['color'] = Array.from(availableColors).join(', ');
          // additionalProperty from the chosen source variant
          extractAdditionalProps(source);
        } else if (source !== item) {
          extractAdditionalProps(source);
        }

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

        // For non-group products, still extract material/color/size from item and source
        if (!isProductGroup) {
          for (const field of ['material', 'color', 'size'] as const) {
            const v = tryStr(item[field] ?? source[field]);
            if (v) rawSpecs[field] = v;
          }
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
    specs: (() => {
      const specs: Record<string, string> = {};
      // Item Specifics section - label/value pairs
      document.querySelectorAll<HTMLElement>('.ux-labels-values, .itemAttr').forEach((row) => {
        const label = row.querySelector('.ux-labels-values__labels, .attrLabels')?.textContent?.trim().replace(/:$/, '');
        const value = row.querySelector('.ux-labels-values__values, .attrValues')?.textContent?.trim();
        if (label && value && label.length < 60) specs[label] = value;
      });
      return specs;
    })(),
  }),

  'aliexpress.com': () => ({
    name: document.querySelector<HTMLElement>('.title--wrap--UUHae_g h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('.price--current--I3Zeidd')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'USD',
    image_url: document.querySelector<HTMLImageElement>('.slider--img--K0YbWQO img')?.src ?? null,
    specs: (() => {
      const specs: Record<string, string> = {};
      // Specification section - class names contain hash suffixes, use partial matches
      document.querySelectorAll<HTMLElement>('[class*="specification--prop"], [class*="ProductProps"] [class*="item"]').forEach((prop) => {
        const label = prop.querySelector<HTMLElement>('[class*="title"], [class*="label"]')?.textContent?.trim();
        const value = prop.querySelector<HTMLElement>('[class*="value"], [class*="desc"]')?.textContent?.trim();
        if (label && value && label.length < 60) specs[label] = value;
      });
      return specs;
    })(),
  }),

  'etsy.com': () => ({
    name: document.querySelector<HTMLElement>('h1[data-buy-box-listing-title]')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[data-selector="price-only"]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'USD',
    image_url: document.querySelector<HTMLImageElement>('[data-carousel-first-image]')?.src ?? null,
    specs: (() => {
      const specs: Record<string, string> = {};
      // Item Details section - "Key: Value" list items
      document.querySelectorAll<HTMLElement>('[class*="product-details"] li, [class*="listing-page-overview"] li, [data-region="product_details"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      return specs;
    })(),
  }),

  'zalando.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="Title"], span[class*="title"], h1')?.textContent?.trim() ?? null,
    // Price handled by extractFromJsonLd() via ProductGroup > hasVariant offers
    price: null,
    currency: 'EUR',
    image_url: (() => {
      const img = document.querySelector<HTMLImageElement>('img[src*="img01.ztat"], img[srcset*="img01.ztat"]');
      if (img?.src && img.src.includes('img01.ztat')) return img.src;
      const srcset = img?.getAttribute('srcset') ?? '';
      const first = srcset.split(',')[0]?.trim().split(' ')[0];
      return first || document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content || null;
    })(),
    specs: (() => {
      const specs: Record<string, string> = {};
      // Details accordion - split "Key: Value" list items
      document.querySelectorAll<HTMLElement>('[class*="Detail"] li, [data-testid*="detail"] li, [class*="details"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      // Size: read from size dropdown/button list (filters OOS via extractAvailableSizes)
      const sizes = extractAvailableSizes(
        '[data-testid*="size"] option, [class*="size"] select option, ' +
        '[class*="SizeSelector"] [role="option"], button[class*="size"], ' +
        '[class*="size-selector"] button, [data-testid*="size-selector"] button'
      );
      if (sizes.length > 0) specs['size'] = sizes.join(', ');
      // Color: "Kleur: X" text or selected swatch aria-label
      if (!specs['kleur'] && !specs['Kleur'] && !specs['color'] && !specs['Color']) {
        const colorFromText = (() => {
          let found: string | null = null;
          document.querySelectorAll<HTMLElement>('[class*="Detail"] span, [data-testid*="detail"] span, [class*="color"] span').forEach((el) => {
            if (found) return;
            const text = el.textContent?.trim() ?? '';
            if (/^kleur:/i.test(text)) found = text.replace(/^kleur:\s*/i, '').trim();
          });
          return found;
        })();
        const colorFromSwatch = document.querySelector<HTMLElement>(
          '[class*="color-swatch"][aria-checked="true"], [class*="color-swatch"][aria-selected="true"]'
        );
        const color = colorFromText
          || colorFromSwatch?.getAttribute('aria-label')
          || colorFromSwatch?.getAttribute('title');
        if (color) specs['color'] = color;
      }
      return specs;
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
    specs: (() => {
      const specs: Record<string, string> = {};
      // Composition/care text block
      const compositionEl = document.querySelector<HTMLElement>('[class*="product-detail-extra-detail"], [class*="composition"]');
      if (compositionEl?.textContent?.trim()) specs['Composition'] = compositionEl.textContent.trim();
      // Additional detail list items (care, origin, etc.)
      document.querySelectorAll<HTMLElement>('[class*="expandable-text"] li, [class*="product-detail-extra-detail"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      // Size: identify the size <select> by option content — Zara uses obfuscated class names
      // so class-name selectors are unreliable. Any <select> whose options are mostly standard
      // clothing sizes (XS/S/M/L/XL/XXL or numeric like 36/38/40) is the size picker.
      for (const sel of document.querySelectorAll<HTMLSelectElement>('select')) {
        const opts = Array.from(sel.options)
          .filter(o => !o.disabled && o.value !== '' && o.textContent?.trim())
          .map(o => o.textContent!.trim())
          .filter(t => t.length <= 20 && !NON_SIZE_TEXT.test(t));
        const sizeCount = opts.filter(o => SIZE_VAL.test(o)).length;
        if (sizeCount >= 2 && sizeCount >= opts.length * 0.5) {
          specs['size'] = opts.join(', ');
          break;
        }
      }
      // Color: from color selector active element or product-detail-info__color label
      if (!specs['color'] && !specs['Color']) {
        const colorEl = document.querySelector<HTMLElement>(
          '[class*="product-detail-info__color"], [class*="color-selector"] [aria-checked="true"], ' +
          '[data-qa-qualifier*="color"]'
        );
        const color = colorEl?.getAttribute('aria-label')
          || colorEl?.getAttribute('title')
          || colorEl?.textContent?.replace(/^colou?r[:\s]*/i, '').trim();
        if (color && color.length < 60) specs['color'] = color;
      }
      return specs;
    })(),
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
    specs: (() => {
      const specs: Record<string, string> = {};
      // Product details / About tabs - list items with key: value
      document.querySelectorAll<HTMLElement>('[data-comp*="Detail"] li, [class*="product-details"] li, [class*="ProductDetails"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      return specs;
    })(),
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
    specs: (() => {
      const specs: Record<string, string> = {};
      // Product details bullet list - "Material: 100% Polyester" format
      document.querySelectorAll<HTMLElement>('[class*="product-details"] li, [class*="pdp-description"] li, [class*="description-content"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      // Size: read from button grid (filters disabled buttons)
      const sizes = extractAvailableSizes(
        '[class*="size-selector"] button, [class*="SizeSelector"] button, ' +
        '[class*="pdp-size"] button, [data-testid*="size"] button, ' +
        '[class*="size-picker"] button, [class*="size-grid"] button'
      );
      if (sizes.length > 0) specs['size'] = sizes.join(', ');
      // Color: "Kleur:" in detail items is captured above by colon parser;
      // also try selected color swatch as fallback
      if (!specs['kleur'] && !specs['Kleur'] && !specs['color'] && !specs['Color']) {
        const color = extractSelectedColor();
        if (color) specs['color'] = color;
      }
      return specs;
    })(),
  }),

  'vans.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-name"], h1[class*="ProductName"], h1[data-testid*="product-title"], h1')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="product-price__value"], [class*="ProductPrice"], [data-testid*="price"], [itemprop="price"], .price')?.textContent
        ?? document.querySelector<HTMLMetaElement>('meta[itemprop="price"]')?.content
        ?? document.querySelector<HTMLMetaElement>('meta[property="product:price:amount"]')?.content;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content
      ?? document.querySelector<HTMLImageElement>('[class*="product-image"] img, [class*="pdp"] img')?.src ?? null,
    specs: (() => {
      const specs: Record<string, string> = {};
      // Detail list items - "Material: Suede/Canvas" format
      document.querySelectorAll<HTMLElement>('[class*="product-details"] li, [class*="pdp-description"] li, [class*="description-content"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
      });
      // Size: Vans uses a size picker drawer/modal with buttons
      // "Nog Maar Een Paar" = low stock but still available, so those are NOT filtered
      const sizes = extractAvailableSizes(
        '[class*="size-selector"] button, [class*="size-picker"] button, ' +
        '[data-testid*="size"] button, [class*="pdp-size"] button, ' +
        '[class*="SizeButton"], [class*="size-option"]'
      );
      if (sizes.length > 0) specs['size'] = sizes.join(', ');
      // Color: from swatch selectors or color label
      if (!specs['color'] && !specs['Color']) {
        const color = extractSelectedColor()
          || document.querySelector<HTMLElement>('[class*="color-name"], [class*="product-color"]')?.textContent?.trim();
        if (color && color.length < 60) specs['color'] = color;
      }
      return specs;
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
    specs: (() => {
      const specs: Record<string, string> = {};
      // Product description list items - "Fabric: 100% Cotton" format
      document.querySelectorAll<HTMLElement>('[class*="product-description"] li, [data-testid*="description"] li, [class*="ProductDescription"] li').forEach((li) => {
        const text = li.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      return specs;
    })(),
  }),

  'hm.': () => ({
    name: document.querySelector<HTMLElement>('h1[class*="product-item-headline"]')?.textContent?.trim() ?? null,
    price: (() => {
      const raw = document.querySelector<HTMLElement>('[class*="product-item-price"] .price, [data-testid="price"]')?.textContent;
      return raw ? parsePrice(raw).price : null;
    })(),
    currency: 'EUR',
    image_url: document.querySelector<HTMLImageElement>('[class*="product-detail-main-image-container"] img')?.src ?? null,
    specs: (() => {
      const specs: Record<string, string> = {};
      // Product description accordion - "Composition: 100% Cotton" list items
      document.querySelectorAll<HTMLElement>('[class*="description-accordion"] [class*="description-item"], [class*="product-description"] li, [data-testid*="description"] li').forEach((el) => {
        const text = el.textContent?.trim() ?? '';
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        }
      });
      return specs;
    })(),
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

  // Last-resort: scan visible text near the product heading for price patterns.
  // Scopes to the h1's parent container to avoid picking up recommended product prices.
  function textScanPrice(): { price: number | null; currency: string } {
    // Walk up from h1 to find the closest product info container
    const h1 = document.querySelector('h1');
    if (!h1) return { price: null, currency: 'USD' };

    // Try progressively wider scopes: h1's parent, grandparent, great-grandparent
    let scope: Element | null = h1.parentElement;
    for (let i = 0; i < 3 && scope; i++) {
      const text = (scope as HTMLElement).innerText ?? '';
      const result = scanTextForPrice(text);
      if (result.price != null) return result;
      scope = scope.parentElement;
    }

    return { price: null, currency: 'USD' };
  }

  function scanTextForPrice(text: string): { price: number | null; currency: string } {
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
    // Return the lowest price (sale price) from this scoped area
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
    specs: (() => {
      const jsonLdSpecs = jsonLd.specs ?? {};
      const domSpecs = storeData.specs ?? {};
      const merged = { ...jsonLdSpecs, ...domSpecs };
      // For size: prefer whichever source found MORE options (DOM often only captures
      // the currently-selected value while JSON-LD has the full variant list)
      const jsonLdSize = jsonLdSpecs['size'] ?? '';
      const domSize = domSpecs['size'] ?? '';
      if (jsonLdSize && domSize) {
        const jsonLdCount = jsonLdSize.split(',').length;
        const domCount = domSize.split(',').length;
        if (jsonLdCount > domCount) merged['size'] = jsonLdSize;
      }
      return normalizeSpecs(merged);
    })(),
  };

  // Clean up name
  merged.name = merged.name.trim().slice(0, 300);

  // Generic fallback: always run and prefer whichever source found MORE size options
  // (JSON-LD often captures only the currently-selected variant; DOM has the full list)
  const generic = extractGenericSizeColor();
  if (generic.size) {
    const existingCount = (merged.specs['Size'] ?? '').split(',').filter(s => s.trim()).length;
    const genericCount = generic.size.split(',').filter(s => s.trim()).length;
    if (!merged.specs['Size'] || genericCount > existingCount) merged.specs['Size'] = generic.size;
  }
  if (!merged.specs['Color'] && generic.color) merged.specs['Color'] = generic.color;

  return merged;
}
