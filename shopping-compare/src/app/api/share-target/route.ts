// PWA Share Target handler.
// Android Chrome (and some iOS browsers) share a URL to this endpoint when the user
// taps "Share > CompareCart" in any browser. The manifest.json registers this route
// via the share_target field.
//
// Query params from the Web Share Target API:
//   ?url=https://...  — the shared URL (most browsers)
//   ?text=...         — the shared text (some Android browsers put the URL here)
//   ?title=...        — the page title (informational only)

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractProductFromHtml } from '@/lib/extract-product';
import { normalizeProductUrl } from '@/lib/normalize-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // The URL can arrive in either the `url` or `text` param depending on the browser
  const rawUrl = searchParams.get('url') || extractUrlFromText(searchParams.get('text') ?? '');

  if (!rawUrl) {
    return NextResponse.redirect(new URL('/dashboard?share=error&reason=no-url', request.url));
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch {
    return NextResponse.redirect(new URL('/dashboard?share=error&reason=invalid-url', request.url));
  }

  const url = normalizeProductUrl(rawUrl);

  // Check auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `/api/share-target?url=${encodeURIComponent(rawUrl)}`);
    return NextResponse.redirect(loginUrl);
  }

  // Check for an active row (valid_to IS NULL)
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_url', url)
    .is('valid_to', null)
    .maybeSingle();
  if (existing) return NextResponse.redirect(new URL('/dashboard?share=duplicate', request.url));

  // Fetch and extract the page
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
      return NextResponse.redirect(new URL('/dashboard?share=error&reason=blocked', request.url));
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return NextResponse.redirect(new URL('/dashboard?share=error&reason=fetch', request.url));
  }

  // Extract and save
  const product = extractProductFromHtml(html, url);
  if (!product.name || product.name === 'Unknown product') {
    return NextResponse.redirect(new URL('/dashboard?share=error&reason=extract', request.url));
  }

  const { error } = await supabase.from('products').insert({ user_id: user.id, ...product });
  if (error) {
    return NextResponse.redirect(new URL('/dashboard?share=error&reason=save', request.url));
  }

  return NextResponse.redirect(new URL('/dashboard?share=success', request.url));
}

// Some Android browsers pass the URL embedded in the text param, e.g. "Check this out: https://..."
function extractUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}
