/**
 * Content script: injects the "Save to Compare" button on product pages.
 */

import { extractProduct, extractWithRules, applySpecTranslations, simplifyHtml, type StoreSelectorRules } from './extractor';

const BUTTON_ID = 'comparecart-save-btn';
const TOAST_ID = 'comparecart-toast';

// Track the best Size value seen per URL to prevent retries from
// overwriting a good extraction with a worse one (SPA DOM state flipping).
let bestSizeForUrl = { url: '', size: '', count: 0 };

// AI-generated selector rules for this domain, pre-fetched on page load.
let cachedAiRules: StoreSelectorRules | null = null;
// Prevent sending the same domain for generation more than once per page session.
let aiRulesRequested = false;

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

function createButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.textContent = '🛒 Save to Compare';
  btn.style.cssText = `
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #C4603C;
    color: white;
    border: none;
    border-radius: 100px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(196, 96, 60, 0.4);
    transition: all 0.15s ease;
    line-height: 1;
    white-space: nowrap;
    display: block;
  `;
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

  btn.textContent = 'Saving...';
  btn.style.opacity = '0.7';

  const product = extractProduct(cachedAiRules?.detected_currency);
  applyAiRules(product);

  function reset() {
    btn.textContent = '🛒 Save to Compare';
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

function init() {
  if (document.getElementById(BUTTON_ID)) return;
  if (isOwnApp()) return;
  if (!isLikelyProductPage()) return;
  const btn = createButton();
  btn.addEventListener('click', () => handleSave(btn));
  document.documentElement.appendChild(btn);
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
    cardSelector: '[class*="z-grid-item"], article[class*="Cat"]',
    linkSelector: 'a[href*="/"]',
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
};

const LISTING_BTN_CLASS = 'cc-listing-save-btn';

function getListingConfig(): ListingConfig | null {
  const host = window.location.hostname.replace(/^www\./, '');
  for (const [key, config] of Object.entries(LISTING_CONFIGS)) {
    if (host.includes(key)) return config;
  }
  return null;
}

function isListingPage(): boolean {
  // Must NOT be a product detail page
  if (isLikelyProductPage()) return false;
  const config = getListingConfig();
  if (!config) return false;
  return document.querySelectorAll(config.cardSelector).length >= 2;
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
      top: 6px;
      right: 6px;
      z-index: 100;
      width: 28px;
      height: 28px;
      background: rgba(196, 96, 60, 0.92);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: background 0.15s ease, transform 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;
    btn.textContent = '+';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#A84E30';
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(196, 96, 60, 0.92)';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!chrome.runtime?.id) return;

      btn.textContent = '...';
      btn.style.pointerEvents = 'none';

      const productUrl = link.href;
      chrome.runtime.sendMessage(
        { type: 'SAVE_FROM_LISTING', url: productUrl },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            btn.textContent = '+';
            btn.style.pointerEvents = 'auto';
            return;
          }
          if (response.duplicate) {
            btn.textContent = '✓';
            btn.style.background = '#6b7280';
          } else if (response.ok) {
            btn.textContent = '✓';
            btn.style.background = '#059669';
          } else {
            btn.textContent = '!';
            btn.style.background = '#dc2626';
            setTimeout(() => {
              btn.textContent = '+';
              btn.style.background = 'rgba(196, 96, 60, 0.92)';
              btn.style.pointerEvents = 'auto';
            }, 2000);
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

// Listen for CONTEXT_MENU_SAVE from background (user right-clicked "Save to CompareCart")
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'CONTEXT_MENU_SAVE') return;
  const fakeBtn = { textContent: '', style: { opacity: '' } } as unknown as HTMLButtonElement;
  handleSave(fakeBtn);
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
      // Inside a hidden iframe — extract and enrich silently, no UI
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
