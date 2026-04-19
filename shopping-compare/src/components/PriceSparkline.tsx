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

  const fmt = (p: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(p);

  const current = points[points.length - 1].price;
  const first = points[0].price;
  const trend = current < first ? 'down' : current > first ? 'up' : 'flat';
  const color = trend === 'down' ? '#16a34a' : trend === 'up' ? '#ef4444' : '#C4603C';

  // Compact layout: line with start/end price labels stacked below
  // Use viewBox for responsiveness - SVG scales to fit column width
  const VW = 100; // viewBox width
  const VH = 28;  // viewBox height for the line area
  const pad = 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (VW - pad * 2);
    const y = pad + (1 - (p.price - min) / range) * (VH - pad * 2);
    return { x, y, price: p.price, date: p.recorded_at };
  });

  return (
    <div className="w-full max-w-[140px]">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: 32 }}
      >
        {/* Line */}
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Dots */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="1.5" fill={color} />
            <title>{fmt(c.price)} - {new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</title>
          </g>
        ))}
      </svg>
      {/* Price labels below the chart */}
      <div className="flex justify-between items-baseline mt-0.5">
        <span className="text-[10px] text-muted">{fmt(first)}</span>
        <span className={`text-[10px] font-medium ${trend === 'down' ? 'text-green-600' : trend === 'up' ? 'text-red-500' : 'text-muted'}`}>{fmt(current)}</span>
      </div>
      <div className="text-[10px] text-muted mt-0.5">{points.length} prices tracked</div>
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
