'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const MESSAGES: Record<string, { text: string; type: 'success' | 'error' | 'info' }> = {
  success: { text: 'Product saved to your collection!', type: 'success' },
  duplicate: { text: 'This product is already in your collection.', type: 'info' },
  'error:blocked': { text: 'This site blocks automated access - try the desktop extension.', type: 'error' },
  'error:extract': { text: 'Could not read product details from that page.', type: 'error' },
  'error:fetch': { text: 'Could not reach that page. Check the URL and try again.', type: 'error' },
  'error:no-url': { text: 'No product URL was shared.', type: 'error' },
  'error:save': { text: 'Failed to save product. Please try again.', type: 'error' },
};

export default function ShareToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const share = searchParams.get('share');
    const reason = searchParams.get('reason');
    if (!share) return;

    const key = reason ? `${share}:${reason}` : share;
    const msg = MESSAGES[key] ?? MESSAGES[share];
    if (msg) setMessage(msg);

    // Remove the query params without triggering a navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete('share');
    params.delete('reason');
    const newUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
    window.history.replaceState(null, '', newUrl);

    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [searchParams, pathname]);

  if (!message) return null;

  const colors = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
  };

  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto sm:max-w-sm z-50 border px-4 py-3 text-sm shadow-md ${colors[message.type]}`}>
      {message.text}
    </div>
  );
}
