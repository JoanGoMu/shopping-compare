'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'comparecart_extension_banner_dismissed';

export default function ExtensionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-terra/10 border border-terra/20 px-4 py-3 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-terra text-lg">↑</span>
        <p className="text-sm text-ink">
          <span className="font-medium">Also sign in to the extension</span>
          {' '}- click the CompareCart icon in your browser toolbar to save products from any store.
        </p>
      </div>
      <button onClick={dismiss} className="shrink-0 text-muted hover:text-ink text-xs tracking-widest uppercase transition-colors">
        Got it
      </button>
    </div>
  );
}
