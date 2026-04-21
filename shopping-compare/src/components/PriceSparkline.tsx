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

  const fmt = (p: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(p);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const current = points[points.length - 1].price;
  const first = points[0].price;
  const trend = current < first ? 'down' : current > first ? 'up' : 'flat';
  const lineColor = trend === 'down' ? '#16a34a' : trend === 'up' ? '#ef4444' : '#C4603C';

  const VW = 300;
  const VH = 60;
  const padX = 4;
  const padY = 8;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (VW - padX * 2);
    const y = padY + (1 - (p.price - min) / range) * (VH - padY * 2);
    return { x, y, price: p.price, date: p.recorded_at };
  });

  // Show label at a point if price changed from previous point
  const labelPoints = coords.filter((c, i) => i === 0 || c.price !== coords[i - 1].price || i === coords.length - 1);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: 80 }}
      >
        {/* Fill area under line */}
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={[
            `${coords[0].x},${VH}`,
            ...coords.map((c) => `${c.x},${c.y}`),
            `${coords[coords.length - 1].x},${VH}`,
          ].join(' ')}
          fill="url(#sparkFill)"
        />
        {/* Line */}
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Dots + tooltips on all points */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="2" fill={lineColor} vectorEffect="non-scaling-stroke" />
            <title>{fmt(c.price)} - {fmtDate(c.date)}</title>
          </g>
        ))}
      </svg>

      {/* Price labels at change points */}
      <div className="relative w-full" style={{ height: 32 }}>
        {labelPoints.map((c, i) => {
          const pct = (c.x / VW) * 100;
          const isLast = i === labelPoints.length - 1;
          const isFirst = i === 0;
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{
                left: `${pct}%`,
                transform: isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                top: 0,
              }}
            >
              <span className={`text-[10px] font-medium leading-none ${isLast ? (trend === 'down' ? 'text-green-600' : trend === 'up' ? 'text-red-500' : 'text-muted') : 'text-muted'}`}>
                {fmt(c.price)}
              </span>
              <span className="text-[9px] text-muted leading-none mt-0.5">{fmtDate(c.date)}</span>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted mt-1">{points.length} prices tracked</div>
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
