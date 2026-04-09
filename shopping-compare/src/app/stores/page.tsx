import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { SharedComparison } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Browse Stores | CompareCart',
  description: 'Browse products from all stores compared on CompareCart. Find the best deals across fashion, electronics, home and more.',
};

export default async function StoresPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shared_comparisons')
    .select('products')
    .limit(200);

  const comparisons = (data ?? []) as Pick<SharedComparison, 'products'>[];

  // Aggregate store data from all public products
  const storeMap = new Map<string, { name: string; domain: string; count: number; thumb: string | null }>();
  for (const c of comparisons) {
    for (const p of c.products) {
      const existing = storeMap.get(p.store_domain);
      if (existing) {
        existing.count++;
      } else {
        storeMap.set(p.store_domain, {
          name: p.store_name,
          domain: p.store_domain,
          count: 1,
          thumb: p.images?.[0] ?? p.image_url ?? null,
        });
      }
    }
  }

  const stores = [...storeMap.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <p className="text-xs tracking-[0.3em] uppercase text-terra mb-3">Shopping</p>
      <h1 className="font-[var(--font-display)] italic text-4xl text-ink mb-2">Browse by store</h1>
      <p className="text-muted mb-10">All stores featured in community comparisons, sorted by popularity.</p>

      {stores.length === 0 ? (
        <p className="text-muted text-center py-20">No stores yet. Share a comparison to get started.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Link
              key={store.domain}
              href={`/store/${encodeURIComponent(store.domain)}`}
              className="bg-surface border border-warm-border hover:border-terra transition-colors p-5 flex items-center gap-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${store.domain}&sz=32`}
                alt=""
                className="w-8 h-8"
              />
              <div>
                <p className="text-sm font-medium text-ink">{store.name}</p>
                <p className="text-xs text-muted">{store.count} product{store.count !== 1 ? 's' : ''} compared</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
