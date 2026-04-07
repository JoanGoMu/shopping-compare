// Vercel Cron Job: re-fetches saved product prices and records changes.
// Schedule: every 12h (Hobby plan: once/day max; Pro plan: every 12h).
// Triggered by Vercel automatically with Authorization: Bearer <CRON_SECRET>.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractProductFromHtml } from '@/lib/extract-product';


const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};
const BATCH_SIZE = 3;
const FETCH_TIMEOUT_MS = 5000;
const PRODUCT_LIMIT = 10;

async function processBatch<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.allSettled(items.slice(i, i + batchSize).map(fn));
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch the products most overdue for a check
  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_url, price, currency')
    .not('product_url', 'is', null)
    .not('price', 'is', null)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(PRODUCT_LIMIT);

  if (error || !products) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  let checked = 0;
  let changed = 0;
  let failed = 0;

  await processBatch(products, BATCH_SIZE, async (product) => {
    checked++;
    const now = new Date().toISOString();

    try {
      const res = await fetch(product.product_url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const extracted = extractProductFromHtml(html, product.product_url);

      // Skip if no price extracted or currency mismatch (likely extraction failure)
      if (extracted.price == null || extracted.currency !== product.currency) {
        await supabase.from('products').update({ last_checked_at: now, price_check_failed: true }).eq('id', product.id);
        return;
      }

      if (extracted.price !== product.price) {
        await supabase.from('products').update({
          previous_price: product.price,
          price: extracted.price,
          price_updated_at: now,
          last_checked_at: now,
          price_check_failed: false,
        }).eq('id', product.id);
        changed++;
      } else {
        await supabase.from('products').update({ last_checked_at: now, price_check_failed: false }).eq('id', product.id);
      }
    } catch {
      failed++;
      // Still update last_checked_at so this product doesn't block the queue
      await supabase.from('products').update({ last_checked_at: now, price_check_failed: true }).eq('id', product.id);
    }
  });

  return NextResponse.json({ checked, changed, failed });
}
