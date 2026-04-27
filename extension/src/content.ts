/**
 * Content script: injects the "Save to Compare" button on product pages.
 */

import { extractProduct, extractWithRules, applySpecTranslations, simplifyHtml, type StoreSelectorRules } from './extractor';

const BUTTON_ID = 'comparecart-save-btn';
const CLOSE_BTN_ID = 'comparecart-close-btn';
const LABEL_ID = 'comparecart-save-label';
const TOAST_ID = 'comparecart-toast';
const UI_PREFS_KEY = 'ui_prefs';

interface UiPrefs {
  hiddenDomains: string[];
  saveButtonPos: { top: number; left: number } | null;
}

function getDefaultPrefs(): UiPrefs {
  return { hiddenDomains: [], saveButtonPos: null };
}

// Track the best Size value seen per URL to prevent retries from
// overwriting a good extraction with a worse one (SPA DOM state flipping).
let bestSizeForUrl = { url: '', size: '', count: 0 };

// AI-generated selector rules for this domain, pre-fetched on page load.
let cachedAiRules: StoreSelectorRules | null = null;
// Prevent sending the same domain for generation more than once per page session.
let aiRulesRequested = false;

// Prevent concurrent storage reads in init() on rapid-fire calls.
let initPending = false;

/**
 * Merges AI-generated rule extraction results on top of an existing product.
 * Only fills in missing fields - does not overwrite good data already extracted.
 * Also applies AI-generated spec key translations to normalize foreign-language labels.
 */
function applyAiRules(product: ReturnType<typeof extractProduct>): void {
  if (!cachedAiRules) return;
  try {
    const aiData = extractWithRules(cachedAiRules);
    if (!product.name || product.name === 'Unknown product') {
      if (aiData.name) product.name = aiData.name;
    }
    if (product.price == null && aiData.price != null) {
      product.price = aiData.price;
      product.currency = aiData.currency ?? product.currency;
    }
    if (!product.image_url && aiData.image_url) {
      product.image_url = aiData.image_url;
    }
    // Apply AI-generated spec key translations to both existing and incoming specs
    const translations = cachedAiRules.spec_translations ?? {};
    if (Object.keys(translations).length > 0) {
      product.specs = applySpecTranslations(product.specs, translations);
    }
    // Merge specs: AI rules fill in any keys not already present
    for (const [k, v] of Object.entries(aiData.specs ?? {})) {
      if (!product.specs[k]) product.specs[k] = v;
    }
  } catch { /* silent - AI rules are best-effort */ }
}

/**
 * Pre-fetches AI-generated selector rules for this domain.
 * On cache miss, sends simplified HTML to the server for generation.
 * Called once per page load from initWithRetry() after the DOM has settled.
 */
function prefetchAiRules() {
  if (!chrome.runtime?.id) return;
  if (isOwnApp()) return;
  if (window.self !== window.top) return;

  const domain = window.location.hostname.replace(/^www\./, '');

  // Step 1: check local cache in background service worker
  chrome.runtime.sendMessage({ type: 'GET_STORE_RULES', domain }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.rules) {
      cachedAiRules = response.rules as StoreSelectorRules;
      return;
    }

    // Step 2: cache miss - request generation if price OR specs are missing
    if (aiRulesRequested) return;
    const product = extractProduct();
    const hasPrice = product.price != null;
    const hasSpecs = Object.keys(product.specs).length >= 2;
    const hasName = product.name && product.name !== 'Unknown product';
    if (hasPrice && hasSpecs) return; // Existing extraction is good enough

    aiRulesRequested = true;
    const html = simplifyHtml();
    // Pass the product name so Claude knows what category to look for (e.g. shoe sizes)
    const productName = hasName ? product.name : undefined;
    chrome.runtime.sendMessage(
      { type: 'REQUEST_EXTRACTOR_GENERATION', domain, url: window.location.href, html, productName },
      (genResponse) => {
        if (chrome.runtime.lastError) return;
        if (genResponse?.rules) {
          cachedAiRules = genResponse.rules as StoreSelectorRules;
        }
      }
    );
  });
}

function isOwnApp(): boolean {
  try { return window.location.origin === new URL(APP_URL).origin; } catch { return false; }
}

