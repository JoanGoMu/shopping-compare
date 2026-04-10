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
    supabase.auth.signOut().then(async () => {
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
});

async function handleUpdatePriceIfSaved(url: string, price: number, currency: string, specs?: Record<string, string>) {
  try {
    // Skip if no stored session to avoid GoTrue making fetch calls that log errors
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;

    const user = await getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('products').select('id, price, currency, specs')
      .eq('user_id', user.id).eq('product_url', url).maybeSingle();

    if (!existing) return;
    // Skip currency mismatch only when product already has a price —
    // if price was null the stored currency was a default guess, so update both.
    if (existing.price !== null && existing.currency !== currency) return;

    const now = new Date().toISOString();

    // Merge fresh specs over existing — new data wins, existing keys not in new extraction are preserved
    const currentSpecs = (existing.specs ?? {}) as Record<string, string>;
    const mergedSpecs = specs && Object.keys(specs).length > 0
      ? { ...currentSpecs, ...specs }
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

  const { data: existing } = await supabase
    .from('products').select('id')
    .eq('user_id', user.id).eq('product_url', product.product_url).maybeSingle();
  if (existing) return { ok: true, duplicate: true };

  const { error } = await supabase.from('products').insert({
    user_id: user.id, ...product,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Returns URLs of saved products from a given domain that have no specs yet
async function handleGetProductsByDomain(domain: string): Promise<{ url: string }[]> {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return [];
    const user = await getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('products')
      .select('product_url, specs')
      .eq('user_id', user.id)
      .eq('store_domain', domain);
    return (data ?? [])
      .filter((p) => !p.specs || Object.keys(p.specs as object).length === 0)
      .map((p) => ({ url: p.product_url }));
  } catch { return []; }
}

// Saves specs (extracted by content script) for a product URL the user didn't visit directly
async function handleUpdateSpecsForUrl(url: string, specs: Record<string, string>) {
  try {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (!stored[SESSION_KEY]) return;
    const user = await getUser();
    if (!user) return;
    const normalized = normalizeSpecs(specs);
    if (!Object.keys(normalized).length) return;
    await supabase.from('products')
      .update({ specs: normalized, last_checked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('product_url', url);
  } catch { /* silent */ }
}
