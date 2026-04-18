'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PricePoint { price: number; recorded_at: string }

function Sparkline({ points, currency }: { points: PricePoint[]; currency: string }) {
  if (points.length < 2) return <span className="text-xs text-muted italic">Not enough data yet</span>;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const W = 160;
  const H = 36;
  const padX = 4;
  const padY = 14; // vertical padding for labels above/below the line

  const fmt = (p: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(p);

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (W - padX * 2);
    const y = padY + (1 - (p.price - min) / range) * (H - padY * 2);
    return { x, y, price: p.price, date: p.recorded_at };
  });

  const current = points[points.length - 1].price;
  const first = points[0].price;
  const trend = current < first ? 'down' : current > first ? 'up' : 'flat';
  const color = trend === 'down' ? '#16a34a' : trend === 'up' ? '#ef4444' : '#C4603C';

  // Show label at first and last point always; for intermediate points only when <= 4 total
  const showLabelAt = (i: number) =>
    i === 0 || i === points.length - 1 || points.length <= 4;

  // Position label above the dot when dot is in the lower half, below when in the upper half
  const labelY = (y: number) => y > H / 2 ? y - 6 : y + 14;

  // Anchor label text: first point left-aligned, last point right-aligned, others centered
  const labelAnchor = (i: number) =>
    i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';

  return (
    <div>
      <svg
        width={W}
        height={H + padY}
        viewBox={`0 0 ${W} ${H + padY}`}
        className="overflow-visible block"
        style={{ marginBottom: 2 }}
      >
        {/* Line */}
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots and labels */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="2.5" fill={color} />
            {showLabelAt(i) && (
              <text
                x={c.x}
                y={labelY(c.y)}
                textAnchor={labelAnchor(i)}
                fontSize="8"
                fill="#666"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              >
                {fmt(c.price)}
              </text>
            )}
            {/* Tooltip on hover */}
            <title>{fmt(c.price)} - {new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</title>
          </g>
        ))}
      </svg>
      <div className="text-xs text-muted">{points.length} price{points.length === 1 ? '' : 's'} tracked</div>
    </div>
  );
}

export default function PriceSparkline({ productUrl, currency }: { productUrl: string; currency: string }) {
  const [points, setPoints] = useState<PricePoint[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('product_url', productUrl)
      .order('recorded_at', { ascending: true })
      .limit(30)
      .then(({ data }) => setPoints(data ?? []));
  }, [productUrl]);

  if (points === null) return <span className="text-xs text-muted">Loading...</span>;
  if (points.length === 0) return <span className="text-xs text-muted italic">No history yet</span>;

  return <Sparkline points={points} currency={currency} />;
}
