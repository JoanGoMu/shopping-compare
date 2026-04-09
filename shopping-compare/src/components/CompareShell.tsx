'use client';

import { useState } from 'react';
import Link from 'next/link';
import CompareTable from './CompareTable';
import GroupList from './GroupList';
import type { Product, ComparisonGroup } from '@/lib/supabase/types';

type GroupWithItems = ComparisonGroup & { comparison_items: { product_id: string }[] };

interface Props {
  products: Product[];
  allProducts: Product[];
  groups: GroupWithItems[];
  groupId?: string;
  existingShareSlug?: string;
}

export default function CompareShell({ products, allProducts, groups, groupId, existingShareSlug }: Props) {
  // Track current product count so GroupList sidebar stays in sync
  const [activeCount, setActiveCount] = useState(products.length);

  return (
    <div className="flex gap-6">
      <aside className="hidden md:block w-56 shrink-0">
        <p className="text-xs tracking-widest uppercase text-muted mb-3">Saved groups</p>
        <GroupList
          groups={groups}
          activeGroupId={groupId}
          activeGroupProductCount={activeCount}
        />
        <Link href="/dashboard" className="mt-4 block text-center text-xs tracking-widest uppercase text-terra hover:underline">
          + Add from collection
        </Link>
      </aside>

      <div className="flex-1 min-w-0">
        {products.length >= 2 ? (
          <CompareTable
            products={products}
            allProducts={allProducts}
            groupId={groupId}
            existingShareSlug={existingShareSlug}
            groups={groups}
            onProductsChange={(prods) => setActiveCount(prods.length)}
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
