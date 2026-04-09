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

  function getImgIndex(i: number) { return imgIndexes[i] ?? 0; }
  function setImgIndex(i: number, idx: number) { setImgIndexes((prev) => ({ ...prev, [i]: idx })); }

  const lowest = lowestPrice(products);
  const specKeys = Array.from(new Set(products.flatMap((p) => Object.keys((p.specs as Record<string, unknown>) ?? {}))));

  return (
    <div>
      <p className="text-xs text-muted tracking-wide uppercase mb-6">
        {products.length} products compared - prices as of {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs tracking-widest uppercase text-muted py-3 pr-6 w-28">Field</th>
              {products.map((p, i) => {
                const images: string[] = p.images ?? (p.image_url ? [p.image_url] : []);
                const idx = getImgIndex(i);
                return (
                  <th key={i} className="text-left pb-4 px-3 w-[160px] min-w-[160px] align-top">
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
                <td key={i} className="py-3 px-4 text-sm text-ink align-top">{p.name}</td>
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

            {specKeys.map((key, ki) => (
              <tr key={key} className={ki % 2 === 0 ? '' : 'bg-cream/50'}>
                <td className="text-xs tracking-widest uppercase text-muted py-3 pr-6 capitalize">{key}</td>
                {products.map((p, i) => {
                  const val = ((p.specs as Record<string, unknown>) ?? {})[key];
                  return (
                    <td key={i} className="py-3 px-4 text-sm text-ink align-top">
                      {val != null ? String(val) : <span className="text-warm-border">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}

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
      <div className="mt-12 border-t border-warm-border pt-8 text-center">
        <p className="text-muted text-sm mb-3">Want to compare products from your favourite stores?</p>
        <a href="/signup" className="inline-block bg-terra text-white px-8 py-3 text-sm tracking-widest uppercase hover:bg-terra-dark transition-colors">
          Create your free CompareCart account
        </a>
      </div>
    </div>
  );
}
