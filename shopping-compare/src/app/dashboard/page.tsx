import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';
import AddByUrlForm from '@/components/AddByUrlForm';
import ReferralTracker from '@/components/ReferralTracker';
import ReferralCard from '@/components/ReferralCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: products }, { data: groups }, { count: referralCount }] = await Promise.all([
    supabase.from('products').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('comparison_groups').select('*, comparison_items(product_id)').eq('user_id', user!.id).order('created_at', { ascending: false }),
    createAdminClient().from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user!.id),
  ]);

  return (
    <div>
      <ReferralTracker />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Your products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products?.length ?? 0} saved {products?.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <AddByUrlForm variant="toolbar" />
        </div>
      </div>

      <ReferralCard userId={user!.id} count={referralCount ?? 0} />

      {products && products.length > 0 ? (
        <ProductGrid key={products.length} products={products} groups={groups ?? []} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
