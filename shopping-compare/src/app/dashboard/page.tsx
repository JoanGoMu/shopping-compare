import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';
import AddByUrlForm from '@/components/AddByUrlForm';
import ExtensionAuthBridge from '@/components/ExtensionAuthBridge';
import PriceAlertsToggle from '@/components/PriceAlertsToggle';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const { data: groups } = await supabase
    .from('comparison_groups')
    .select('*, comparison_items(product_id)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const { data: prefs } = await supabase
    .from('user_preferences').select('price_alerts').eq('user_id', user!.id).maybeSingle();
  const priceAlertsEnabled = prefs?.price_alerts !== false;

  return (
    <div>
      <ExtensionAuthBridge />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Your products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products?.length ?? 0} saved {products?.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PriceAlertsToggle enabled={priceAlertsEnabled} />
          <AddByUrlForm variant="toolbar" />
        </div>
      </div>

      {products && products.length > 0 ? (
        <ProductGrid key={products.length} products={products} groups={groups ?? []} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
