import { createClient } from '@/lib/supabase/server';
import CompareTable from '@/components/CompareTable';
import GroupList from '@/components/GroupList';
import Link from 'next/link';
import { shareComparison } from './actions';

interface Props {
  searchParams: Promise<{ ids?: string; group?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids, group: groupId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load all groups for the sidebar
  const { data: rawGroups } = await supabase
    .from('comparison_groups')
    .select('*, comparison_items(product_id)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  type GroupWithItems = { id: string; user_id: string; name: string; created_at: string; comparison_items: { product_id: string }[] };
  const groups = (rawGroups ?? []) as GroupWithItems[];

  // Load full collection for "add more" picker
  const { data: allProductsData } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });
  const allProducts = allProductsData ?? [];

  // Determine which products to compare
  let productIds: string[] = [];

  if (groupId) {
    const group = groups?.find((g) => g.id === groupId);
    if (group) productIds = group.comparison_items.map((i: { product_id: string }) => i.product_id);
  } else if (ids) {
    productIds = ids.split(',').filter(Boolean);
  }

  let products = null;
  let existingShareSlug: string | undefined;

  if (productIds.length >= 2) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('user_id', user!.id);
    products = data;
  }

  if (groupId) {
    const { data: share } = await supabase
      .from('shared_comparisons')
      .select('slug')
      .eq('group_id', groupId)
      .eq('user_id', user!.id)
      .maybeSingle();
    existingShareSlug = share?.slug ?? undefined;

    // Auto-share when a group with 2+ products is viewed for the first time
    if (!existingShareSlug && products && products.length >= 2) {
      const result = await shareComparison(groupId);
      if ('slug' in result) existingShareSlug = result.slug;
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar: saved groups */}
      <aside className="hidden md:block w-56 shrink-0">
        <p className="text-xs tracking-widest uppercase text-muted mb-3">Saved groups</p>
        <GroupList groups={groups ?? []} activeGroupId={groupId} />
        <Link
          href="/dashboard"
          className="mt-4 block text-center text-xs tracking-widest uppercase text-terra hover:underline"
        >
          + Add from collection
        </Link>
      </aside>

      {/* Main comparison */}
      <div className="flex-1 min-w-0">
        {products && products.length >= 2 ? (
          <CompareTable
            key={groupId ?? ids ?? 'adhoc'}
            products={products}
            allProducts={allProducts}
            groupId={groupId}
            existingShareSlug={existingShareSlug}
            groups={groups}
          />
        ) : (
          <div className="text-center py-20 border border-dashed border-warm-border">
            <p className="text-muted mb-2">No products selected</p>
            <p className="text-xs text-muted mb-6">Go to your collection, select 2 or more products, and click Compare. Or pick a saved group from the sidebar.</p>
            <Link href="/dashboard" className="inline-block bg-terra text-white px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors">
              Go to collection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
