import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Records a price snapshot. Called whenever a price change is detected
 * (both cron and enrich-product). Uses upsert-like logic: only inserts
 * if no snapshot exists within the last 12 hours for the same URL+price
 * (prevents duplicates from rapid revisits).
 */
export async function recordPriceHistory(
  supabase: SupabaseClient,
  product_url: string,
  price: number,
  currency: string,
) {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('price_history')
    .select('id')
    .eq('product_url', product_url)
    .eq('price', price)
    .gte('recorded_at', twelveHoursAgo)
    .maybeSingle();

  if (!recent) {
    await supabase.from('price_history').insert({
      product_url,
      price,
      currency,
      recorded_at: new Date().toISOString(),
    });
  }
}
