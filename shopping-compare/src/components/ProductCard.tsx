'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/supabase/types';

interface Props {
  product: Product;
  selected: boolean;
  onToggleSelect: () => void;
  onDeleted: (id: string) => void;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function ProductCard({ product, selected, onToggleSelect, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    await supabase.from('products').delete().eq('id', product.id);
    onDeleted(product.id);
  }

  return (
    <div
      onClick={onToggleSelect}
      className={`
        bg-surface cursor-pointer transition-all group relative overflow-hidden border
        ${selected ? 'border-terra ring-1 ring-terra' : 'border-warm-border hover:border-muted'}
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-2.5 right-2.5 w-5 h-5 border flex items-center justify-center z-10 transition-colors
        ${selected ? 'bg-terra border-terra' : 'bg-surface border-warm-border group-hover:border-muted'}
      `}>
        {selected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Delete button - visible on hover */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2.5 left-2.5 z-10 w-6 h-6 bg-white/80 border border-warm-border text-muted hover:text-red-600 hover:border-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
        title="Remove"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image - plain img to avoid Next.js domain restrictions on external CDNs */}
      <div className="aspect-[3/4] bg-cream overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-warm-border">◻</div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-muted truncate flex items-center gap-1 mb-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://www.google.com/s2/favicons?domain=${product.store_domain}&sz=16`} alt="" className="w-3.5 h-3.5" />
          {product.store_name}
        </p>
        <p className="text-sm text-ink line-clamp-2 leading-snug mb-2">{product.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">
            {formatPrice(product.price, product.currency) ?? <span className="text-muted text-xs font-normal">No price</span>}
          </span>
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-terra hover:underline"
          >
            View →
          </a>
        </div>
      </div>
    </div>
  );
}
