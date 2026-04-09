import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { SharedComparison } from '@/lib/supabase/types';

const BASE_URL = 'https://comparecart.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('shared_comparisons')
    .select('slug, products, created_at, updated_at')
    .order('created_at', { ascending: false });

  const comparisons = (data ?? []) as Pick<SharedComparison, 'slug' | 'products' | 'created_at' | 'updated_at'>[];

  // Comparison pages
  const comparisonEntries: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${BASE_URL}/c/${c.slug}`,
    lastModified: c.updated_at ?? c.created_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Store pages - collect unique domains
  const domains = new Set<string>();
  for (const c of comparisons) {
    for (const p of c.products) {
      if (p.store_domain) domains.add(p.store_domain);
    }
  }
  const storeEntries: MetadataRoute.Sitemap = [...domains].map((domain) => ({
    url: `${BASE_URL}/store/${encodeURIComponent(domain)}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/stores`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/deals`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/signup`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  return [...staticEntries, ...comparisonEntries, ...storeEntries];
}