function isLikelyProductPage(): boolean {
  if (document.querySelector('script[type="application/ld+json"]')) return true;
  if (document.querySelector('meta[property="og:type"][content="product"]')) return true;
  // itemprop="offers" or itemprop="price" signals a product (used by Amazon and others)
  if (document.querySelector('[itemprop="offers"], [itemprop="price"]')) return true;
  // Amazon: /dp/ASIN in URL + #productTitle in DOM
  if (/\/dp\/[A-Z0-9]{10}/i.test(window.location.pathname) && document.getElementById('productTitle')) return true;
  return false;
}

function createButton(savedPos: { top: number; left: number } | null): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.style.cssText = `
    all: initial;
    position: fixed;
    ${savedPos ? `top: ${savedPos.top}px; left: ${savedPos.left}px;` : 'bottom: 24px; right: 24px;'}
    z-index: 2147483647;
    background: #C4603C;
    color: white;
    border: none;
    border-radius: 100px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: grab;
    box-shadow: 0 4px 16px rgba(196, 96, 60, 0.4);
    transition: background 0.15s ease;
    line-height: 1;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  `;

  const label = document.createElement('span');
  label.id = LABEL_ID;
  label.textContent = '🛒 Save to Compare';
  label.style.cssText = 'pointer-events: none;';
  btn.appendChild(label);

  const closeBtn = document.createElement('span');
  closeBtn.id = CLOSE_BTN_ID;
  closeBtn.title = 'Hide on this site';
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: rgba(0,0,0,0.4);
    border-radius: 50%;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
  `;
  btn.appendChild(closeBtn);

  btn.addEventListener('mouseenter', () => { btn.style.background = '#A84E30'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = '#C4603C'; });
  return btn;
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  document.getElementById(TOAST_ID)?.remove();
  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = message;
  toast.style.cssText = `
    all: initial;
    position: fixed;
    bottom: 80px;
    right: 24px;
    z-index: 2147483647;
    background: ${type === 'success' ? '#059669' : '#dc2626'};
    color: white;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    max-width: 280px;
    display: block;
  `;
  document.documentElement.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function handleSave(btn: HTMLButtonElement) {
  if (!chrome.runtime?.id) {
    showToast('Extension was updated - reload the page', 'error');
    return;
  }

  const labelEl = (typeof btn.querySelector === 'function'
    ? btn.querySelector(`#${LABEL_ID}`)
    : null) as HTMLElement | null;

  function setLabel(text: string) {
    if (labelEl) labelEl.textContent = text;
    else btn.textContent = text;
  }

  setLabel('Saving...');
  btn.style.opacity = '0.7';

  const product = extractProduct(cachedAiRules?.detected_currency);
  applyAiRules(product);

  function reset() {
    setLabel('🛒 Save to Compare');
    btn.style.opacity = '1';
  }

  const timer = window.setTimeout(() => {
    reset();
    showToast('Timed out - try again', 'error');
  }, 10000);

  try {
    chrome.runtime.sendMessage({ type: 'SAVE_PRODUCT', product }, (response) => {
      window.clearTimeout(timer);
      reset();

      if (chrome.runtime.lastError) {
        // Service worker waking up - retry once
        if (chrome.runtime?.id) {
          window.setTimeout(() => handleSave(btn), 1500);
        } else {
          showToast('Extension was updated - reload the page', 'error');
        }
        return;
      }
      if (!response?.ok) {
        const msg = (response?.error ?? '') as string;
        if (msg.includes('not logged in')) {
          showToast('Sign in via the extension popup first', 'error');
        } else {
          showToast('Could not save: ' + msg, 'error');
        }
      } else if (response?.duplicate) {
        showToast('Already in your collection!');
      } else {
        showToast('Saved to CompareCart!');
      }
    });
  } catch {
    window.clearTimeout(timer);
    reset();
    showToast('Extension was updated - reload the page', 'error');
  }
}

