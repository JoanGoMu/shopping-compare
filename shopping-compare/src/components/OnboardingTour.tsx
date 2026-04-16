'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'comparecart_tour_done';

const STEPS = [
  {
    title: 'Welcome to CompareCart',
    body: 'Save products from any store and compare them side by side. Let\'s show you how in 3 quick steps.',
    cta: 'Get started',
  },
  {
    title: 'Step 1 - Install the extension',
    body: 'The browser extension adds a "Save to Compare" button on any product page. It takes 10 seconds to install.',
    cta: 'Next',
    link: {
      label: 'Add to Chrome - Free',
      href: 'https://chromewebstore.google.com/detail/comparecart-save-to-compa/emfdbbbkcaheaakehmkicmapjcilpdoj',
    },
  },
  {
    title: 'Step 2 - Save products',
    body: 'Browse any store - Zara, ASOS, Amazon, IKEA, and more. Click the "Save to Compare" button on any product page.',
    cta: 'Next',
  },
  {
    title: 'Step 3 - Compare side by side',
    body: 'Select products from your collection and open them in the Compare view. Prices, specs, and images - all in one table.',
    cta: 'Done - start saving',
    link: {
      label: 'Go to Compare',
      href: '/compare',
    },
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setStep(0);
    }
  }, []);

  function advance() {
    if (step === null) return;
    if (step >= STEPS.length - 1) {
      localStorage.setItem(STORAGE_KEY, '1');
      setStep(null);
    } else {
      setStep(step + 1);
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setStep(null);
  }

  if (step === null) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface border border-warm-border max-w-sm w-full p-8 relative">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted hover:text-ink text-lg leading-none"
          aria-label="Dismiss tour"
        >
          ×
        </button>

        <p className="text-xs tracking-[0.25em] uppercase text-terra mb-3">
          {step + 1} / {STEPS.length}
        </p>

        <h2 className="font-[var(--font-display)] italic text-xl text-ink mb-3">
          {current.title}
        </h2>

        <p className="text-sm text-muted leading-relaxed mb-6">
          {current.body}
        </p>

        <div className="flex flex-col gap-2">
          {current.link && (
            <a
              href={current.link.href}
              target={current.link.href.startsWith('http') ? '_blank' : undefined}
              rel={current.link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-center border border-warm-border text-ink px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-cream transition-colors"
            >
              {current.link.label}
            </a>
          )}
          <button
            onClick={advance}
            className="bg-terra text-white px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors"
          >
            {current.cta}
          </button>
        </div>

        <div className="flex gap-1.5 mt-6 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-6 transition-colors ${i === step ? 'bg-terra' : 'bg-warm-border'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
