import { createClient } from '@/lib/supabase/server';
import CompareTable from '@/components/CompareTable';
import GroupList from '@/components/GroupList';
import Link from 'next/link';

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
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar: saved groups */}
      <aside className="hidden md:block w-56 shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Saved groups</h2>
        <GroupList groups={groups ?? []} activeGroupId={groupId} />
        <Link
          href="/dashboard"
          className="mt-4 block text-center text-sm text-indigo-600 hover:underline"
        >
          + Compare from dashboard
        </Link>
      </aside>

      {/* Main comparison */}
      <div className="flex-1 min-w-0">
        {products && products.length >= 2 ? (
          <CompareTable products={products} groupId={groupId} existingShareSlug={existingShareSlug} />
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
            <div className="text-5xl mb-4">⚖️</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Select products to compare</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Go to your dashboard, select 2 or more products, and click &quot;Compare selected&quot;. Or pick a saved group from the sidebar.
            </p>
            <Link href="/dashboard" className="mt-5 inline-block bg-indigo-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors">
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
