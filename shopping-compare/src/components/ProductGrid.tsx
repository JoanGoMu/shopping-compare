'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Product, ComparisonGroup } from '@/lib/supabase/types';
import ProductCard from './ProductCard';
import AddToGroupModal from './AddToGroupModal';

interface Props {
  products: Product[];
  groups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
}

type SortKey = 'date' | 'price_asc' | 'price_desc' | 'name';

export default function ProductGrid({ products: initialProducts, groups }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [filterStore, setFilterStore] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function handleBulkDelete() {
    if (deleting || selectedIds.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    await supabase.from('products').delete().in('id', ids);
    setItems((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setDeleting(false);
  }

  const stores = useMemo(() => Array.from(new Set(items.map((p) => p.store_name))).sort(), [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.store_name.toLowerCase().includes(q));
    }
    if (filterStore) list = list.filter((p) => p.store_name === filterStore);
    switch (sort) {
      case 'price_asc': return [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      case 'price_desc': return [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      case 'name': return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  }, [items, search, sort, filterStore]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-6 pb-5 border-b border-warm-border">
        <input
          type="text"
          placeholder="Search your collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-warm-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-terra w-full sm:w-56"
        />

        {stores.length > 1 && (
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="border border-warm-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-terra"
          >
            <option value="">All stores</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-warm-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-terra"
        >
          <option value="date">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
        </select>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => {
              if (selectedIds.size === filtered.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(filtered.map((p) => p.id)));
              }
            }}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {selectedIds.size >= 1 && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-muted">{selectedIds.size} selected</span>
            {selectedIds.size >= 2 && (
              <Link
                href={`/compare?ids=${Array.from(selectedIds).join(',')}`}
                className="bg-terra text-white px-4 py-2 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors"
              >
                Compare
              </Link>
            )}
            <button
              onClick={() => setAddingToGroup(true)}
              className="border border-warm-border text-ink px-4 py-2 text-xs tracking-widest uppercase hover:border-muted transition-colors"
            >
              {selectedIds.size >= 2 ? 'Save group' : 'Add to group'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="border border-red-200 text-red-500 px-4 py-2 text-xs tracking-widest uppercase hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted hover:text-ink">Clear</button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-16">No products match your search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} selected={selectedIds.has(p.id)} onToggleSelect={() => toggleSelect(p.id)} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {addingToGroup && (
        <AddToGroupModal
          productIds={Array.from(selectedIds)}
          existingGroups={groups}
          onClose={() => setAddingToGroup(false)}
          onDone={() => { setAddingToGroup(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}
