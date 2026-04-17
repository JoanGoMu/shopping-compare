// Called by the extension after using cached AI-generated rules.
// Tracks success/fail counts per domain. When failure rate is high,
// marks the rules as stale so the next visitor triggers regeneration.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

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

  let body: { domain: string; success: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { domain, success } = body;
  if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  const { data: row } = await supabase
    .from('store_extractors')
    .select('success_count, fail_count')
    .eq('domain', domain)
    .maybeSingle() as { data: { success_count: number; fail_count: number } | null };

  if (!row) return NextResponse.json({ ok: true });

  const newSuccess = (row.success_count ?? 0) + (success ? 1 : 0);
  const newFail = (row.fail_count ?? 0) + (success ? 0 : 1);

  // Mark stale if: 10+ failures AND failures outnumber successes 2:1
  const stale = newFail >= 10 && newFail > newSuccess * 2;

  await supabase.from('store_extractors').update({
    success_count: newSuccess,
    fail_count: newFail,
    ...(stale ? { status: 'stale' } : {}),
    updated_at: new Date().toISOString(),
  }).eq('domain', domain);

  return NextResponse.json({ ok: true, stale });
}
