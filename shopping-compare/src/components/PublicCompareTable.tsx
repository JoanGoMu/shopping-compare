'use client';

import { useState } from 'react';
import { getAffiliateUrl } from '@/lib/affiliate';
import type { SharedProduct } from '@/lib/supabase/types';

interface Props {
  products: SharedProduct[];
  updatedAt: string;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function lowestPrice(products: SharedProduct[]): number | null {
  const currencies = new Set(products.filter((p) => p.price != null).map((p) => p.currency));
  if (currencies.size !== 1) return null;
  const prices = products.filter((p) => p.price != null).map((p) => p.price as number);
  return prices.length ? Math.min(...prices) : null;
}

export default function PublicCompareTable({ products, updatedAt }: Props) {
  const [imgIndexes, setImgIndexes] = useState<Record<number, number>>({});
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  function getImgIndex(i: number) { return imgIndexes[i] ?? 0; }
  function setImgIndex(i: number, idx: number) { setImgIndexes((prev) => ({ ...prev, [i]: idx })); }

  const lowest = lowestPrice(products);

  const PRIORITY_SPEC_KEYS = ['Brand', 'Color', 'Material', 'Composition', 'Size', 'Fit'];

  function isCleanSpecValue(val: unknown): boolean {
    if (val == null) return false;
    const s = String(val);
    if (s.length > 200) return false;
    if (s.includes('function(') || s.includes('.execute(') || s.includes('var ')) return false;
    return true;
  }

  const allSpecKeys = Array.from(new Set(products.flatMap((p) => {
    const specs = (p.specs as Record<string, unknown>) ?? {};
    return Object.keys(specs).filter((k) => isCleanSpecValue(specs[k]));
  })));

  type SpecEntry = { key: string; count: number };
  const keysWithCoverage: SpecEntry[] = allSpecKeys.map((key) => ({
    key,
    count: products.filter((p) => isCleanSpecValue(((p.specs as Record<string, unknown>) ?? {})[key])).length,
  }));
  // Visible = priority keys present in at least 1 product, in priority order
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
      <p className="text-xs text-muted tracking-wide uppercase mb-6">
        {products.length} products compared - prices as of {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="text-left text-xs tracking-widest uppercase text-muted py-3 pr-6 w-28">Field</th>
              {products.map((p, i) => {
                const images: string[] = p.images ?? (p.image_url ? [p.image_url] : []);
                const idx = getImgIndex(i);
                return (
                  <th key={i} className="text-left pb-4 px-3 w-[160px] min-w-[160px] max-w-[160px] align-top">
                    <div className="relative group/col w-full">
                      <div className="aspect-[3/4] w-full bg-cream overflow-hidden">
                        {images.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={images[idx]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-warm-border">◻</div>
                        )}
                      </div>
                      {images.length > 1 && (
                        <>
                          <button onClick={() => setImgIndex(i, (idx - 1 + images.length) % images.length)}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-white z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <button onClick={() => setImgIndex(i, (idx + 1) % images.length)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-white z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                            {images.map((_, di) => (
                              <button key={di} onClick={() => setImgIndex(i, di)}
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${di === idx ? 'bg-white' : 'bg-white/40'}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            <tr>
              <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Name</td>
              {products.map((p, i) => (
                <td key={i} className="py-3 px-4 text-sm text-ink align-top break-words overflow-hidden">{p.name}</td>
              ))}
            </tr>

            <tr className="bg-cream/50">
              <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Price</td>
              {products.map((p, i) => (
                <td key={i} className="py-3 px-4 align-top">
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
              {products.map((p, i) => (
                <td key={i} className="py-3 px-4 align-top">
                  <span className="text-sm text-ink flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${p.store_domain}&sz=16`} alt="" className="w-4 h-4" />
                    {p.store_name}
                  </span>
                </td>
              ))}
            </tr>

            {displayedSpecKeys.map(({ key }, ki) => (
              <tr key={key} className={ki % 2 === 0 ? '' : 'bg-cream/50'}>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">{key}</td>
                {products.map((p, i) => {
                  const val = ((p.specs as Record<string, unknown>) ?? {})[key];
                  const clean = isCleanSpecValue(val) ? String(val) : null;
                  return (
                    <td key={i} className="py-3 px-4 text-sm text-ink align-top break-words overflow-hidden">
                      {clean != null ? clean : <span className="text-warm-border">-</span>}
                    </td>
                  );
                })}
              </tr>
            ))}

            {hiddenSpecKeys.length > 0 && (
              <tr>
                <td colSpan={products.length + 1} className="py-2">
                  <button
                    onClick={() => setShowAllSpecs((v) => !v)}
                    className="text-xs text-muted hover:text-ink transition-colors tracking-wide"
                  >
                    {showAllSpecs ? 'Show fewer details' : `Show ${hiddenSpecKeys.length} more detail${hiddenSpecKeys.length === 1 ? '' : 's'}`}
                  </button>
                </td>
              </tr>
            )}

            <tr className="bg-cream/50">
              <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6">Link</td>
              {products.map((p, i) => (
                <td key={i} className="py-3 px-4 align-top">
                  <a
                    href={getAffiliateUrl(p.product_url, p.store_domain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-terra hover:underline"
                  >
                    Buy on {p.store_name} →
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="mt-16 bg-surface border border-warm-border p-8 sm:p-12">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-terra mb-4">Build your own in minutes</p>
          <p className="font-[var(--font-display)] italic text-2xl sm:text-3xl text-ink mb-3">
            Stop juggling tabs.<br />Compare anything, side by side.
          </p>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            Install the browser extension, click &ldquo;Save&rdquo; on any product page, and compare. Free, no credit card.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <a href="https://chromewebstore.google.com/detail/comparecart-save-to-compa/emfdbbbkcaheaakehmkicmapjcilpdoj" target="_blank" rel="noopener noreferrer" className="bg-terra text-white px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-terra-dark transition-colors w-full sm:w-auto text-center">
              Add to Chrome - Free
            </a>
            <a href="/signup" className="border border-warm-border text-ink px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-cream transition-colors w-full sm:w-auto text-center">
              Sign up
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-10 text-xs text-muted">
            <span className="flex items-center gap-2"><span className="text-terra font-medium">01</span> Install extension</span>
            <span className="text-warm-border">·</span>
            <span className="flex items-center gap-2"><span className="text-terra font-medium">02</span> Save products</span>
            <span className="text-warm-border">·</span>
            <span className="flex items-center gap-2"><span className="text-terra font-medium">03</span> Compare</span>
          </div>
        </div>
      </div>
    </div>
  );
}
