/**
 * Content script: injects the "Save to Compare" button on product pages.
 */

import { extractProduct } from './extractor';

const BUTTON_ID = 'comparecart-save-btn';
const TOAST_ID = 'comparecart-toast';

function isOwnApp(): boolean {
  try { return window.location.origin === new URL(APP_URL).origin; } catch { return false; }
}

function isLikelyProductPage(): boolean {
  const hasJsonLd = !!document.querySelector('script[type="application/ld+json"]');
  const hasOgProduct = !!document.querySelector('meta[property="og:type"][content="product"]');
  return hasJsonLd || hasOgProduct;
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

  const product = extractProduct();

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
    const product = extractProduct();
    if (product.price == null && Object.keys(product.specs ?? {}).length === 0) return;
    chrome.runtime.sendMessage({
      type: 'UPDATE_PRICE_IF_SAVED',
      url: product.product_url,
      price: product.price,
      currency: product.currency,
      specs: product.specs,
    });
  } catch { /* silent */ }
}

// Extracts JSON-LD specs from raw HTML text using DOMParser (no DOM access needed)
function extractSpecsFromHtml(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent ?? '');
        const rawItems = Array.isArray(data) ? data : [data];
        const items: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
        for (const raw of rawItems) {
          if (raw?.['@graph'] && Array.isArray(raw['@graph'])) items.push(...raw['@graph']);
          else items.push(raw);
        }
        for (const item of items) {
          const type = item?.['@type'];
          if (!type) continue;
          const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
          const isGroup = type === 'ProductGroup';
          if (!isProduct && !isGroup) continue;
          // additionalProperty at group and/or variant level
          const nodes = [item, ...(isGroup && Array.isArray(item.hasVariant) ? [item.hasVariant[0]] : [])];
          for (const node of nodes) {
            if (!node) continue;
            if (Array.isArray(node.additionalProperty)) {
              for (const p of node.additionalProperty) {
                if (typeof p.name === 'string' && typeof p.value === 'string') specs[p.name] = p.value;
              }
            }
            for (const field of ['material', 'color', 'size'] as const) {
              if (typeof node[field] === 'string' && node[field]) specs[field] = node[field];
            }
            const brand = node.brand;
            if (typeof brand === 'string' && brand) specs['brand'] = brand;
            else if (typeof brand?.name === 'string' && brand.name) specs['brand'] = brand.name;
          }
        }
      } catch { /* skip malformed */ }
    });
  } catch { /* silent */ }
  return specs;
}

// After visiting one page, silently fetch & update other saved products from the same store
async function tryUpdateRelatedProducts() {
  if (!chrome.runtime?.id) return;
  if (isOwnApp()) return;
  try {
    const domain = window.location.hostname.replace('www.', '');
    chrome.runtime.sendMessage({ type: 'GET_PRODUCTS_BY_DOMAIN', domain }, async (products: { url: string }[]) => {
      if (!products?.length) return;
      for (const { url } of products.slice(0, 5)) {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) continue;
          const html = await res.text();
          const specs = extractSpecsFromHtml(html);
          if (Object.keys(specs).length > 0) {
            chrome.runtime.sendMessage({ type: 'UPDATE_SPECS_FOR_URL', url, specs });
          }
        } catch { /* silent */ }
        // Small pause between requests to avoid hammering the store
        await new Promise((r) => setTimeout(r, 1500));
      }
    });
  } catch { /* silent */ }
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
  // After the page has settled, also silently refresh other products from the same store
  window.setTimeout(() => tryUpdateRelatedProducts(), 10000);
}

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

// Skip button injection and observer on our own app
if (!isOwnApp()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWithRetry);
  } else {
    initWithRetry();
  }

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (!chrome.runtime?.id) { observer.disconnect(); return; }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById(BUTTON_ID)?.remove();
      window.setTimeout(init, 600);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
