'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Product, ComparisonGroup } from '@/lib/supabase/types';
import ProductCard from './ProductCard';
import AddToGroupModal from './AddToGroupModal';

interface Props {
  products: Product[];
  groups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
}

type SortKey = 'date' | 'price_asc' | 'price_desc' | 'name';

export default function ProductGrid({ products, groups }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [filterStore, setFilterStore] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingToGroup, setAddingToGroup] = useState(false);

  const stores = useMemo(() => {
    const set = new Set(products.map((p) => p.store_name));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.store_name.toLowerCase().includes(q));
    }
    if (filterStore) {
      list = list.filter((p) => p.store_name === filterStore);
    }
    switch (sort) {
      case 'price_asc': return [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      case 'price_desc': return [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      case 'name': return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  }, [products, search, sort, filterStore]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
        />

        {stores.length > 1 && (
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All stores</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="date">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Name A-Z</option>
        </select>

        {selectedIds.size >= 2 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
            <Link
              href={`/compare?ids=${Array.from(selectedIds).join(',')}`}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Compare selected
            </Link>
            <button
              onClick={() => setAddingToGroup(true)}
              className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Add to group
            </button>
            <button onClick={clearSelection} className="text-sm text-gray-400 hover:text-gray-700">
              Clear
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No products match your search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              selected={selectedIds.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
            />
          ))}
        </div>
      )}

      {addingToGroup && (
        <AddToGroupModal
          productIds={Array.from(selectedIds)}
          existingGroups={groups}
          onClose={() => setAddingToGroup(false)}
          onDone={() => { setAddingToGroup(false); clearSelection(); }}
        />
      )}
    </div>
  );
}
