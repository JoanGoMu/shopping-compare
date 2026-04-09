import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductCardPublic from '@/components/ProductCard-Public';
import type { SharedComparison, SharedProduct } from '@/lib/supabase/types';
import { getAffiliateUrl } from '@/lib/affiliate';

interface Props {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const decoded = decodeURIComponent(domain);
  const storeName = decoded.replace(/\.[^.]+$/, '').replace(/^www\./, '');
  const title = `${storeName} products compared | CompareCart`;
  const description = `Browse products from ${storeName} compared side-by-side. Find the best price.`;
  return { title, description };
}

export default async function StorePage({ params }: Props) {
  const { domain } = await params;
  const decoded = decodeURIComponent(domain);

  const supabase = await createClient();
  const { data } = await supabase
    .from('shared_comparisons')
    .select('products, slug, title')
    .limit(200);

  const comparisons = (data ?? []) as (Pick<SharedComparison, 'products' | 'slug' | 'title'>)[];

  // Collect all products from this store across all shared comparisons
  type ProductWithComparison = SharedProduct & { comparisonSlug: string; comparisonTitle: string };
  const products: ProductWithComparison[] = [];
  const seen = new Set<string>();

  for (const c of comparisons) {
    for (const p of c.products) {
      const key = p.product_url;
      if (p.store_domain === decoded && !seen.has(key)) {
        seen.add(key);
        products.push({ ...p, comparisonSlug: c.slug, comparisonTitle: c.title });
      }
    }
  }

  if (products.length === 0) notFound();

  const storeName = products[0].store_name;
  const storeUrl = getAffiliateUrl(`https://${decoded}`, decoded);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://www.google.com/s2/favicons?domain=${decoded}&sz=32`} alt="" className="w-8 h-8" />
        <div>
          <h1 className="font-[var(--font-display)] italic text-3xl text-ink">{storeName}</h1>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-terra transition-colors">{decoded} →</a>
        </div>
      </div>
      <p className="text-muted mb-10">{products.length} product{products.length !== 1 ? 's' : ''} from {storeName} compared by our community.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p, i) => (
          <ProductCardPublic key={i} product={p} />
        ))}
      </div>
    </div>
  );
}
