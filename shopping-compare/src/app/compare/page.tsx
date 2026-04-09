import { createClient } from '@/lib/supabase/server';
import CompareShell from '@/components/CompareShell';
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
    if (group) productIds = group.comparison_items.map((i) => i.product_id);
  } else if (ids) {
    productIds = ids.split(',').filter(Boolean);
  }

  let products: typeof allProducts = [];
  if (productIds.length >= 2) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('user_id', user!.id);
    products = data ?? [];
  }

  let existingShareSlug: string | undefined;
  if (groupId) {
    const { data: share } = await supabase
      .from('shared_comparisons')
      .select('slug')
      .eq('group_id', groupId)
      .eq('user_id', user!.id)
      .maybeSingle();
    existingShareSlug = share?.slug ?? undefined;

    if (!existingShareSlug && products.length >= 2) {
      const result = await shareComparison(groupId);
      if ('slug' in result) existingShareSlug = result.slug;
    }
  }

  return (
    <CompareShell
      key={groupId ?? ids ?? 'adhoc'}
      products={products}
      allProducts={allProducts}
      groups={groups}
      groupId={groupId}
      existingShareSlug={existingShareSlug}
    />
  );
}