function makeDraggable(btn: HTMLButtonElement): { justDragged(): boolean } {
  let startMouseX = 0, startMouseY = 0;
  let startBtnTop = 0, startBtnLeft = 0;
  let dragging = false;
  let dragEnded = false;

  function clampVal(n: number, lo: number, hi: number) {
    return Math.min(Math.max(n, lo), hi);
  }

  function applyPos(clientX: number, clientY: number) {
    const dx = clientX - startMouseX;
    const dy = clientY - startMouseY;
    if (!dragging && Math.sqrt(dx * dx + dy * dy) < 5) return;
    if (!dragging) {
      dragging = true;
      btn.style.cursor = 'grabbing';
      btn.style.transition = 'none';
      btn.style.pointerEvents = 'none';
      btn.style.bottom = '';
      btn.style.right = '';
    }
    const m = 8;
    btn.style.top = clampVal(startBtnTop + dy, m, window.innerHeight - btn.offsetHeight - m) + 'px';
    btn.style.left = clampVal(startBtnLeft + dx, m, window.innerWidth - btn.offsetWidth - m) + 'px';
  }

  function finishDrag() {
    btn.style.cursor = 'grab';
    btn.style.transition = 'background 0.15s ease';
    btn.style.pointerEvents = '';
    dragEnded = true;
    window.setTimeout(() => { dragEnded = false; }, 50);
    const top = parseFloat(btn.style.top);
    const left = parseFloat(btn.style.left);
    if (!isNaN(top) && !isNaN(left)) {
      chrome.storage.local.get(UI_PREFS_KEY, (d) => {
        const p: UiPrefs = (d[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();
        p.saveButtonPos = { top, left };
        chrome.storage.local.set({ [UI_PREFS_KEY]: p });
      });
    }
  }

  function onMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).id === CLOSE_BTN_ID) return;
    e.preventDefault();
    const rect = btn.getBoundingClientRect();
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startBtnTop = rect.top;
    startBtnLeft = rect.left;
    dragging = false;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e: MouseEvent) { applyPos(e.clientX, e.clientY); }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (!dragging) return;
    finishDrag();
  }

  function onTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).id === CLOSE_BTN_ID) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const rect = btn.getBoundingClientRect();
    startMouseX = t.clientX;
    startMouseY = t.clientY;
    startBtnTop = rect.top;
    startBtnLeft = rect.left;
    dragging = false;
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    applyPos(e.touches[0].clientX, e.touches[0].clientY);
    if (dragging) e.preventDefault();
  }

  function onTouchEnd() {
    if (!dragging) return;
    finishDrag();
  }

  btn.addEventListener('mousedown', onMouseDown);
  btn.addEventListener('touchstart', onTouchStart, { passive: true });
  btn.addEventListener('touchmove', onTouchMove, { passive: false });
  btn.addEventListener('touchend', onTouchEnd);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!btn.style.top) return;
      const top = parseFloat(btn.style.top);
      const left = parseFloat(btn.style.left);
      if (isNaN(top) || isNaN(left)) return;
      const m = 8;
      const newTop = clampVal(top, m, window.innerHeight - btn.offsetHeight - m);
      const newLeft = clampVal(left, m, window.innerWidth - btn.offsetWidth - m);
      if (newTop !== top) btn.style.top = newTop + 'px';
      if (newLeft !== left) btn.style.left = newLeft + 'px';
    }, 100);
  });

  return { justDragged: () => dragEnded };
}

