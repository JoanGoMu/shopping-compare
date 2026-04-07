'use client';

import { useTransition } from 'react';
import { togglePriceAlerts } from '@/app/dashboard/actions';

export default function PriceAlertsToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(() => togglePriceAlerts(!enabled));
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors disabled:opacity-50"
      title={enabled ? 'Price alerts on - click to disable' : 'Price alerts off - click to enable'}
    >
      <svg className={`w-4 h-4 ${enabled ? 'text-terra' : 'text-warm-border'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
      </svg>
      Price alerts {enabled ? 'on' : 'off'}
    </button>
  );
}
