import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PublicCompareTable from '@/components/PublicCompareTable';
import type { SharedComparison } from '@/lib/supabase/types';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getComparison(slug: string): Promise<SharedComparison | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shared_comparisons')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as SharedComparison | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comparison = await getComparison(slug);
  if (!comparison) return { title: 'Comparison not found' };

  const stores = [...new Set(comparison.products.map((p) => p.store_name))].join(', ');
  const title = `${comparison.title} | CompareCart`;
  const description = `Compare ${comparison.products.length} products across ${stores}. Find the best price.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SharedComparisonPage({ params }: Props) {
  const { slug } = await params;
  const comparison = await getComparison(slug);
  if (!comparison) notFound();

  // Increment view count (fire and forget)
  const supabase = await createClient();
  supabase
    .from('shared_comparisons')
    .update({ view_count: comparison.view_count + 1 })
    .eq('slug', slug)
    .then(() => {});

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <PublicCompareTable
        products={comparison.products}
        updatedAt={comparison.updated_at}
      />
    </div>
  );
}
