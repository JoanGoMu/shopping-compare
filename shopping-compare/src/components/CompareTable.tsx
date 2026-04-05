'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/supabase/types';

interface Props {
  products: Product[];
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function lowestPrice(products: Product[]) {
  const prices = products.filter((p) => p.price != null).map((p) => p.price as number);
  return prices.length ? Math.min(...prices) : null;
}

export default function CompareTable({ products }: Props) {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const lowest = lowestPrice(products);

  const filtered = products.filter((p) => {
    if (minPrice && (p.price == null || p.price < parseFloat(minPrice))) return false;
    if (maxPrice && (p.price == null || p.price > parseFloat(maxPrice))) return false;
    return true;
  });

  // Collect all spec keys across all products
  const specKeys = Array.from(
    new Set(filtered.flatMap((p) => Object.keys((p.specs as Record<string, unknown>) ?? {})))
  );

  return (
    <div>
      {/* Price filter */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <span className="text-sm font-medium text-gray-700">Filter by price:</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400 text-sm">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {(minPrice || maxPrice) && (
          <button
            onClick={() => { setMinPrice(''); setMaxPrice(''); }}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Clear filter
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {products.length} shown</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No products match the price filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 w-32">Field</th>
                {filtered.map((p) => (
                  <th key={p.id} className="text-left pb-3 px-3 min-w-[180px] align-top">
                    <div className="flex flex-col gap-2">
                      <div className="aspect-square w-full max-w-[140px] bg-gray-100 rounded-xl overflow-hidden relative">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📦</div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Product name */}
              <tr className="bg-gray-50/50">
                <td className="text-xs font-medium text-gray-500 py-3 pr-4">Name</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-3 text-sm font-medium text-gray-900 align-top">{p.name}</td>
                ))}
              </tr>

              {/* Price */}
              <tr>
                <td className="text-xs font-medium text-gray-500 py-3 pr-4">Price</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-3 align-top">
                    <span className={`text-sm font-bold ${lowest != null && p.price === lowest ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatPrice(p.price, p.currency)}
                      {lowest != null && p.price === lowest && (
                        <span className="ml-1 text-xs font-normal bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">Best</span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Store */}
              <tr className="bg-gray-50/50">
                <td className="text-xs font-medium text-gray-500 py-3 pr-4">Store</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-3 align-top">
                    <span className="text-sm text-gray-700 flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://www.google.com/s2/favicons?domain=${p.store_domain}&sz=16`} alt="" className="w-4 h-4" />
                      {p.store_name}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Dynamic specs */}
              {specKeys.map((key, i) => (
                <tr key={key} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                  <td className="text-xs font-medium text-gray-500 py-3 pr-4 capitalize">{key}</td>
                  {filtered.map((p) => {
                    const specs = (p.specs as Record<string, unknown>) ?? {};
                    const val = specs[key];
                    return (
                      <td key={p.id} className="py-3 px-3 text-sm text-gray-700 align-top">
                        {val != null ? String(val) : <span className="text-gray-300">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Notes */}
              <tr>
                <td className="text-xs font-medium text-gray-500 py-3 pr-4">Notes</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-3 text-sm text-gray-500 italic align-top">
                    {p.notes ?? <span className="text-gray-300 not-italic">-</span>}
                  </td>
                ))}
              </tr>

              {/* Link */}
              <tr className="bg-gray-50/50">
                <td className="text-xs font-medium text-gray-500 py-3 pr-4">Link</td>
                {filtered.map((p) => (
                  <td key={p.id} className="py-3 px-3 align-top">
                    <a
                      href={p.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View on {p.store_name} →
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
