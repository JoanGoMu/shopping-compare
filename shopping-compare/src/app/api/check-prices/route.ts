// Vercel Cron Job: re-fetches saved product prices and records changes.
// Schedule: daily at 6am UTC (Hobby plan).
// Triggered by Vercel automatically with Authorization: Bearer <CRON_SECRET>.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
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

type PriceChange = { name: string; store_name: string; product_url: string; old_price: number; new_price: number; currency: string };

async function processBatch<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.allSettled(items.slice(i, i + batchSize).map(fn));
  }
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function buildEmail(changes: PriceChange[]): string {
  const rows = changes.map((c) => {
    const drop = c.new_price < c.old_price;
    const arrow = drop ? '↓' : '↑';
    const color = drop ? '#16a34a' : '#dc2626';
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ebe4;">
          <div style="font-size:14px;color:#1a1a1a;margin-bottom:4px;">${c.name}</div>
          <div style="font-size:12px;color:#888;">${c.store_name}</div>
        </td>
        <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f0ebe4;text-align:right;white-space:nowrap;">
          <span style="color:${color};font-weight:600;">${arrow} ${formatPrice(c.new_price, c.currency)}</span>
          <span style="color:#aaa;font-size:12px;text-decoration:line-through;margin-left:6px;">${formatPrice(c.old_price, c.currency)}</span>
        </td>
      </tr>`;
  }).join('');

  const drops = changes.filter((c) => c.new_price < c.old_price).length;
  const subject = drops === changes.length
    ? `${drops} price drop${drops > 1 ? 's' : ''} in your CompareCart collection`
    : `${changes.length} price change${changes.length > 1 ? 's' : ''} in your CompareCart collection`;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border:1px solid #e8e0d8;">
    <div style="padding:24px 32px;border-bottom:1px solid #f0ebe4;">
      <div style="font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">CompareCart</div>
      <div style="font-size:14px;color:#666;margin-top:4px;">${subject}</div>
    </div>
    <div style="padding:8px 32px 24px;">
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f0ebe4;text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopping-compare.vercel.app'}/dashboard"
         style="display:inline-block;background:#C4603C;color:#fff;text-decoration:none;padding:10px 24px;font-size:13px;font-weight:600;letter-spacing:0.05em;">
        VIEW COLLECTION
      </a>
      <div style="margin-top:12px;font-size:11px;color:#aaa;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopping-compare.vercel.app'}/dashboard"
           style="color:#aaa;">Manage price alert settings</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('id, user_id, product_url, price, currency, name, store_name, price_alerts')
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

  const changedProductIds = new Set<string>();
  // Collect price changes per user for batched email
  const changesByUser = new Map<string, PriceChange[]>();

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

      if (extracted.price == null || extracted.currency !== product.currency) {
        await supabase.from('products').update({ last_checked_at: now }).eq('id', product.id);
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
        changedProductIds.add(product.id);

        // Collect for email notification (only if per-product alerts enabled)
        if (product.price_alerts !== false) {
        const userChanges = changesByUser.get(product.user_id) ?? [];
        userChanges.push({
          name: product.name,
          store_name: product.store_name,
          product_url: product.product_url,
          old_price: product.price as number,
          new_price: extracted.price,
          currency: product.currency,
        });
        changesByUser.set(product.user_id, userChanges);
        }
      } else {
        await supabase.from('products').update({ last_checked_at: now, price_check_failed: false }).eq('id', product.id);
      }
    } catch {
      failed++;
      await supabase.from('products').update({ last_checked_at: now, price_check_failed: true }).eq('id', product.id);
    }
  });

  // Send email notifications
  if (changesByUser.size > 0 && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const [userId, changes] of changesByUser) {
      try {
        // Check user preferences
        const { data: prefs } = await supabase
          .from('user_preferences').select('price_alerts').eq('user_id', userId).maybeSingle();
        if (prefs?.price_alerts === false) continue;

        // Get user email from auth
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);
        if (!user?.email) continue;

        const drops = changes.filter((c) => c.new_price < c.old_price).length;
        const subject = drops === changes.length
          ? `${drops} price drop${drops > 1 ? 's' : ''} in your collection`
          : `${changes.length} price change${changes.length > 1 ? 's' : ''} in your collection`;

        await resend.emails.send({
          from: 'CompareCart <onboarding@resend.dev>',
          to: user.email,
          subject,
          html: buildEmail(changes),
        });
      } catch { /* silent - don't fail the cron if email fails */ }
    }
  }

  // Refresh public snapshots for any groups containing price-changed products
  if (changedProductIds.size > 0) {
    const { data: items } = await supabase
      .from('comparison_items')
      .select('group_id, product_id')
      .in('product_id', Array.from(changedProductIds));

    const groupIds = [...new Set((items ?? []).map((i) => i.group_id))];

    for (const groupId of groupIds) {
      const { data: share } = await supabase
        .from('shared_comparisons')
        .select('slug')
        .eq('group_id', groupId)
        .maybeSingle();

      if (!share) continue;

      const { data: groupItems } = await supabase
        .from('comparison_items')
        .select('product_id')
        .eq('group_id', groupId);

      const pIds = (groupItems ?? []).map((i) => i.product_id);
      if (!pIds.length) continue;

      const { data: prods } = await supabase
        .from('products')
        .select('name, price, currency, image_url, images, product_url, store_name, store_domain, specs, previous_price')
        .in('id', pIds);

      if (!prods?.length) continue;

      const snapshot = prods.map((p) => ({
        name: p.name, price: p.price, currency: p.currency,
        image_url: p.image_url, images: (p.images as string[]) ?? [],
        product_url: p.product_url, store_name: p.store_name,
        store_domain: p.store_domain, specs: p.specs, previous_price: p.previous_price,
      }));

      await supabase
        .from('shared_comparisons')
        .update({ products: snapshot, updated_at: new Date().toISOString() })
        .eq('slug', share.slug);
    }
  }

  return NextResponse.json({ checked, changed, failed });
}
