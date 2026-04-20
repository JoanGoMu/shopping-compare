'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractProductFromHtml } from '@/lib/extract-product';

export async function recordReferral(referrerId: string): Promise<void> {
  if (!referrerId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === referrerId) return;
  const admin = createAdminClient();
  // Ignore duplicate errors - each user can only be referred once
  await admin.from('referrals').insert({ referrer_id: referrerId, referred_id: user.id });
}

export async function togglePriceAlerts(enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_preferences').upsert({ user_id: user.id, price_alerts: enabled });
  revalidatePath('/dashboard');
}

export async function addProductByUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch {
    return { ok: false, error: 'Please enter a valid URL' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Check for existing row (active or soft-deleted)
  const { data: existing } = await supabase
    .from('products')
    .select('id, deleted_at')
    .eq('user_id', user.id)
    .eq('product_url', url)
    .maybeSingle();
  if (existing) {
    if (!existing.deleted_at) return { ok: false, error: 'This product is already in your collection' };
    // Restore soft-deleted row
    await supabase.from('products').update({ deleted_at: null, created_at: new Date().toISOString() }).eq('id', existing.id);
    revalidatePath('/dashboard');
    return { ok: true };
  }

  // Fetch the page
  let html: string;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    if (res.status === 403 || res.status === 429 || res.status === 401) {
      return { ok: false, error: 'This site blocks automated access. Visit the product page in Chrome and use the extension button instead.' };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return { ok: false, error: 'Could not reach that page. Visit it in Chrome and use the extension button to save it.' };
  }

  // Extract product data
  const product = extractProductFromHtml(html, url);
  if (!product.name || product.name === 'Unknown product') {
    return { ok: false, error: 'Could not read product details from that page - the site may require a browser. Try the extension button instead.' };
  }

  // Insert
  const { error } = await supabase.from('products').insert({ user_id: user.id, ...product });
  if (error) return { ok: false, error: 'Failed to save product' };

  revalidatePath('/dashboard');
  return { ok: true };
}
