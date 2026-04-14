'use client';

import { useState } from 'react';

export default function ReferralCard({ userId, count }: { userId: string; count: number }) {
  const [copied, setCopied] = useState(false);
  const link = `https://comparecart.app/signup?ref=${userId}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 border border-warm-border bg-surface px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs tracking-widest uppercase text-muted mb-1">Invite friends</p>
        <p className="text-sm text-ink truncate">{link}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {count > 0 && (
          <span className="text-xs text-muted">
            <span className="text-ink font-medium">{count}</span> {count === 1 ? 'friend' : 'friends'} joined
          </span>
        )}
        <button
          onClick={handleCopy}
          className="text-xs bg-terra text-white px-4 py-2 tracking-widest uppercase hover:bg-terra-dark transition-colors"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
