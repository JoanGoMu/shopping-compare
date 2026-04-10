// Called by the extension whenever a user visits a product page.
// Updates specs and price for ALL users who have saved that URL — crowd-sourced freshness.
// Bot-protected stores (Zara, Zalando, TNF) can't be fetched server-side, so this is the
// only reliable way other users' records stay up to date for those stores.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSpecs } from '@/lib/normalize-specs';
import { buildPriceEmail, type PriceChange } from '@/lib/price-email';

export async function POST(request: NextRequest) {
  // Verify caller is an authenticated user via their Supabase access token
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user: caller } } = await authClient.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { url: string; price: number | null; currency: string; specs: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { url, price, currency, specs } = body;
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find ALL users' products saved with this URL
  const { data: products } = await supabase
    .from('products')
    .select('id, user_id, price, currency, name, store_name, price_alerts, specs')
    .eq('product_url', url);

  if (!products?.length) return NextResponse.json({ ok: true, updated: 0 });

  const normalizedSpecs = normalizeSpecs(specs ?? {});

  // Merges fresh specs but validates Size values — garbage data (e.g. payment methods) is
  // replaced by any valid fresh value; valid full lists are never downgraded to fewer options.
  const SIZE_VAL_RE = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/i;
  function mergeSpecsSafe(current: Record<string, string>, fresh: Record<string, string>): Record<string, string> {
    const merged = { ...current, ...fresh };
    const curSize = current['Size'] ?? '';
    const freshSize = fresh['Size'] ?? '';
    if (curSize && freshSize) {
      const curTokens = curSize.split(',').map(s => s.trim()).filter(Boolean);
      const freshTokens = freshSize.split(',').map(s => s.trim()).filter(Boolean);
      const curValid = curTokens.every(t => SIZE_VAL_RE.test(t));
      const freshValid = freshTokens.every(t => SIZE_VAL_RE.test(t));
      if (curValid && curTokens.length > freshTokens.length) {
        merged['Size'] = curSize;
      } else if (!freshValid && curValid) {
        merged['Size'] = curSize;
      }
    }
    return merged;
  }
  const changesByUser = new Map<string, PriceChange[]>();
  let updated = 0;

  for (const product of products) {
    const currentSpecs = (product.specs ?? {}) as Record<string, string>;
    const mergedSpecs = Object.keys(normalizedSpecs).length > 0
      ? mergeSpecsSafe(currentSpecs, normalizedSpecs)
      : currentSpecs;

    const update: Record<string, unknown> = {
      specs: mergedSpecs,
      last_checked_at: now,
      price_check_failed: false,
    };

    // Update price only when currency matches and price actually changed
    if (price != null && product.currency === currency) {
      if (product.price !== price) {
        update.previous_price = product.price;
        update.price = price;
        update.price_updated_at = now;

        // Queue email for users with price alerts (including the caller — they want to know too)
        if (product.price_alerts !== false && product.price != null) {
          const userChanges = changesByUser.get(product.user_id) ?? [];
          userChanges.push({
            name: product.name,
            store_name: product.store_name,
            product_url: url,
            old_price: product.price as number,
            new_price: price,
            currency,
          });
          changesByUser.set(product.user_id, userChanges);
        }
      } else {
        update.price = price;
      }
    }

    await supabase.from('products').update(update).eq('id', product.id);
    updated++;
  }

  // Send email notifications for price changes
  if (changesByUser.size > 0 && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const [userId, changes] of changesByUser) {
      try {
        const { data: prefs } = await supabase
          .from('user_preferences').select('price_alerts').eq('user_id', userId).maybeSingle();
        if (prefs?.price_alerts === false) continue;

        const { data: { user: alertUser } } = await supabase.auth.admin.getUserById(userId);
        if (!alertUser?.email) continue;

        const { subject, html } = buildPriceEmail(changes);
        await resend.emails.send({
          from: 'CompareCart <onboarding@resend.dev>',
          to: alertUser.email,
          subject,
          html,
        });
      } catch { /* silent - don't fail the request if email fails */ }
    }
  }

  return NextResponse.json({ ok: true, updated });
}
