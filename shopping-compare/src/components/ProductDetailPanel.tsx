'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/supabase/types';
import { normalizeSpecs } from '@/lib/normalize-specs';
import { getAffiliateUrl } from '@/lib/affiliate';
import PriceSparkline from './PriceSparkline';

interface Props {
  product: Product;
  priceAlerts: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onAlertToggle: () => void;
  onNotesUpdated: (id: string, notes: string) => void;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function ProductDetailPanel({ product, priceAlerts, onClose, onDeleted, onAlertToggle, onNotesUpdated }: Props) {
  const supabase = createClient();
  const [imgIndex, setImgIndex] = useState(0);
  const [notes, setNotes] = useState(product.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const images: string[] = (product.images as string[] | null) ?? (product.image_url ? [product.image_url] : []);
  const specs = normalizeSpecs((product.specs as Record<string, string>) ?? {});

  const cleanSpecs = Object.entries(specs).filter(([, v]) => {
    if (!v) return false;
    const s = String(v);
    if (s.length > 200) return false;
    if (s.includes('function(') || s.includes('.execute(') || s.includes('var ')) return false;
    return true;
  });

  // Sync notes if product changes (different product opened)
  useEffect(() => {
    setNotes(product.notes ?? '');
    setImgIndex(0);
    setConfirmDelete(false);
  }, [product.id, product.notes]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function saveNotes() {
    setSavingNotes(true);
    await supabase.from('products').update({ notes: notes || null }).eq('id', product.id);
    setSavingNotes(false);
    onNotesUpdated(product.id, notes);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', product.id);
    onDeleted(product.id);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel - slides in from left */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 sm:w-96 bg-surface shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border flex-shrink-0">
          <span className="text-xs tracking-widest uppercase text-muted">Product detail</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-muted hover:text-ink hover:bg-cream transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image carousel */}
        <div className="aspect-[3/4] bg-cream overflow-hidden relative flex-shrink-0">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[imgIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-warm-border">◻</div>
          )}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-5 flex flex-col gap-5 flex-1">
          {/* Store */}
          <div className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${product.store_domain}&sz=16`} alt="" className="w-4 h-4" />
            <span className="text-xs text-muted">{product.store_name}</span>
          </div>

          {/* Name */}
          <h2 className="text-sm font-medium text-ink leading-snug -mt-2">{product.name}</h2>

          {/* Price */}
          <div>
            {product.price == null ? (
              <span className="text-xs text-muted italic">No price</span>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-lg font-medium text-ink">{formatPrice(product.price, product.currency)}</span>
                {product.previous_price != null && product.previous_price !== product.price && (
                  <span className={`text-xs ${product.price < product.previous_price ? 'text-green-600' : 'text-red-500'}`}>
                    {product.price < product.previous_price ? '↓' : '↑'}
                    <span className="line-through ml-0.5 text-muted">{formatPrice(product.previous_price, product.currency)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Price history */}
          <div>
            <p className="text-xs tracking-widest uppercase text-muted mb-2">Price history</p>
            <PriceSparkline productUrl={product.product_url} currency={product.currency} />
          </div>

          {/* Buy button */}
          <a
            href={getAffiliateUrl(product.product_url, product.store_domain)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-terra text-white px-4 py-3 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors"
          >
            Buy on {product.store_name} →
          </a>

          {/* Specs */}
          {cleanSpecs.length > 0 && (
            <div>
              <p className="text-xs tracking-widest uppercase text-muted mb-2">Specifications</p>
              <div className="border-t border-warm-border divide-y divide-warm-border">
                {cleanSpecs.map(([key, val]) => (
                  <div key={key} className="flex gap-3 py-2">
                    <span className="text-xs text-muted flex-shrink-0 w-24">{key}</span>
                    <span className="text-xs text-ink break-words min-w-0">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs tracking-widest uppercase text-muted mb-2">Notes</p>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(); } }}
              placeholder="Add a note..."
              rows={3}
              className="w-full text-xs text-ink bg-cream border border-warm-border focus:border-terra focus:outline-none px-3 py-2 resize-none"
            />
            {savingNotes && <p className="text-[10px] text-muted mt-0.5">Saving...</p>}
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between pt-2 border-t border-warm-border">
            {/* Alert toggle */}
            <button
              onClick={onAlertToggle}
              className={`flex items-center gap-1.5 text-xs transition-colors ${priceAlerts ? 'text-terra' : 'text-muted hover:text-ink'}`}
            >
              <svg className="w-4 h-4" fill={priceAlerts ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {priceAlerts ? 'Alerts on' : 'Alerts off'}
            </button>

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">Sure?</span>
                <button onClick={handleDelete} disabled={deleting} className="bg-red-500 text-white text-xs px-2 py-1 hover:bg-red-600 disabled:opacity-50">
                  {deleting ? '...' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-ink">Cancel</button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-muted hover:text-red-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
