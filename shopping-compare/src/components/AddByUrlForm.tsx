'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addProductByUrl } from '@/app/dashboard/actions';

interface Props {
  variant: 'toolbar' | 'empty-state';
}

export default function AddByUrlForm({ variant }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || status === 'loading') return;
    setStatus('loading');
    setError('');

    const result = await addProductByUrl(url.trim());

    if (result.ok) {
      setUrl('');
      setStatus('success');
      router.refresh();
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setError(result.error ?? 'Something went wrong');
      setStatus('error');
    }
  }

  if (variant === 'toolbar') {
    return (
      <div className="w-full sm:w-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="url"
            placeholder="Paste a product URL..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (status === 'error') setStatus('idle'); }}
            className="border border-warm-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-terra w-full sm:w-64"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !url.trim()}
            className="bg-terra text-white px-4 py-2 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'loading' ? 'Adding...' : status === 'success' ? 'Saved!' : 'Add'}
          </button>
        </form>
        {status === 'error' && (
          <p className="text-xs text-red-600 mt-1.5">{error}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Paste a product URL..."
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (status === 'error') setStatus('idle'); }}
          className="flex-1 border border-warm-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:border-terra"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !url.trim()}
          className="bg-terra text-white px-4 py-2.5 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {status === 'loading' ? 'Adding...' : status === 'success' ? 'Saved!' : 'Add'}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </form>
  );
}
