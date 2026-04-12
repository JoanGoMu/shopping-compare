/**
 * Content script: injects the "Save to Compare" button on product pages.
 */

import { extractProduct } from './extractor';

const BUTTON_ID = 'comparecart-save-btn';
const TOAST_ID = 'comparecart-toast';

// Track the best Size value seen per URL to prevent retries from
// overwriting a good extraction with a worse one (SPA DOM state flipping).
let bestSizeForUrl = { url: '', size: '', count: 0 };

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

// Skip everything on our own app
if (!isOwnApp()) {
  if (chrome.runtime?.id) {
    // Start init + SPA observer together after initial parse is done.
    // The observer must NOT start at document_start: pages like Zara call
    // replaceState during React hydration, which would look like a navigation
    // and remove the button before it was ever injected.
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
