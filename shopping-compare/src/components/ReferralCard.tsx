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
    <div className="mb-6 flex items-center gap-3 text-sm text-muted">
      <button
        onClick={handleCopy}
        className="text-xs border border-warm-border text-muted px-3 py-1.5 tracking-widest uppercase hover:border-terra hover:text-terra transition-colors"
      >
        {copied ? 'Link copied!' : 'Invite a friend'}
      </button>
      {count > 0 && (
        <span className="text-xs text-muted">{count} {count === 1 ? 'friend' : 'friends'} joined</span>
      )}
    </div>
  );
}