function init() {
  if (document.getElementById(BUTTON_ID)) return;
  if (initPending) return;
  if (isOwnApp()) return;
  if (!isLikelyProductPage()) return;

  initPending = true;
  chrome.storage.local.get(UI_PREFS_KEY, (data) => {
    initPending = false;
    if (chrome.runtime.lastError) return;
    if (document.getElementById(BUTTON_ID)) return;

    const prefs: UiPrefs = (data[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();
    if (prefs.hiddenDomains.includes(location.hostname)) return;

    const btn = createButton(prefs.saveButtonPos ?? null);
    const drag = makeDraggable(btn);

    const closeEl = btn.querySelector(`#${CLOSE_BTN_ID}`) as HTMLElement | null;
    closeEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.storage.local.get(UI_PREFS_KEY, (d) => {
        const p: UiPrefs = (d[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();
        if (!p.hiddenDomains.includes(location.hostname)) {
          p.hiddenDomains.push(location.hostname);
        }
        chrome.storage.local.set({ [UI_PREFS_KEY]: p });
      });
      btn.remove();
      showToast(`Hidden on ${location.hostname}. Re-enable from the extension popup.`);
    });

    btn.addEventListener('click', () => {
      if (drag.justDragged()) return;
      handleSave(btn);
    });

    document.documentElement.appendChild(btn);
  });
}

function tryUpdateSavedPrice() {
  if (!chrome.runtime?.id) return;
  if (isOwnApp()) return;
  try {
    const product = extractProduct(cachedAiRules?.detected_currency);
    applyAiRules(product);
    if (product.price == null && Object.keys(product.specs ?? {}).length === 0) return;

    // Report whether AI rules helped (for quality feedback loop)
    if (cachedAiRules) {
      const domain = window.location.hostname.replace(/^www\./, '');
      chrome.runtime.sendMessage({
        type: 'REPORT_EXTRACTION_RESULT',
        domain,
        success: product.price != null,
      });
    }

    // Client-side size protection: never downgrade within a page session.
    // Zara's SPA re-renders sizes asynchronously; retries can catch the DOM in different states.
    const currentSize = product.specs['Size'] ?? '';
    const sizeTokens = currentSize.split(',').filter(s => s.trim()).length;
    if (product.product_url === bestSizeForUrl.url) {
      if (sizeTokens > bestSizeForUrl.count) {
        bestSizeForUrl = { url: product.product_url, size: currentSize, count: sizeTokens };
      } else if (sizeTokens < bestSizeForUrl.count && bestSizeForUrl.count > 0) {
        product.specs['Size'] = bestSizeForUrl.size;
      }
    } else {
      bestSizeForUrl = { url: product.product_url, size: currentSize, count: sizeTokens };
    }

    // Update own record directly (fast, no server hop)
    chrome.runtime.sendMessage({
      type: 'UPDATE_PRICE_IF_SAVED',
      url: product.product_url,
      price: product.price,
      currency: product.currency,
      specs: product.specs,
    });
    // Also enrich all other users who saved this URL (crowd-sourced freshness)
    chrome.runtime.sendMessage({
      type: 'ENRICH_PRODUCT',
      url: product.product_url,
      price: product.price,
      currency: product.currency,
      specs: product.specs,
    });
  } catch { /* silent */ }
}

// Asks background for other saved product URLs from this domain, then injects
// each as a tiny hidden iframe. The content script running inside each iframe
// extracts data and calls ENRICH_PRODUCT — completely invisible to the user.
// If the store blocks iframes (X-Frame-Options: DENY/SAMEORIGIN from a cross-origin
// context) the iframe simply never loads and is cleaned up after a timeout.
function tryRefreshRelatedProducts() {
  if (!chrome.runtime?.id) return;
  if (isOwnApp()) return;
  if (window.self !== window.top) return; // Don't run inside iframes
  const domain = window.location.hostname.replace(/^www\./, '');
  chrome.runtime.sendMessage({ type: 'GET_RELATED_URLS', domain, currentUrl: window.location.href }, (response) => {
    if (chrome.runtime.lastError || !response?.urls?.length) return;
    for (const url of response.urls as string[]) {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;pointer-events:none;border:none;';
      // Clean up after 20s whether it loaded or not
      window.setTimeout(() => iframe.remove(), 20000);
      document.documentElement.appendChild(iframe);
    }
  });
}

function initWithRetry() {
  init();
  // Staggered retries for SPAs that inject JSON-LD/prices via JavaScript.
  // init() is idempotent (bails if button already exists), so extra calls are free.
  for (const delay of [2000, 5000, 8000]) {
    window.setTimeout(() => {
      init();
      tryUpdateSavedPrice();
    }, delay);
  }
  // Pre-fetch AI-generated selector rules at 5s - DOM has stabilized by then.
  // On cache miss for incomplete extractions, this also triggers server-side generation.
  window.setTimeout(prefetchAiRules, 5000);
  // After page has settled, refresh other saved products from this domain via iframes
  window.setTimeout(tryRefreshRelatedProducts, 12000);
  // Inject mini save buttons on listing/carousel pages (runs after DOM is ready)
  window.setTimeout(tryInjectListingButtons, 2000);
}

// ---------------------------------------------------------------------------
// Mini save buttons on product listing/carousel pages
// ---------------------------------------------------------------------------

interface ListingConfig {
  cardSelector: string;       // CSS selector for each product card in the listing
  linkSelector: string;       // CSS selector for the anchor tag within the card
  insertTarget: string;       // where to insert the button (relative to card)
  insertPosition: InsertPosition;
}

// Per-domain config. linkSelector must resolve to an <a> with a product URL.
const LISTING_CONFIGS: Record<string, ListingConfig> = {
  'amazon': {
    cardSelector: '[data-component-type="s-search-result"], [data-asin]:not([data-asin=""])',
    linkSelector: 'h2 a, a.a-link-normal[href*="/dp/"]',
    insertTarget: 'self',
    insertPosition: 'afterbegin',
  },
  'zalando': {
    // Zalando product cards are <article> elements; product URLs end in .html
    cardSelector: 'article',
    linkSelector: 'a[href$=".html"], a[href*="/p/"]',
    insertTarget: 'self',
    insertPosition: 'afterbegin',
  },
  'asos': {
    cardSelector: 'article[id^="product-"]',
    linkSelector: 'a[href*="/prd/"]',
    insertTarget: 'self',
    insertPosition: 'afterbegin',
  },
  'zara': {
    cardSelector: '[class*="product-grid-product"]',
    linkSelector: 'a[class*="product-link"], a[href*="/product"]',
    insertTarget: 'self',
    insertPosition: 'afterbegin',
  },
  'converse': {
    // The main product image link contains a <picture> element; color-swatch links don't.
    // Using picture inside the selector means only the image container div matches,
    // not the color swatch links (which are also a[href*="/shop/p/"]).
    cardSelector: 'div:has(> a[href*="/shop/p/"] picture)',
    linkSelector: 'a[href*="/shop/p/"]',
    insertTarget: 'self',
    insertPosition: 'afterbegin',
  },
  'drmartens': {
    cardSelector: '[class*="product-item"], [class*="ProductItem"]',
    linkSelector: 'a[href*="/p/"], a[href$=".html"]',
    insertTarget: 'self',
    insertPosition: 'afterbegin',
  },
};

const LISTING_BTN_CLASS = 'cc-listing-save-btn';

// Generic product card patterns tried in order; first one with 4+ valid cards wins.
// More specific selectors first to avoid false positives on product detail pages.
const GENERIC_CARD_PATTERNS = [
  '[class*="product-card"]',
  '[class*="ProductCard"]',
  '[class*="product-item"]',
  '[class*="ProductItem"]',
  '[class*="product-tile"]',
  '[class*="product-cell"]',
  '[class*="product-grid-item"]',
  '[class*="product-list-item"]',
];

// Product URL patterns - links must match one of these to be considered a product link
const PRODUCT_LINK_RE = /\/(product|shop|p|item|dp|prd|pd)\/|\.html$|\/[A-Z0-9]{6,}$/i;

function detectGenericListingCards(): ListingConfig | null {
  // Only run on non-product pages (listing/category pages)
  if (isLikelyProductPage()) return null;

  for (const selector of GENERIC_CARD_PATTERNS) {
    const cards = Array.from(document.querySelectorAll<HTMLElement>(selector));
    // Require 4+ cards each containing an image and a product-like link
    const valid = cards.filter((c) => {
      const img = c.querySelector('img');
      const link = c.querySelector<HTMLAnchorElement>('a[href]');
      return img && link?.href && PRODUCT_LINK_RE.test(link.href);
    });
    // De-duplicate: remove any element that is an ancestor of another matched element.
    // This prevents parent + child both matching and getting two buttons.
    const deduplicated = valid.filter((c) => !valid.some((other) => other !== c && c.contains(other)));
    if (deduplicated.length >= 4) {
      return {
        cardSelector: selector,
        linkSelector: 'a[href]',
        insertTarget: 'self',
        insertPosition: 'afterbegin',
      };
    }
  }
  return null;
}

function getListingConfig(): ListingConfig | null {
  const host = window.location.hostname.replace(/^www\./, '');
  for (const [key, config] of Object.entries(LISTING_CONFIGS)) {
    if (!host.includes(key)) continue;
    // Only use explicit config if its selector actually matches cards on this page.
    // If it doesn't (e.g. different listing layout, or product page) fall through
    // to generic detection rather than returning a config that silently does nothing.
    if (document.querySelectorAll(config.cardSelector).length >= 3) return config;
    break; // Domain matched but selector failed - don't try other keys, go to generic
  }
  // Fall back to generic detection for unlisted stores or when explicit config fails
  return detectGenericListingCards();
}

function isListingPage(): boolean {
  const config = getListingConfig();
  if (!config) return false;
  // Listing pages have many matching cards; don't rely on isLikelyProductPage()
  // since some stores (Zalando, Amazon) embed JSON-LD on listing pages too.
  return document.querySelectorAll(config.cardSelector).length >= 3;
}

function injectListingSaveButtons() {
  if (!chrome.runtime?.id) return;
  if (isOwnApp()) return;
  if (window.self !== window.top) return;
  const config = getListingConfig();
  if (!config) return;

  const cards = document.querySelectorAll<HTMLElement>(config.cardSelector);
  cards.forEach((card) => {
    if (card.querySelector(`.${LISTING_BTN_CLASS}`)) return; // already injected

    const link = card.querySelector<HTMLAnchorElement>(config.linkSelector);
    if (!link?.href) return;

    const btn = document.createElement('button');
    btn.className = LISTING_BTN_CLASS;
    btn.title = 'Save to CompareCart';
    btn.style.cssText = `
      all: initial;
      position: absolute;
      bottom: 8px;
      left: 8px;
      z-index: 100;
      width: 26px;
      height: 26px;
      background: rgba(196, 96, 60, 0.85);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 15px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      opacity: 0.7;
    `;
    btn.textContent = '+';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#A84E30';
      btn.style.transform = 'scale(1.1)';
      btn.style.opacity = '1';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(196, 96, 60, 0.85)';
      btn.style.transform = 'scale(1)';
      btn.style.opacity = '0.7';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!chrome.runtime?.id) return;

      // Optimistic: show saved immediately, revert only on confirmed failure
      btn.textContent = '✓';
      btn.style.background = '#059669';
      btn.style.pointerEvents = 'none';

      const productUrl = link.href;
      chrome.runtime.sendMessage(
        { type: 'SAVE_FROM_LISTING', url: productUrl },
        (response) => {
          if (chrome.runtime.lastError || !response || (!response.ok && !response.duplicate)) {
            // Server-side fetch failed (bot protection, network error, etc.).
            // Fall back to browser-side save via hidden iframe so the store's
            // real session/cookies are used — works for Converse, Zara, etc.
            openAutoSaveIframe(productUrl);
            return; // Keep ✓ — still attempting via iframe
          }
          if (response.duplicate) {
            btn.style.background = '#6b7280';
          }
          // Open a hidden iframe to the product page so the content script can
          // do a full JS-enabled extraction and enrich specs/images/price
          if (response.ok && !response.duplicate) {
            const iframe = document.createElement('iframe');
            iframe.src = productUrl;
            iframe.style.cssText = 'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;pointer-events:none;border:none;';
            window.setTimeout(() => iframe.remove(), 25000);
            document.documentElement.appendChild(iframe);
          }
        }
      );
    });

    // Cards need relative positioning for the absolute button
    const pos = getComputedStyle(card).position;
    if (pos === 'static') card.style.position = 'relative';

    card.insertAdjacentElement(config.insertPosition, btn);
  });
}

