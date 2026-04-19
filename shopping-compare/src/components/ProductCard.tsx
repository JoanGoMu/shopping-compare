'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/supabase/types';

interface Props {
  product: Product;
  selected: boolean;
  priceAlerts: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  onDeleted: (id: string) => void;
  onAlertToggle: () => void;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function ProductCard({ product, selected, priceAlerts, onToggleSelect, onOpenDetail, onDeleted, onAlertToggle }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState(product.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [bellAnimating, setBellAnimating] = useState(false);
  const isFirstRender = useRef(true);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Animate bell when priceAlerts changes (individual or bulk toggle)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setBellAnimating(true);
    const t = setTimeout(() => setBellAnimating(false), 350);
    return () => clearTimeout(t);
  }, [priceAlerts]);

  const images: string[] = (product.images as string[] | null) ?? (product.image_url ? [product.image_url] : []);
  const [imgIndex, setImgIndex] = useState(0);

  function prevImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  }
  function nextImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % images.length);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await supabase.from('products').delete().eq('id', product.id);
    onDeleted(product.id);
  }

  function startEditingNotes(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingNotes(true);
    setTimeout(() => notesRef.current?.focus(), 0);
  }

  async function saveNotes() {
    setEditingNotes(false);
    await supabase.from('products').update({ notes: notes || null }).eq('id', product.id);
  }

  return (
    <div
      onClick={onOpenDetail}
      className={`
        bg-surface cursor-pointer transition-all group relative overflow-hidden border flex flex-col
        ${selected ? 'border-terra ring-1 ring-terra' : 'border-warm-border hover:border-muted'}
      `}
    >
      {/* Selection checkbox - click toggles selection without opening panel */}
      <div
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={`
          absolute top-2.5 right-2.5 w-5 h-5 border flex items-center justify-center z-10 transition-colors cursor-pointer
          ${selected ? 'bg-terra border-terra' : 'bg-surface border-warm-border group-hover:border-muted'}
        `}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Delete button - visible on hover */}
      {confirmDelete ? (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={handleDelete} disabled={deleting} className="bg-red-500 text-white text-xs px-2 py-1 hover:bg-red-600 disabled:opacity-50">
            {deleting ? '...' : 'Yes'}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="bg-white/90 text-ink text-xs px-2 py-1 border border-warm-border hover:border-muted">
            No
          </button>
        </div>
      ) : (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 disabled:opacity-50"
          title="Remove"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Image carousel */}
      <div className="aspect-[3/4] bg-cream overflow-hidden relative">
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[imgIndex]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-warm-border">◻</div>
        )}

        {/* Price-check failed: subtle bottom band, not alarming — product may just need a page visit */}
        {product.price_check_failed && (
          <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1.5 flex items-center gap-1.5 z-10">
            <svg className="w-3 h-3 text-amber-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] text-white/90 leading-tight">Visit page to refresh price</span>
          </div>
        )}

        {/* Carousel arrows - only shown when multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={nextImg}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <div>
          <p className="text-xs text-muted truncate flex items-center gap-1 mb-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${product.store_domain}&sz=16`} alt="" className="w-3.5 h-3.5" />
            {product.store_name}
          </p>
          <p className="text-sm text-ink line-clamp-2 leading-snug mb-2">{product.name}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-sm font-medium text-ink">
            {formatPrice(product.price, product.currency) ?? <span className="text-muted text-xs font-normal">No price</span>}
            {product.previous_price != null && product.price != null && product.previous_price !== product.price && (
              <span className={`ml-1.5 text-xs ${product.price < product.previous_price ? 'text-green-600' : 'text-red-500'}`}>
                {product.price < product.previous_price ? '↓' : '↑'}
                <span className="line-through ml-0.5 text-muted">{formatPrice(product.previous_price, product.currency)}</span>
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onAlertToggle}
                className={`peer p-0.5 transition-all duration-200 ${bellAnimating ? 'scale-125' : 'scale-100'} ${priceAlerts ? 'text-terra' : 'text-warm-border hover:text-muted'}`}
              >
                <svg className="w-4 h-4" fill={priceAlerts ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-white text-xs whitespace-nowrap opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {priceAlerts ? 'Mute price alerts' : 'Alert me when price changes'}
              </div>
            </div>
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-terra hover:underline"
            >
              Buy →
            </a>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-2 border-t border-warm-border pt-2" onClick={(e) => e.stopPropagation()}>
          {editingNotes ? (
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(); } }}
              placeholder="Add a note..."
              rows={2}
              className="w-full text-xs text-ink bg-cream border border-warm-border focus:border-terra focus:outline-none px-2 py-1 resize-none"
            />
          ) : (
            <button
              onClick={startEditingNotes}
              className="w-full text-left text-xs leading-relaxed min-h-[1.5rem]"
            >
              {notes ? (
                <span className="text-ink">{notes}</span>
              ) : (
                <span className="text-warm-border group-hover:text-muted transition-colors">Add note...</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
