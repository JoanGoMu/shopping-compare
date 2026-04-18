'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/supabase/types';
import { shareComparison, unshareComparison } from '@/app/compare/actions';
import PriceSparkline from '@/components/PriceSparkline';
import { normalizeSpecs } from '@/lib/normalize-specs';

interface Props {
  products: Product[];
  allProducts?: Product[];
  groupId?: string;
  existingShareSlug?: string;
  groups?: { id: string; name: string; comparison_items: { product_id: string }[] }[];
  onProductsChange?: (products: Product[]) => void;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function lowestPrice(products: Product[]): number | null {
  const currencies = new Set(products.filter((p) => p.price != null).map((p) => p.currency));
  if (currencies.size !== 1) return null;
  const prices = products.filter((p) => p.price != null).map((p) => p.price as number);
  return prices.length ? Math.min(...prices) : null;
}

export default function CompareTable({ products: initialProducts, allProducts = [], groupId, existingShareSlug, groups = [], onProductsChange }: Props) {
  const supabase = createClient();
  const [products, setProducts] = useState(initialProducts);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [imgIndexes, setImgIndexes] = useState<Record<string, number>>({});
  const [shareSlug, setShareSlug] = useState(existingShareSlug ?? null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [saveGroupError, setSaveGroupError] = useState('');

  const shareUrl = shareSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${shareSlug}` : null;

  async function handleShare() {
    if (!groupId) return;
    setShareLoading(true);
    const result = await shareComparison(groupId);
    setShareLoading(false);
    if ('slug' in result) setShareSlug(result.slug);
  }

  async function handleUnshare() {
    if (!shareSlug) return;
    await unshareComparison(shareSlug);
    setShareSlug(null);
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getImgIndex(id: string) { return imgIndexes[id] ?? 0; }
  function setImgIndex(id: string, i: number) { setImgIndexes((prev) => ({ ...prev, [id]: i })); }

  async function handleRemove(id: string) {
    if (groupId) {
      await supabase.from('comparison_items').delete().eq('group_id', groupId).eq('product_id', id);
    }
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    onProductsChange?.(next);
  }

  async function handleAddProduct(product: Product) {
    if (products.find((p) => p.id === product.id)) return;
    if (groupId) {
      await supabase.from('comparison_items').upsert(
        { group_id: groupId, product_id: product.id, position: products.length },
        { onConflict: 'group_id,product_id' }
      );
    }
    const next = [...products, product];
    setProducts(next);
    onProductsChange?.(next);
    setShowAddPicker(false);
  }

  async function handleSaveGroup() {
    if (!newGroupName.trim()) { setSaveGroupError('Enter a name.'); return; }
    setSavingGroup(true);
    setSaveGroupError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { data: group, error: gErr } = await supabase
      .from('comparison_groups')
      .insert({ name: newGroupName.trim(), user_id: user!.id })
      .select('id').single();
    if (gErr || !group) { setSaveGroupError('Failed to create group.'); setSavingGroup(false); return; }
    const items = products.map((p, i) => ({ group_id: group.id, product_id: p.id, position: i }));
    await supabase.from('comparison_items').insert(items);
    setSavingGroup(false);
    setShowSaveGroup(false);
    window.location.href = `/compare?group=${group.id}`;
  }

  const lowest = lowestPrice(products);
  // Apply spec normalization at render time so existing stored foreign-language keys
  // (e.g. "Bovenmateriaal", "Dekzool") display as their canonical English equivalents
  // without requiring a DB migration.
  const productsWithNormalizedSpecs = products.map((p) => ({
    ...p,
    specs: normalizeSpecs((p.specs as Record<string, string>) ?? {}),
  }));
  const filtered = productsWithNormalizedSpecs.filter((p) => {
    if (minPrice && (p.price == null || p.price < parseFloat(minPrice))) return false;
    if (maxPrice && (p.price == null || p.price > parseFloat(maxPrice))) return false;
    return true;
  });

  // Products not yet in this comparison (for add picker)
  const addableProducts = allProducts.filter((p) => !products.find((cp) => cp.id === p.id));

  // Category-aware spec key ordering
  const CATEGORY_SPECS: Record<string, string[]> = {
    shoes:       ['Brand', 'Size', 'Color', 'Material', 'Sole', 'Insole', 'Lining', 'Fit', 'Heel Height', 'Width', 'Style', 'Weight', 'Country of Origin'],
    clothing:    ['Brand', 'Size', 'Color', 'Material', 'Composition', 'Fit', 'Pattern', 'Neckline', 'Sleeve', 'Length', 'Gender', 'Season', 'Care', 'Country of Origin'],
    electronics: ['Brand', 'Processor', 'RAM', 'Storage', 'Display', 'Battery', 'OS', 'Connectivity', 'Camera', 'Resolution', 'Weight', 'Ports'],
    beauty:      ['Brand', 'Volume', 'Type', 'Scent', 'Skin Type', 'Ingredients', 'Application'],
    home:        ['Brand', 'Material', 'Dimensions', 'Color', 'Weight', 'Capacity'],
    default:     ['Brand', 'Color', 'Material', 'Composition', 'Size', 'Fit'],
  };

  function detectCategory(prods: typeof filtered): string {
    const allSpecKeys2 = prods.flatMap(p => Object.keys((p.specs as Record<string, string>) ?? {}));
    const allNames = prods.map(p => (p.name ?? '').toLowerCase());
    if (allSpecKeys2.includes('Sole') || allNames.some(n => /\b(shoe|sneaker|boot|sandal|trainer|loafer|slipper|heel|pump)\b/i.test(n)))
      return 'shoes';
    if (allSpecKeys2.some(k => ['Processor', 'RAM', 'Storage', 'Display', 'Battery', 'OS', 'Resolution', 'Ports'].includes(k))
      || allNames.some(n => /\b(laptop|phone|tablet|headphone|speaker|monitor|camera|tv|vacuum|printer)\b/i.test(n)))
      return 'electronics';
    if (allSpecKeys2.some(k => ['Scent', 'Volume', 'Skin Type', 'Ingredients'].includes(k)))
      return 'beauty';
    if (allSpecKeys2.some(k => ['Size', 'Fit', 'Composition', 'Neckline', 'Sleeve'].includes(k)))
      return 'clothing';
    return 'default';
  }

  const category = detectCategory(filtered);
  const PRIORITY_SPEC_KEYS = CATEGORY_SPECS[category] ?? CATEGORY_SPECS.default;

  // Filter out garbage spec values (e.g. Amazon review widget JS code)
  function isCleanSpecValue(val: unknown): boolean {
    if (val == null) return false;
    const s = String(val);
    if (s.length > 200) return false;
    if (s.includes('function(') || s.includes('.execute(') || s.includes('var ')) return false;
    return true;
  }

  const allSpecKeys = Array.from(new Set(filtered.flatMap((p) => {
    const specs = (p.specs as Record<string, unknown>) ?? {};
    return Object.keys(specs).filter((k) => isCleanSpecValue(specs[k]));
  })));

  type SpecEntry = { key: string; count: number };
  const keysWithCoverage: SpecEntry[] = allSpecKeys.map((key) => ({
    key,
    count: filtered.filter((p) => isCleanSpecValue(((p.specs as Record<string, unknown>) ?? {})[key])).length,
  }));

  // Visible = priority keys present in at least 1 product, in category priority order
  const visibleSpecKeys = PRIORITY_SPEC_KEYS
    .map((key) => keysWithCoverage.find((e) => e.key === key))
    .filter((e): e is SpecEntry => e != null && e.count > 0);

  // Hidden = everything else, sorted by coverage desc
  const hiddenSpecKeys = keysWithCoverage
    .filter((e) => !PRIORITY_SPEC_KEYS.includes(e.key))
    .sort((a, b) => b.count - a.count);

  const displayedSpecKeys = showAllSpecs ? [...visibleSpecKeys, ...hiddenSpecKeys] : visibleSpecKeys;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-6 pb-5 border-b border-warm-border">
        <span className="text-xs tracking-widest uppercase text-muted">Filter by price</span>
        <div className="flex items-center gap-2">
          <input
            type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            className="w-24 border border-warm-border px-3 py-1.5 text-sm focus:outline-none focus:border-terra"
          />
          <span className="text-muted text-sm">-</span>
          <input
            type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24 border border-warm-border px-3 py-1.5 text-sm focus:outline-none focus:border-terra"
          />
        </div>
        {(minPrice || maxPrice) && (
          <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-xs text-muted hover:text-ink">Clear</button>
        )}
        <span className="text-xs text-muted">{filtered.length} of {products.length} shown</span>

        <div className="ml-auto flex items-center gap-2">

          {/* Save as group - only when not already a saved group */}
          {!groupId && products.length >= 2 && (
            <button
              onClick={() => setShowSaveGroup(true)}
              className="text-xs tracking-widest uppercase border border-warm-border text-ink px-3 py-1.5 hover:border-muted transition-colors"
            >
              Save group
            </button>
          )}

          {/* Share controls */}
          {groupId && (
            <div className="flex items-center gap-2 border-l border-warm-border pl-3">
              {shareSlug ? (
                <>
                  <button onClick={handleCopy} className="text-xs text-terra hover:underline">
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                  <button onClick={handleUnshare} className="text-xs text-muted hover:text-red-500">Unshare</button>
                </>
              ) : (
                <button
                  onClick={handleShare}
                  disabled={shareLoading}
                  className="text-xs tracking-widest uppercase bg-terra text-white px-3 py-1.5 hover:bg-terra-dark transition-colors disabled:opacity-50"
                >
                  {shareLoading ? 'Sharing...' : 'Share'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shared URL banner */}
      {shareUrl && (
        <div className="mb-5 flex items-center gap-3 bg-surface border border-warm-border px-4 py-3 text-sm">
          <span className="text-muted text-xs uppercase tracking-widest">Public link</span>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-terra hover:underline text-xs truncate flex-1">{shareUrl}</a>
          <button onClick={handleCopy} className="text-xs text-muted hover:text-ink shrink-0">{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-16">No products match the price filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="text-left text-xs tracking-widest uppercase text-muted py-3 pr-6 w-28">Field</th>
                {filtered.map((p) => {
                  const images: string[] = (p.images as string[] | null) ?? (p.image_url ? [p.image_url] : []);
                  const idx = getImgIndex(p.id);
                  return (
                    <th key={p.id} className="text-left pb-4 px-3 w-[160px] min-w-[160px] max-w-[160px] align-top">
                      <div className="relative group/col w-full">
                        <div className="aspect-[3/4] w-full bg-cream overflow-hidden relative">
                          {images.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={images[idx]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-warm-border">◻</div>
                          )}
                          {p.price_check_failed && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1.5 flex items-center gap-1.5">
                              <svg className="w-3 h-3 text-amber-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-[10px] text-white/90 leading-tight">Visit page to refresh</span>
                            </div>
                          )}
                        </div>
                        {images.length > 1 && (
                          <>
                            <button onClick={() => setImgIndex(p.id, (idx - 1 + images.length) % images.length)}
                              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-white z-10">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={() => setImgIndex(p.id, (idx + 1) % images.length)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-white z-10">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                              {images.map((_, i) => (
                                <button key={i} onClick={() => setImgIndex(p.id, i)}
                                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
                              ))}
                            </div>
                          </>
                        )}
                        <button
                          onClick={() => handleRemove(p.id)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/80 border border-warm-border text-muted hover:text-red-600 hover:border-red-300 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity z-20"
                          title="Remove from comparison"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </th>
                  );
                })}
                {/* Ghost "add" column */}
                {addableProducts.length > 0 && (
                  <th className="text-left pb-4 px-3 w-[160px] min-w-[160px] align-top">
                    <button
                      onClick={() => setShowAddPicker(true)}
                      className="w-full aspect-[3/4] border-2 border-dashed border-warm-border hover:border-terra transition-colors flex flex-col items-center justify-center gap-2 group/add"
                    >
                      <svg className="w-6 h-6 text-warm-border group-hover/add:text-terra transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="text-xs text-muted group-hover/add:text-terra transition-colors tracking-wide">Add item</span>
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              <tr>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Name</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-sm text-ink align-top break-words overflow-hidden">{p.name}</td>
                ))}
                {addableProducts.length > 0 && <td />}
              </tr>

              <tr className="bg-cream/50">
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Price</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 align-top">
                    {p.price == null ? (
                      <span className="text-xs text-muted italic">No price</span>
                    ) : (
                      <span className={`text-sm font-medium ${lowest != null && p.price === lowest ? 'text-terra' : 'text-ink'}`}>
                        {formatPrice(p.price, p.currency)}
                        {lowest != null && p.price === lowest && (
                          <span className="ml-1.5 text-xs bg-terra-light text-terra px-1.5 py-0.5">Best</span>
                        )}
                        {p.previous_price != null && p.previous_price !== p.price && (
                          <span className={`ml-1.5 text-xs ${p.price < p.previous_price ? 'text-green-600' : 'text-red-500'}`}>
                            {p.price < p.previous_price ? '↓' : '↑'}
                            <span className="line-through ml-0.5 text-muted">{formatPrice(p.previous_price, p.currency)}</span>
                          </span>
                        )}
                      </span>
                    )}
                    <div className="mt-2">
                      <a href={p.product_url} target="_blank" rel="noopener noreferrer"
                        className="inline-block text-xs bg-terra text-white px-3 py-1 tracking-widest uppercase hover:bg-terra-dark transition-colors">
                        Buy →
                      </a>
                    </div>
                  </td>
                ))}
                {addableProducts.length > 0 && <td />}
              </tr>

              <tr className="bg-cream/50">
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Price history</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 align-top">
                    <PriceSparkline productUrl={p.product_url} currency={p.currency} />
                  </td>
                ))}
                {addableProducts.length > 0 && <td />}
              </tr>

              <tr>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Store</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 align-top">
                    <span className="text-sm text-ink flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://www.google.com/s2/favicons?domain=${p.store_domain}&sz=16`} alt="" className="w-4 h-4" />
                      {p.store_name}
                    </span>
                  </td>
                ))}
                {addableProducts.length > 0 && <td />}
              </tr>

              {displayedSpecKeys.map(({ key }, i) => (
                <tr key={key} className={i % 2 === 0 ? '' : 'bg-cream/50'}>
                  <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">{key}</td>
                  {filtered.map((p) => {
                    const val = ((p.specs as Record<string, unknown>) ?? {})[key];
                    const clean = isCleanSpecValue(val) ? String(val) : null;
                    return (
                      <td key={p.id} className="py-3 px-4 text-sm text-ink align-top break-words overflow-hidden">
                        {clean != null ? clean : <span className="text-warm-border">-</span>}
                      </td>
                    );
                  })}
                  {addableProducts.length > 0 && <td />}
                </tr>
              ))}

              {/* Collapsible toggle for low-coverage specs */}
              {hiddenSpecKeys.length > 0 && (
                <tr>
                  <td colSpan={filtered.length + (addableProducts.length > 0 ? 2 : 1)} className="py-2">
                    <button
                      onClick={() => setShowAllSpecs((v) => !v)}
                      className="text-xs text-muted hover:text-ink transition-colors tracking-wide"
                    >
                      {showAllSpecs ? 'Show fewer details' : `Show ${hiddenSpecKeys.length} more detail${hiddenSpecKeys.length === 1 ? '' : 's'}`}
                    </button>
                  </td>
                </tr>
              )}

              <tr>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Notes</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-sm text-muted italic align-top">
                    {p.notes ?? <span className="text-warm-border not-italic">-</span>}
                  </td>
                ))}
                {addableProducts.length > 0 && <td />}
              </tr>

            </tbody>
          </table>
        </div>
      )}

      {/* Add more picker */}
      {showAddPicker && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddPicker(false)}>
          <div className="bg-surface w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[var(--font-display)] italic text-xl text-ink mb-1">Add to comparison</h2>
            <p className="text-xs text-muted mb-4">{addableProducts.length} products in your collection</p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {addableProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-warm-border hover:border-terra text-left transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {(p.image_url || (p.images as string[])?.[0]) && (
                    <img
                      src={(p.images as string[])?.[0] ?? p.image_url!}
                      alt=""
                      className="w-10 h-12 object-cover bg-cream shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{p.name}</p>
                    <p className="text-xs text-muted">{p.store_name}{p.price != null ? ` - ${formatPrice(p.price, p.currency)}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddPicker(false)} className="mt-4 w-full py-2.5 border border-warm-border text-xs tracking-widest uppercase text-muted hover:border-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Save as group modal */}
      {showSaveGroup && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveGroup(false)}>
          <div className="bg-surface w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[var(--font-display)] italic text-xl text-ink mb-1">Save as group</h2>
            <p className="text-xs text-muted mb-4">{products.length} products</p>
            {saveGroupError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-3">{saveGroupError}</p>}
            <input
              type="text" autoFocus
              placeholder="e.g. Summer dresses under €100"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveGroup()}
              className="w-full border border-warm-border px-3 py-2.5 text-sm focus:outline-none focus:border-terra mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveGroup(false)} className="flex-1 py-2.5 border border-warm-border text-xs tracking-widest uppercase text-muted hover:border-muted transition-colors">Cancel</button>
              <button
                onClick={handleSaveGroup} disabled={savingGroup}
                className="flex-1 py-2.5 bg-terra text-white text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50"
              >
                {savingGroup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
