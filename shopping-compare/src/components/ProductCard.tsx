'use client';

import Image from 'next/image';
import type { Product } from '@/lib/supabase/types';

interface Props {
  product: Product;
  selected: boolean;
  onToggleSelect: () => void;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function ProductCard({ product, selected, onToggleSelect }: Props) {
  return (
    <div
      onClick={onToggleSelect}
      className={`
        bg-white rounded-xl border cursor-pointer transition-all group relative overflow-hidden
        ${selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors
        ${selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-300'}
      `}>
        {selected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📦</div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-gray-400 truncate flex items-center gap-1 mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${product.store_domain}&sz=16`}
            alt=""
            className="w-3.5 h-3.5"
          />
          {product.store_name}
        </p>
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">
            {formatPrice(product.price, product.currency) ?? <span className="text-gray-400 font-normal text-xs">No price</span>}
          </span>
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-indigo-600 hover:underline"
          >
            View →
          </a>
        </div>
      </div>
    </div>
  );
}
