'use server';

import { createClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/nanoid';
import type { SharedProduct } from '@/lib/supabase/types';

export async function shareComparison(groupId: string): Promise<{ slug: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Check if already shared
  const { data: existing } = await supabase
    .from('shared_comparisons')
    .select('slug')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return { slug: existing.slug };

  // Load group + products
  type GroupRow = { name: string; comparison_items: { product_id: string }[] };
  const { data: groupRaw } = await supabase
    .from('comparison_groups')
    .select('name, comparison_items(product_id)')
    .eq('id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!groupRaw) return { error: 'Group not found' };

  const group = groupRaw as unknown as GroupRow;
  const productIds = group.comparison_items.map((i) => i.product_id);

  if (productIds.length < 2) return { error: 'Need at least 2 products' };

  const { data: rawProducts } = await supabase
    .from('products')
    .select('name, price, currency, image_url, images, product_url, store_name, store_domain, specs, previous_price')
    .in('id', productIds)
    .eq('user_id', user.id);

  if (!rawProducts?.length) return { error: 'No products found' };

  const products: SharedProduct[] = rawProducts.map((p) => ({
    name: p.name,
    price: p.price,
    currency: p.currency,
    image_url: p.image_url,
    images: (p.images as string[]) ?? [],
    product_url: p.product_url,
    store_name: p.store_name,
    store_domain: p.store_domain,
    specs: p.specs,
    previous_price: p.previous_price,
  }));

  const slug = generateSlug();

  const { error } = await supabase.from('shared_comparisons').insert({
    slug,
    user_id: user.id,
    group_id: groupId,
    title: group.name,
    products: products as unknown as import('@/lib/supabase/types').Json,
  });

  if (error) return { error: error.message };
  return { slug };
}

export async function unshareComparison(slug: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await supabase
    .from('shared_comparisons')
    .delete()
    .eq('slug', slug)
    .eq('user_id', user.id);

  return {};
}