// Opens a hidden iframe and signals the content script inside to auto-save the product.
// Used when server-side fetch fails (bot protection) or for right-click on a product link.
function openAutoSaveIframe(productUrl: string) {
  if (!chrome.runtime?.id) return;
  const iframe = document.createElement('iframe');
  iframe.src = productUrl;
  iframe.style.cssText = 'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;pointer-events:none;border:none;';
  iframe.addEventListener('load', () => {
    // Small delay so the content script's message listener is registered
    window.setTimeout(() => {
      try { iframe.contentWindow?.postMessage({ type: 'CC_AUTOSAVE' }, '*'); } catch { /* blocked iframe */ }
    }, 400);
  });
  window.setTimeout(() => iframe.remove(), 30000);
  document.documentElement.appendChild(iframe);
}

function tryInjectListingButtons() {
  if (!isListingPage()) return;
  injectListingSaveButtons();
  // Re-run on DOM changes (infinite scroll / pagination)
  const observer = new MutationObserver(() => {
    if (!chrome.runtime?.id) { observer.disconnect(); return; }
    injectListingSaveButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'CONTEXT_MENU_SAVE') {
    const fakeBtn = { textContent: '', style: { opacity: '' } } as unknown as HTMLButtonElement;
    handleSave(fakeBtn);
  }
  // Background sends this when server-side fetch fails (bot protection) for a right-clicked link
  if (message?.type === 'SAVE_VIA_IFRAME') {
    openAutoSaveIframe(message.url as string);
  }
  // Background asks content script to show a toast (avoids needing scripting permission)
  if (message?.type === 'SHOW_TOAST') {
    showToast(message.message as string, (message.toastType as 'success' | 'error') ?? 'success');
  }
});

