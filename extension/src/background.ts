/**
 * Background service worker.
 * Handles communication between content script and Supabase.
 */

import { createClient } from '@supabase/supabase-js';

// These are injected at build time by the config
const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
const APP_URL = '__APP_URL__';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      // Use chrome.storage.local for session persistence in extensions
      async getItem(key: string) {
        return new Promise((resolve) => {
          chrome.storage.local.get(key, (result) => resolve(result[key] ?? null));
        });
      },
      async setItem(key: string, value: string) {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set({ [key]: value }, resolve);
        });
      },
      async removeItem(key: string) {
        return new Promise<void>((resolve) => {
          chrome.storage.local.remove(key, resolve);
        });
      },
    },
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

interface SaveProductMessage {
  type: 'SAVE_PRODUCT';
  product: {
    name: string;
    price: number | null;
    currency: string;
    image_url: string | null;
    product_url: string;
    store_name: string;
    store_domain: string;
    specs: Record<string, string>;
  };
}

interface GetAuthStatusMessage {
  type: 'GET_AUTH_STATUS';
}

interface SignInMessage {
  type: 'SIGN_IN';
  email: string;
  password: string;
}

type Message = SaveProductMessage | GetAuthStatusMessage | SignInMessage;

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'SAVE_PRODUCT') {
    handleSaveProduct(message.product).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_AUTH_STATUS') {
    getRestoredUser().then((user) => {
      sendResponse({ loggedIn: !!user, email: user?.email ?? null });
    });
    return true;
  }

  if (message.type === 'SIGN_IN') {
    supabase.auth.signInWithPassword({ email: message.email, password: message.password }).then(({ data, error }) => {
      if (error) sendResponse({ ok: false, error: error.message });
      else sendResponse({ ok: true, email: data.user?.email });
    });
    return true;
  }

  if ((message as { type: string }).type === 'SIGN_OUT') {
    supabase.auth.signOut().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function getRestoredUser() {
  // Service workers can go to sleep between pages. When they wake up,
  // getUser() fires before the session is restored from chrome.storage.local.
  // Call getSession() first to force session restoration, then verify with server.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function handleSaveProduct(product: SaveProductMessage['product']) {
  const user = await getRestoredUser();

  if (!user) {
    return { ok: false, error: 'not logged in' };
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_url', product.product_url)
    .maybeSingle();

  if (existing) {
    return { ok: true, duplicate: true };
  }

  const { error } = await supabase.from('products').insert({
    user_id: user.id,
    name: product.name,
    price: product.price,
    currency: product.currency,
    image_url: product.image_url,
    product_url: product.product_url,
    store_name: product.store_name,
    store_domain: product.store_domain,
    specs: product.specs,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// Open app when extension icon is clicked and user is not logged in
chrome.action.onClicked.addListener(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    chrome.tabs.create({ url: `${APP_URL}/login` });
  }
});
