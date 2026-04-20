/**
 * Background service worker.
 * Handles communication between content script and Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeSpecs } from './normalize-specs';

const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
const APP_URL = '__APP_URL__';
const SESSION_KEY = 'comparecart_session';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// Restore session from our own storage key on every service worker startup
async function restoreSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const stored = result[SESSION_KEY];
  if (!stored) return null;
  try {
    const { access_token, refresh_token } = JSON.parse(stored);
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error || !data.session) {
      await chrome.storage.local.remove(SESSION_KEY);
      return null;
    }
    // Save refreshed tokens
    await chrome.storage.local.set({
      [SESSION_KEY]: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
    });
    return data.session.user;
  } catch {
    await chrome.storage.local.remove(SESSION_KEY);
    return null;
  }
}

async function getUser() {
  // Try in-memory session first (fast path when SW is still alive)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  // SW restarted - restore from our storage
  return restoreSession();
}


// ---------------------------------------------------------------------------
// Context menu: right-click "Save to CompareCart" on any page or link
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page-to-comparecart',
    title: 'Save to CompareCart',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-page-to-comparecart') return;

  // Use the link URL if right-clicked on a link, otherwise use the page URL
  const targetUrl = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!targetUrl) return;

  const user = await getUser();
  if (!user) {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TOAST', message: 'Sign in via the CompareCart extension popup first.', toastType: 'error' });
    }
    return;
  }

  // If on the current page, ask the content script to extract and save
  if (tab?.id && (!info.linkUrl || info.linkUrl === tab.url)) {
    chrome.tabs.sendMessage(tab.id, { type: 'CONTEXT_MENU_SAVE' });
    return;
  }

  // For a linked URL (different from current page): try server-side fetch first.
  // If the store blocks bots, fall back to a hidden iframe in the current tab
  // so the browser's real session/cookies handle the request.
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;
    const { access_token } = JSON.parse(stored[SESSION_KEY]);
    const res = await fetch(`${APP_URL}/api/save-from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ url: targetUrl }),
    });
    const data = await res.json() as { ok: boolean; duplicate?: boolean; error?: string };
    if (!data.ok && !data.duplicate && tab?.id) {
      // Server fetch blocked (bot protection) — fall back to browser-side iframe save
      chrome.tabs.sendMessage(tab.id, { type: 'SAVE_VIA_IFRAME', url: targetUrl });
      return;
    }
    if (tab?.id) {
      const msg = data.duplicate ? 'Already in your collection!' : 'Saved to CompareCart!';
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TOAST', message: msg });
    }
  } catch {
    // Network error or timeout — fall back to browser-side iframe save
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SAVE_VIA_IFRAME', url: targetUrl });
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = (message as { type: string }).type;

  if (type === 'SAVE_PRODUCT') {
    handleSaveProduct(message.product).then(sendResponse);
    return true;
  }

  if (type === 'GET_AUTH_STATUS') {
    getUser().then((user) => {
      sendResponse({ loggedIn: !!user, email: user?.email ?? null });
    });
    return true;
  }

  if (type === 'SIGN_IN') {
    supabase.auth.signInWithPassword({ email: message.email, password: message.password }).then(async ({ data, error }) => {
      if (error || !data.session) {
        sendResponse({ ok: false, error: error?.message ?? 'Sign in failed' });
      } else {
        // Save tokens to our own key so we can restore after SW restart
        await chrome.storage.local.set({
          [SESSION_KEY]: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });
        sendResponse({ ok: true, email: data.user?.email });
      }
    });
    return true;
  }

  if (type === 'SHARE_SESSION') {
    const { access_token, refresh_token } = message as { access_token: string; refresh_token: string };
    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
      if (error || !data.session) { sendResponse({ ok: false }); return; }
      await chrome.storage.local.set({
        [SESSION_KEY]: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (type === 'SIGN_OUT') {
    supabase.auth.signOut({ scope: 'local' }).then(async () => {
      await chrome.storage.local.remove(SESSION_KEY);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (type === 'UPDATE_PRICE_IF_SAVED') {
    // Fire-and-forget: silently update price + specs if this URL is already saved
    handleUpdatePriceIfSaved(message.url, message.price, message.currency, message.specs);
    return false;
  }

  if (type === 'GET_PRODUCTS_BY_DOMAIN') {
    // Returns saved products from this domain that have no specs yet
    handleGetProductsByDomain(message.domain).then(sendResponse);
    return true;
  }

  if (type === 'UPDATE_SPECS_FOR_URL') {
    // Fire-and-forget: save specs extracted by content script for a related product
    handleUpdateSpecsForUrl(message.url, message.specs);
    return false;
  }

  if (type === 'ENRICH_PRODUCT') {
    // Fire-and-forget: call server to update ALL users' records for this URL
    handleEnrichProduct(message.url, message.price ?? null, message.currency ?? null, message.specs ?? {});
    return false;
  }

  if (type === 'GET_RELATED_URLS') {
    // content.ts asks for saved product URLs from this domain to inject as iframes
    handleGetRelatedUrls(message.domain, message.currentUrl).then(sendResponse);
    return true;
  }

  if (type === 'GET_STORE_RULES') {
    // Returns cached AI-generated CSS selector rules for a domain (24h TTL)
    handleGetStoreRules(message.domain).then(sendResponse);
    return true;
  }

  if (type === 'REQUEST_EXTRACTOR_GENERATION') {
    // Sends simplified HTML to the server to generate and cache selector rules
    handleRequestExtractorGeneration(message.domain, message.url, message.html, message.productName).then(sendResponse);
    return true;
  }

  if (type === 'REPORT_EXTRACTION_RESULT') {
    // Fire-and-forget: tells the server whether the AI rules worked on this page
    handleReportExtractionResult(message.domain, message.success);
    return false;
  }

  if (type === 'SAVE_FROM_LISTING') {
    // Save a product from a listing page via server-side fetch + extraction
    handleSaveFromListing(message.url).then(sendResponse);
    return true;
  }

});

// Normalize product URL: Amazon → /dp/ASIN, others → strip query params + trailing slash.
// Applied consistently at save and lookup to ensure URL matching works regardless of tracking params.
function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const asin = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
    if (asin && parsed.hostname.includes('amazon.')) {
      return `${parsed.origin}/dp/${asin}`;
    }
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch { return url; }
}

async function handleUpdatePriceIfSaved(url: string, price: number, currency: string, specs?: Record<string, string>) {
  try {
    // Skip if no stored session to avoid GoTrue making fetch calls that log errors
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;

    const user = await getUser();
    if (!user) return;

    const normalizedUrl = normalizeProductUrl(url);
    const { data: existing } = await supabase
      .from('products').select('id, price, currency, specs')
      .eq('user_id', user.id).eq('product_url', normalizedUrl).is('deleted_at', null).maybeSingle();

    if (!existing) return;
    // Skip currency mismatch only when product already has a price —
    // if price was null the stored currency was a default guess, so update both.
    if (existing.price !== null && existing.currency !== currency) return;

    url = normalizedUrl;
    const now = new Date().toISOString();

    const currentSpecs = (existing.specs ?? {}) as Record<string, string>;
    const mergedSpecs = specs && Object.keys(specs).length > 0
      ? mergeSpecsSafe(currentSpecs, specs)
      : null;
    const specsUpdate = mergedSpecs ? { specs: mergedSpecs } : {};

    if (existing.price === price && existing.currency === currency) {
      await supabase.from('products').update({ price_check_failed: false, last_checked_at: now, ...specsUpdate }).eq('id', existing.id);
      return;
    }

    await supabase.from('products').update({
      previous_price: existing.price,
      price,
      currency,
      price_updated_at: now,
      last_checked_at: now,
      price_check_failed: false,
      ...specsUpdate,
    }).eq('id', existing.id);
  } catch { /* silent - background price sync is best-effort */ }
}

