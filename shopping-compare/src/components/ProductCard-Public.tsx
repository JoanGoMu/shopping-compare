import { getAffiliateUrl } from '@/lib/affiliate';
import type { SharedProduct } from '@/lib/supabase/types';

interface Props {
  product: SharedProduct;
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function ProductCardPublic({ product: p }: Props) {
  const image = p.images?.[0] ?? p.image_url;
  const affiliateUrl = getAffiliateUrl(p.product_url, p.store_domain);

  return (
    <div className="bg-surface border border-warm-border flex flex-col">
      {/* Image */}
      <div className="aspect-[3/4] bg-cream overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-warm-border">◻</div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <p className="text-sm text-ink leading-snug line-clamp-2">{p.name}</p>

        <div className="flex items-center gap-1.5 text-xs text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://www.google.com/s2/favicons?domain=${p.store_domain}&sz=16`} alt="" className="w-3.5 h-3.5" />
          {p.store_name}
        </div>

        {p.price != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-terra font-medium text-sm">{formatPrice(p.price, p.currency)}</span>
            {p.previous_price != null && p.previous_price > p.price && (
              <span className="text-xs text-muted line-through">{formatPrice(p.previous_price, p.currency)}</span>
            )}
          </div>
        )}

        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-xs tracking-widest uppercase text-terra hover:underline"
        >
          Buy on {p.store_name} →
        </a>
      </div>
    </div>
  );
}
