// Called by the extension's context menu handler when the user right-clicks a product link.
// Fetches the page server-side, extracts product data, and saves it to the user's collection.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractProductFromHtml } from '@/lib/extract-product';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    url: string;
    product?: {
      name: string; price: number | null; currency: string;
      image_url: string | null; images?: string[];
      store_name: string; store_domain: string;
      specs: Record<string, string>;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { url: rawUrl } = body;
  if (!rawUrl || typeof rawUrl !== 'string') return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Normalize: Amazon → /dp/ASIN, others → strip query params
  const asin = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
  const url = asin && parsed.hostname.includes('amazon.')
    ? `${parsed.origin}/dp/${asin}`
    : parsed.origin + parsed.pathname.replace(/\/$/, '');

  const supabase = createAdminClient();

  // Check for existing row (active or soft-deleted)
  const { data: existing } = await supabase
    .from('products').select('id, deleted_at')
    .eq('user_id', user.id).eq('product_url', url).maybeSingle();
  if (existing) {
    if (!existing.deleted_at) return NextResponse.json({ ok: true, duplicate: true });
    // Restore soft-deleted row
    await supabase.from('products').update({ deleted_at: null, created_at: new Date().toISOString() }).eq('id', existing.id);
    return NextResponse.json({ ok: true });
  }

  // If the caller already extracted product data (e.g. from the content script),
  // skip the server-side fetch entirely and use the provided data directly.
  let product: { name: string; price: number | null; currency: string; image_url: string | null; images?: string[]; product_url: string; store_name: string; store_domain: string; specs: Record<string, string> };
  if (body.product) {
    product = { ...body.product, product_url: url };
  } else {
    // Fetch the page server-side
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CompareCartBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return NextResponse.json({ error: `Page returned ${res.status}` }, { status: 422 });
      html = await res.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'fetch failed';
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    product = extractProductFromHtml(html, url);
  }

  const { error } = await supabase.from('products').insert({
    user_id: user.id,
    name: product.name,
    price: product.price,
    currency: product.currency,
    image_url: product.image_url,
    images: product.images,
    product_url: url,
    store_name: product.store_name,
    store_domain: product.store_domain,
    specs: product.specs,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