async function handleSaveProduct(product: {
  name: string; price: number | null; currency: string;
  image_url: string | null; product_url: string;
  store_name: string; store_domain: string; specs: Record<string, string>;
}) {
  const user = await getUser();
  if (!user) return { ok: false, error: 'not logged in' };

  product.product_url = normalizeProductUrl(product.product_url);

  const { data: existing } = await supabase
    .from('products').select('id, deleted_at')
    .eq('user_id', user.id).eq('product_url', product.product_url).maybeSingle();
  if (existing) {
    if (!existing.deleted_at) return { ok: true, duplicate: true };
    // Restore soft-deleted row with fresh data
    const { error } = await supabase.from('products').update({
      ...product, deleted_at: null, created_at: new Date().toISOString(),
    }).eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from('products').insert({
    user_id: user.id, ...product,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Merges fresh specs over existing, but never downgrades Size from a valid full list to fewer options.
// Also validates Size values against SIZE_VAL — if the stored value is garbage (e.g. payment methods
// captured by a previous buggy extraction), it gets replaced by any valid fresh value.
const MERGE_SIZE_VAL = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/i;
function mergeSpecsSafe(current: Record<string, string>, fresh: Record<string, string>): Record<string, string> {
  const merged = { ...current, ...fresh };
  const curSize = current['Size'] ?? '';
  const freshSize = fresh['Size'] ?? '';
  if (curSize && freshSize) {
    const curTokens = curSize.split(',').map(s => s.trim()).filter(Boolean);
    const freshTokens = freshSize.split(',').map(s => s.trim()).filter(Boolean);
    const curValid = curTokens.every(t => MERGE_SIZE_VAL.test(t));
    const freshValid = freshTokens.every(t => MERGE_SIZE_VAL.test(t));
    // Keep current only if it's valid AND has more options than fresh
    if (curValid && curTokens.length > freshTokens.length) {
      merged['Size'] = curSize;
    } else if (!freshValid && curValid) {
      merged['Size'] = curSize; // fresh is garbage, keep current
    }
    // Otherwise fresh wins (default from spread above)
  }
  return merged;
}

// Returns URLs of saved products from a given domain so the extension can
// re-extract specs using the browser's cookies (works even for bot-protected stores)
async function handleGetProductsByDomain(domain: string): Promise<{ url: string }[]> {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return [];
    const user = await getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('products')
      .select('product_url')
      .eq('user_id', user.id)
      .eq('store_domain', domain)
      .is('deleted_at', null);
    return (data ?? []).map((p) => ({ url: p.product_url }));
  } catch { return []; }
}

// Calls the server to update ALL users' products for this URL (crowd-sourced enrichment).
// Requires a valid session - the server verifies the JWT before writing.
async function handleEnrichProduct(url: string, price: number | null, currency: string | null, specs: Record<string, string>) {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;
    const { access_token } = JSON.parse(stored[SESSION_KEY]);
    if (!access_token) return;
    await fetch(`${APP_URL}/api/enrich-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ url: normalizeProductUrl(url), price, currency, specs }),
    });
  } catch { /* silent */ }
}

// Updates specs for a product URL the user didn't visit directly.
// Merges over existing specs so fresher data wins without losing previously captured fields.
async function handleUpdateSpecsForUrl(url: string, specs: Record<string, string>) {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;
    const user = await getUser();
    if (!user) return;
    const normalized = normalizeSpecs(specs);
    if (!Object.keys(normalized).length) return;
    // Fetch current specs to merge with
    const { data: existing } = await supabase.from('products')
      .select('specs')
      .eq('user_id', user.id)
      .eq('product_url', url)
      .maybeSingle();
    const currentSpecs = (existing?.specs ?? {}) as Record<string, string>;
    const merged = mergeSpecsSafe(currentSpecs, normalized);
    await supabase.from('products')
      .update({ specs: merged, last_checked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('product_url', url);
  } catch { /* silent */ }
}

// Debounce: only return URLs once per hour per domain
const lastDomainRefresh = new Map<string, number>();
const BG_REFRESH_COOLDOWN = 60 * 60 * 1000;
const BG_MAX_PRODUCTS = 5;

// ---------------------------------------------------------------------------
// AI-generated extractor rule handlers
// ---------------------------------------------------------------------------

const RULES_CACHE_KEY_PREFIX = 'store_rules_';
const RULES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedRules {
  rules: object;
  timestamp: number;
}

// Returns AI-generated selector rules for a domain from local cache (24h TTL).
// Cache miss returns null — the caller should then invoke REQUEST_EXTRACTOR_GENERATION.
async function handleGetStoreRules(domain: string): Promise<{ rules: object | null }> {
  try {
    const key = RULES_CACHE_KEY_PREFIX + domain;
    const stored = await chrome.storage.local.get(key);
    const entry: CachedRules | undefined = stored[key];
    if (entry && Date.now() - entry.timestamp < RULES_CACHE_TTL) {
      return { rules: entry.rules };
    }
    return { rules: null };
  } catch { return { rules: null }; }
}

// Calls the server to generate CSS selector rules for this domain.
// On success, caches the rules locally and returns them.
async function handleRequestExtractorGeneration(
  domain: string,
  url: string,
  html: string,
  productName?: string,
): Promise<{ rules: object | null }> {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return { rules: null };
    const { access_token } = JSON.parse(stored[SESSION_KEY]);
    if (!access_token) return { rules: null };

    const res = await fetch(`${APP_URL}/api/generate-extractor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ domain, url, html, productName }),
    });

    if (!res.ok) return { rules: null };
    const data = await res.json() as { ok: boolean; rules?: object };
    if (!data.ok || !data.rules) return { rules: null };

    // Cache locally with timestamp
    const key = RULES_CACHE_KEY_PREFIX + domain;
    await chrome.storage.local.set({ [key]: { rules: data.rules, timestamp: Date.now() } as CachedRules });

    return { rules: data.rules };
  } catch { return { rules: null }; }
}