// Auto sign-in: listen for session tokens posted from the web app (runs on all pages)
const APP_URL = '__APP_URL__';
window.addEventListener('message', (event) => {
  try {
    if (event.origin !== new URL(APP_URL).origin) return;
  } catch { return; }
  if (event.data?.type !== 'COMPARECART_AUTH') return;
  const { access_token, refresh_token } = event.data;
  if (typeof access_token !== 'string' || typeof refresh_token !== 'string') return;
  if (!access_token || !refresh_token) return;
  if (!chrome.runtime?.id) return;
  chrome.runtime.sendMessage({ type: 'SHARE_SESSION', access_token, refresh_token });
});

// Skip everything on our own app. Also skip if running inside an iframe
// (iframes injected by tryRefreshRelatedProducts run the content script too,
// but they should only do silent extraction, not inject UI).
if (!isOwnApp()) {
  if (chrome.runtime?.id) {
    if (window.self !== window.top) {
      // Inside a hidden iframe — listen for CC_AUTOSAVE (from listing buttons / right-click
      // fallback) and also do the usual silent enrichment after 5s.
      let autosaveFired = false;
      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'CC_AUTOSAVE' || autosaveFired) return;
        autosaveFired = true;
        // Wait for the page JS to finish rendering price/specs before extracting
        window.setTimeout(() => {
          try {
            const product = extractProduct();
            chrome.runtime.sendMessage({ type: 'SAVE_PRODUCT', product });
          } catch { /* silent */ }
        }, 4000);
      });

      // Normal enrichment path (crowd-sourced freshness for everyone who saved this URL)
      window.setTimeout(() => {
        try {
          const product = extractProduct();
          if (product.price != null || Object.keys(product.specs).length > 0) {
            chrome.runtime.sendMessage({
              type: 'ENRICH_PRODUCT',
              url: window.location.href,
              price: product.price,
              currency: product.currency,
              specs: product.specs,
            });
          }
        } catch { /* silent */ }
      }, 5000);
    } else {
      // Normal top-level tab — inject button and run retries

      // Live-update button visibility when user toggles from popup
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[UI_PREFS_KEY]) return;
        const newPrefs = (changes[UI_PREFS_KEY].newValue as UiPrefs) ?? getDefaultPrefs();
        const btn = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
        const isHidden = newPrefs.hiddenDomains.includes(location.hostname);

        if (isHidden && btn) {
          btn.remove();
        } else if (!isHidden && !btn && isLikelyProductPage() && !isOwnApp()) {
          initPending = false;
          init();
        }

        // Position reset: if saveButtonPos cleared from popup, move button back to default corner
        if (!isHidden && btn && !newPrefs.saveButtonPos) {
          btn.style.top = '';
          btn.style.left = '';
          btn.style.bottom = '24px';
          btn.style.right = '24px';
        }
      });

      const startAfterLoad = () => {
        initWithRetry();
        // Delay the SPA-navigation observer by 3s to avoid React's initial
        // replaceState calls (URL normalization during hydration) being treated
        // as user navigations and removing the button before it's injected.
        window.setTimeout(() => {
          let lastUrl = location.href;
          const observer = new MutationObserver(() => {
            if (!chrome.runtime?.id) { observer.disconnect(); return; }
            if (location.href !== lastUrl) {
              lastUrl = location.href;
              document.getElementById(BUTTON_ID)?.remove();
              initPending = false;
              bestSizeForUrl = { url: '', size: '', count: 0 };
              window.setTimeout(init, 600);
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        }, 3000);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startAfterLoad);
      } else {
        startAfterLoad();
      }
    }
  }
}
