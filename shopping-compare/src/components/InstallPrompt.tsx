'use client';

import { useEffect, useState } from 'react';

// BeforeInstallPromptEvent is not in the standard TypeScript DOM types yet
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Start hidden, show after check

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('pwa-install-dismissed')) return;

    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    if (ios) {
      // Only show iOS instructions on Safari (not Chrome on iOS which can't install PWAs)
      const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
      if (isSafari) {
        setIsIOS(true);
        setDismissed(false);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  }

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 bg-surface border border-warm-border shadow-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo-icon-192.png" alt="" width={36} height={36} className="shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">Add CompareCart to home screen</p>
            {isIOS ? (
              <p className="text-xs text-muted mt-0.5">
                Tap the share icon, then "Add to Home Screen".
              </p>
            ) : (
              <p className="text-xs text-muted mt-0.5">
                Save products faster from any browser.
              </p>
            )}
          </div>
        </div>
        <button onClick={dismiss} className="text-muted hover:text-ink text-lg leading-none shrink-0" aria-label="Dismiss">
          x
        </button>
      </div>
      {!isIOS && deferredPrompt && (
        <button
          onClick={install}
          className="mt-3 w-full bg-terra text-white py-2 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors"
        >
          Install
        </button>
      )}
    </div>
  );
}