// Saves a product from a listing page by calling the server to fetch + extract the product page.
async function handleSaveFromListing(url: string): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return { ok: false, error: 'not logged in' };
    const { access_token } = JSON.parse(stored[SESSION_KEY]);
    if (!access_token) return { ok: false, error: 'not logged in' };

    const res = await fetch(`${APP_URL}/api/save-from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ url: normalizeProductUrl(url) }),
    });
    if (!res.ok) return { ok: false, error: `Server error ${res.status}` };
    return await res.json() as { ok: boolean; duplicate?: boolean; error?: string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

// Reports whether the AI-generated rules worked for a given domain.
// The server uses this to detect stale rules that need regeneration.
async function handleReportExtractionResult(domain: string, success: boolean): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;
    const { access_token } = JSON.parse(stored[SESSION_KEY]);
    if (!access_token) return;
    await fetch(`${APP_URL}/api/report-extractor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ domain, success }),
    });
  } catch { /* silent */ }
}

// Returns saved product URLs from the same domain so content.ts can inject them
// as hidden iframes — completely invisible, uses real browser session/cookies.
async function handleGetRelatedUrls(domain: string, currentUrl: string): Promise<{ urls: string[] }> {
  try {
    const last = lastDomainRefresh.get(domain) ?? 0;
    if (Date.now() - last < BG_REFRESH_COOLDOWN) return { urls: [] };

    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return { urls: [] };
    const user = await getUser();
    if (!user) return { urls: [] };

    const { data } = await supabase
      .from('products')
      .select('product_url')
      .eq('user_id', user.id)
      .eq('store_domain', domain)
      .is('deleted_at', null);

    const urls = (data ?? [])
      .map(p => p.product_url as string)
      .filter(u => u && u !== currentUrl)
      .slice(0, BG_MAX_PRODUCTS);

    if (urls.length) lastDomainRefresh.set(domain, Date.now());
    return { urls };
  } catch { return { urls: [] }; }
}
