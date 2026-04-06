/**
 * Content script: injects the "Save to Compare" button on product pages.
 * Communicates with the background service worker via chrome.runtime.sendMessage.
 */

import { extractProduct } from './extractor';

const BUTTON_ID = 'comparecart-save-btn';

function isLikelyProductPage(): boolean {
  // Quick heuristic: page has price-like content or product structured data
  const hasJsonLd = !!document.querySelector('script[type="application/ld+json"]');
  const hasOgProduct = !!document.querySelector('meta[property="og:type"][content="product"]');
  const hasPriceText = /\$[\d,]+\.?\d{0,2}|€[\d,]+\.?\d{0,2}|£[\d,]+/.test(document.body.innerText.slice(0, 5000));
  return hasJsonLd || hasOgProduct || hasPriceText;
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.textContent = '🛒 Save to Compare';
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 100px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
    transition: all 0.15s ease;
    line-height: 1;
    white-space: nowrap;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#4338ca';
    btn.style.transform = 'scale(1.03)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#4f46e5';
    btn.style.transform = 'scale(1)';
  });

  return btn;
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: ${type === 'success' ? '#059669' : '#dc2626'};
    color: white;
    border-radius: 12px;
    padding: 12px 18px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    animation: ccFadeIn 0.2s ease;
    max-width: 300px;
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes ccFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

async function handleSave(btn: HTMLButtonElement) {
  btn.textContent = 'Saving...';
  btn.style.opacity = '0.7';

  const product = extractProduct();

  function reset() {
    btn.textContent = '🛒 Save to Compare';
    btn.style.opacity = '1';
  }

  const timeout = setTimeout(() => {
    reset();
    showToast('Timed out - try again', 'error');
  }, 10000);

  try {
    chrome.runtime.sendMessage({ type: 'SAVE_PRODUCT', product }, (response) => {
      clearTimeout(timeout);
      reset();

      if (chrome.runtime.lastError) {
        // Service worker waking up - retry once after a short delay
        setTimeout(() => handleSave(btn), 1500);
        return;
      }

      if (!response?.ok) {
        const msg = response?.error ?? 'Unknown error';
        if (msg.includes('not logged in') || msg.includes('JWT')) {
          showToast('Sign in to CompareCart first', 'error');
        } else {
          showToast('Failed to save - ' + msg, 'error');
        }
      } else if (response?.duplicate) {
        showToast('Already saved!');
      } else {
        showToast('Saved to CompareCart!');
      }
    });
  } catch {
    clearTimeout(timeout);
    reset();
    showToast('Extension error - reload the page', 'error');
  }
}

function init() {
  if (document.getElementById(BUTTON_ID)) return;
  if (!isLikelyProductPage()) return;

  const btn = createButton();
  btn.addEventListener('click', () => handleSave(btn));
  document.body.appendChild(btn);
}

// Run after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-run on SPA navigation
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    document.getElementById(BUTTON_ID)?.remove();
    setTimeout(init, 500);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
