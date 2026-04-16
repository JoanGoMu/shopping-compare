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

  const W = 120;
  const H = 32;
  const pad = 3;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (p.price - min) / range) * (H - pad * 2);
    return { x, y, price: p.price, date: p.recorded_at };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const current = points[points.length - 1].price;
  const first = points[0].price;
  const trend = current < first ? 'down' : current > first ? 'up' : 'flat';
  const color = trend === 'down' ? '#16a34a' : trend === 'up' ? '#ef4444' : '#C4603C';

  const fmt = (p: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(p);

  return (
    <div className="flex items-center gap-3">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Current price dot */}
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2.5" fill={color} />
      </svg>
      <div className="text-xs text-muted leading-tight">
        <div className="text-ink font-medium">{fmt(min)} - {fmt(max)}</div>
        <div>{points.length} price{points.length === 1 ? '' : 's'} tracked</div>
      </div>
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
