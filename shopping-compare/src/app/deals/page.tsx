import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductCardPublic from '@/components/ProductCard-Public';
import type { SharedComparison, SharedProduct } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Price Drops & Deals | CompareCart',
  description: 'Products with recent price drops spotted by CompareCart shoppers. Updated daily.',
};

export default async function DealsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shared_comparisons')
    .select('products')
    .limit(200);

  const comparisons = (data ?? []) as Pick<SharedComparison, 'products'>[];

  // Collect products with price drops
  const drops: SharedProduct[] = [];
  const seen = new Set<string>();

  for (const c of comparisons) {
    for (const p of c.products) {
      if (
        p.previous_price != null &&
        p.price != null &&
        p.previous_price > p.price &&
        !seen.has(p.product_url)
      ) {
        seen.add(p.product_url);
        drops.push(p);
      }
    }
  }

  // Sort by biggest drop percentage
  drops.sort((a, b) => {
    const dropA = (a.previous_price! - a.price!) / a.previous_price!;
    const dropB = (b.previous_price! - b.price!) / b.previous_price!;
    return dropB - dropA;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <p className="text-xs tracking-[0.3em] uppercase text-terra mb-3">Updated daily</p>
      <h1 className="font-[var(--font-display)] italic text-4xl text-ink mb-2">Price drops</h1>
      <p className="text-muted mb-10">Products with recent price drops spotted by our community. Biggest drops first.</p>

      {drops.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-warm-border">
          <p className="text-muted">No price drops tracked yet.</p>
          <p className="text-xs text-muted mt-2">Price drops appear here when our daily tracker spots a change in shared comparisons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {drops.map((p, i) => (
            <ProductCardPublic key={i} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
