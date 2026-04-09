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

type SortKey = 'date' | 'price_asc' | 'price_desc' | 'name' | 'price_drops';

export default function ProductGrid({ products: initialProducts, groups }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState(initialProducts);
  const [alertsMap, setAlertsMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initialProducts.map((p) => [p.id, p.price_alerts]))
  );
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [filterStore, setFilterStore] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkAlertFeedback, setBulkAlertFeedback] = useState<'on' | 'off' | null>(null);

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function handleAlertToggle(id: string) {
    const next = !alertsMap[id];
    setAlertsMap((prev) => ({ ...prev, [id]: next }));
    await supabase.from('products').update({ price_alerts: next }).eq('id', id);
  }

  async function handleBulkAlerts(enabled: boolean) {
    const ids = Array.from(selectedIds);
    setAlertsMap((prev) => { const n = { ...prev }; ids.forEach((id) => { n[id] = enabled; }); return n; });
    setBulkAlertFeedback(enabled ? 'on' : 'off');
    setTimeout(() => setBulkAlertFeedback(null), 700);
    await supabase.from('products').update({ price_alerts: enabled }).in('id', ids);
  }

  async function handleBulkDelete() {
    if (deleting || selectedIds.size === 0) return;
    if (!confirmBulkDelete) { setConfirmBulkDelete(true); return; }
    setDeleting(true);
    const ids = Array.from(selectedIds);
    await supabase.from('products').delete().in('id', ids);
    setItems((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setDeleting(false);
    setConfirmBulkDelete(false);
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
      case 'price_drops': return [...list].sort((a, b) => {
        const aDrop = a.previous_price != null && a.price != null && a.price < a.previous_price ? a.previous_price - a.price : 0;
        const bDrop = b.previous_price != null && b.price != null && b.price < b.previous_price ? b.previous_price - b.price : 0;
        return bDrop - aDrop;
      });
      default: return list;
    }
  }, [items, search, sort, filterStore]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div>
      {/* Sticky bulk action bar - appears when items are selected */}
      {selectedIds.size >= 1 && (
        <div className="sticky top-14 z-30 -mx-6 px-6 py-3 bg-surface border-b border-warm-border flex flex-wrap items-center gap-3">
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
            onClick={() => handleBulkAlerts(true)}
            title="Enable price alerts for selected"
            className={`border px-3 py-2 text-xs tracking-widest uppercase transition-all duration-200 flex items-center gap-1.5 ${bulkAlertFeedback === 'on' ? 'bg-terra border-terra text-white scale-105' : 'border-warm-border text-terra hover:border-muted'}`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            Alerts on
          </button>
          <button
            onClick={() => handleBulkAlerts(false)}
            title="Disable price alerts for selected"
            className={`border px-3 py-2 text-xs tracking-widest uppercase transition-all duration-200 flex items-center gap-1.5 ${bulkAlertFeedback === 'off' ? 'bg-ink border-ink text-white scale-105' : 'border-warm-border text-muted hover:border-muted'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            Alerts off
          </button>
          {confirmBulkDelete ? (
            <>
              <span className="text-xs text-red-500">Delete {selectedIds.size} items?</span>
              <button onClick={handleBulkDelete} disabled={deleting} className="bg-red-500 text-white px-3 py-2 text-xs tracking-widest uppercase hover:bg-red-600 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmBulkDelete(false)} className="text-xs text-muted hover:text-ink">Cancel</button>
            </>
          ) : (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="border border-red-200 text-red-500 px-4 py-2 text-xs tracking-widest uppercase hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button onClick={() => { setSelectedIds(new Set()); setConfirmBulkDelete(false); }} className="text-xs text-muted hover:text-ink ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-6 pb-5 border-b border-warm-border mt-4">
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
          <option value="name">Name A-Z</option>
          <option value="price_drops">Price drops first</option>
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
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-16">No products match your search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} selected={selectedIds.has(p.id)} priceAlerts={alertsMap[p.id] ?? p.price_alerts} onToggleSelect={() => toggleSelect(p.id)} onDeleted={handleDeleted} onAlertToggle={() => handleAlertToggle(p.id)} />
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
