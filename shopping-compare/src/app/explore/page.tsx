import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { SharedComparison } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Explore Product Comparisons | CompareCart',
  description: 'Browse side-by-side product comparisons shared by the CompareCart community. Find the best price across any store.',
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shared_comparisons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(48);

  const comparisons = (data ?? []) as SharedComparison[];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <p className="text-xs tracking-[0.3em] uppercase text-terra mb-3">Community</p>
      <h1 className="font-[var(--font-display)] italic text-4xl text-ink mb-2">Explore comparisons</h1>
      <p className="text-muted mb-10">Side-by-side product comparisons from shoppers like you.</p>

      {comparisons.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-warm-border">
          <p className="text-muted">No comparisons shared yet. Be the first!</p>
          <a href="/signup" className="mt-4 inline-block text-sm text-terra hover:underline">Create an account →</a>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((c) => {
            const thumbs = c.products.slice(0, 3).map((p) => p.images?.[0] ?? p.image_url).filter(Boolean);
            const stores = [...new Set(c.products.map((p) => p.store_name))].slice(0, 3).join(', ');
            return (
              <Link key={c.slug} href={`/c/${c.slug}`} className="bg-surface border border-warm-border hover:border-terra transition-colors p-4 flex flex-col gap-3">
                {/* Product thumbnails */}
                <div className="flex gap-1">
                  {thumbs.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src!} alt="" className="w-16 h-20 object-cover bg-cream" referrerPolicy="no-referrer" />
                  ))}
                  {thumbs.length === 0 && (
                    <div className="w-full h-20 bg-cream flex items-center justify-center text-2xl text-warm-border">◻</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink leading-snug">{c.title}</p>
                  <p className="text-xs text-muted mt-1">{c.products.length} products - {stores}</p>
                </div>
                <span className="text-xs text-terra tracking-wide uppercase">See comparison →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
