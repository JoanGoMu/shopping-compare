'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/supabase/types';
import { shareComparison, unshareComparison } from '@/app/compare/actions';

interface Props { products: Product[]; groupId?: string; existingShareSlug?: string; }

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function lowestPrice(products: Product[]): number | null {
  const currencies = new Set(products.filter((p) => p.price != null).map((p) => p.currency));
  if (currencies.size !== 1) return null; // mixed currencies - can't compare
  const prices = products.filter((p) => p.price != null).map((p) => p.price as number);
  return prices.length ? Math.min(...prices) : null;
}

export default function CompareTable({ products: initialProducts, groupId, existingShareSlug }: Props) {
  const supabase = createClient();
  const [products, setProducts] = useState(initialProducts);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [imgIndexes, setImgIndexes] = useState<Record<string, number>>({});
  const [shareSlug, setShareSlug] = useState(existingShareSlug ?? null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    // Only remove from the group/view - never delete the product from the collection
    if (groupId) {
      await supabase.from('comparison_items').delete().eq('group_id', groupId).eq('product_id', id);
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  const lowest = lowestPrice(products);
  const filtered = products.filter((p) => {
    if (minPrice && (p.price == null || p.price < parseFloat(minPrice))) return false;
    if (maxPrice && (p.price == null || p.price > parseFloat(maxPrice))) return false;
    return true;
  });

  const specKeys = Array.from(new Set(filtered.flatMap((p) => Object.keys((p.specs as Record<string, unknown>) ?? {}))));

  return (
    <div>
      {/* Price filter + Share */}
      <div className="flex flex-wrap gap-3 items-center mb-6 pb-5 border-b border-warm-border">
        <span className="text-xs tracking-widest uppercase text-muted">Filter by price</span>
        <div className="flex items-center gap-2">
          <input
            type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            className="w-24 border border-warm-border px-3 py-1.5 text-sm focus:outline-none focus:border-terra"
          />
          <span className="text-muted text-sm">—</span>
          <input
            type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24 border border-warm-border px-3 py-1.5 text-sm focus:outline-none focus:border-terra"
          />
        </div>
        {(minPrice || maxPrice) && (
          <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-xs text-muted hover:text-ink">Clear</button>
        )}
        <span className="text-xs text-muted ml-auto">{filtered.length} of {products.length} shown</span>

        {/* Share controls - only available for saved groups */}
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
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs tracking-widest uppercase text-muted py-3 pr-6 w-28">Field</th>
                {filtered.map((p) => {
                  const images: string[] = (p.images as string[] | null) ?? (p.image_url ? [p.image_url] : []);
                  const idx = getImgIndex(p.id);
                  return (
                    <th key={p.id} className="text-left pb-4 px-3 w-[160px] min-w-[160px] align-top">
                      <div className="relative group/col w-full">
                        <div className="aspect-[3/4] w-full bg-cream overflow-hidden">
                          {images.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={images[idx]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-warm-border">◻</div>
                          )}
                        </div>
                        {/* Carousel arrows */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              <tr>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Name</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-sm text-ink align-top">{p.name}</td>
                ))}
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
                  </td>
                ))}
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
              </tr>

              {specKeys.map((key, i) => (
                <tr key={key} className={i % 2 === 0 ? '' : 'bg-cream/50'}>
                  <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6 capitalize">{key}</td>
                  {filtered.map((p) => {
                    const val = ((p.specs as Record<string, unknown>) ?? {})[key];
                    return (
                      <td key={p.id} className="py-3 px-4 text-sm text-ink align-top">
                        {val != null ? String(val) : <span className="text-warm-border">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Notes</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-sm text-muted italic align-top">
                    {p.notes ?? <span className="text-warm-border not-italic">—</span>}
                  </td>
                ))}
              </tr>

              <tr className="bg-cream/50">
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Link</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-4 align-top">
                    <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-terra hover:underline">
                      Buy on {p.store_name} →
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
