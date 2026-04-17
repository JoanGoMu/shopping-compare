import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';

export const metadata: Metadata = {
  title: 'Use CompareCart on your phone - CompareCart',
  description: 'Save products and compare prices on your phone. Works on Android and iPhone without needing an app.',
};

const EXTENSION_URL = 'https://chromewebstore.google.com/detail/comparecart-save-to-compa/emfdbbbkcaheaakehmkicmapjcilpdoj';

const ANDROID_STEPS = [
  {
    step: '1',
    title: 'Open comparecart.app in Chrome',
    detail: 'Make sure you are signed in to your account.',
  },
  {
    step: '2',
    title: 'Install the app',
    detail: 'Tap the three-dot menu (top right) then "Add to Home screen". CompareCart will appear on your home screen like a regular app.',
  },
  {
    step: '3',
    title: 'Browse any store',
    detail: 'Open any shopping site in Chrome (or any browser) and find a product you want to save.',
  },
  {
    step: '4',
    title: 'Tap the share icon and select CompareCart',
    detail: 'Tap the browser share button (the box with an arrow), then select "CompareCart" from the share sheet. The product is saved to your collection instantly.',
  },
];

const IOS_STEPS = [
  {
    step: '1',
    title: 'Open comparecart.app in Safari',
    detail: 'The share feature only works when CompareCart is installed from Safari - not Chrome on iOS.',
  },
  {
    step: '2',
    title: 'Tap the share icon and "Add to Home Screen"',
    detail: 'Tap the share icon at the bottom of Safari (the box with an arrow upward), scroll down and tap "Add to Home Screen", then tap "Add". CompareCart will appear on your home screen.',
  },
  {
    step: '3',
    title: 'Browse any store and share to CompareCart',
    detail: 'Open any store in Safari, find a product, tap the share icon, then select "CompareCart" from the list. The product gets saved to your collection.',
  },
];

const URL_STEPS = [
  {
    step: '1',
    title: 'Copy the product URL',
    detail: 'On any store page, tap the address bar and copy the full URL of the product.',
  },
  {
    step: '2',
    title: 'Open your CompareCart dashboard',
    detail: 'Go to comparecart.app/dashboard in any browser.',
  },
  {
    step: '3',
    title: 'Paste the URL and tap Add',
    detail: 'Paste the URL into the "Paste a product URL" field at the top of your dashboard and tap Add.',
  },
];

function StepList({ steps }: { steps: { step: string; title: string; detail: string }[] }) {
  return (
    <ol className="space-y-6">
      {steps.map(({ step, title, detail }) => (
        <li key={step} className="flex gap-5">
          <div className="shrink-0 w-8 h-8 rounded-full bg-terra text-white text-sm font-bold flex items-center justify-center">
            {step}
          </div>
          <div className="pt-0.5">
            <p className="text-sm font-semibold text-ink mb-1">{title}</p>
            <p className="text-sm text-muted leading-relaxed">{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function MobilePage() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs tracking-widest uppercase text-muted mb-3">Mobile</p>
        <h1 className="font-[var(--font-display)] italic text-3xl text-ink mb-3">
          Use CompareCart on your phone
        </h1>
        <p className="text-sm text-muted mb-12 leading-relaxed">
          No app store download needed. Install CompareCart as a web app and use the share sheet to save products from any store while you browse.
        </p>

        {/* Android */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-ink rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
            <h2 className="text-xs tracking-[0.3em] uppercase text-ink font-semibold">Android (Chrome)</h2>
          </div>
          <StepList steps={ANDROID_STEPS} />
          <div className="mt-6 p-4 bg-surface border border-warm-border text-sm text-muted leading-relaxed">
            <strong className="text-ink">Tip for Android:</strong> Once installed, CompareCart will show up in your share sheet every time you tap "Share" in any app - including Amazon, eBay, Instagram, or any browser.
          </div>
        </section>

        <div className="border-t border-warm-border mb-14" />

        {/* iOS */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-ink rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">i</div>
            <h2 className="text-xs tracking-[0.3em] uppercase text-ink font-semibold">iPhone (Safari)</h2>
          </div>
          <StepList steps={IOS_STEPS} />
          <div className="mt-6 p-4 bg-surface border border-warm-border text-sm text-muted leading-relaxed">
            <strong className="text-ink">Important:</strong> On iPhone, the share sheet integration only works in Safari. Chrome on iOS does not support web app install. Once added to your home screen from Safari, you can save products from any site you browse in Safari.
          </div>
        </section>

        <div className="border-t border-warm-border mb-14" />

        {/* Paste URL fallback */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs tracking-[0.3em] uppercase text-ink font-semibold">Any phone - Paste a URL</h2>
          </div>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Prefer not to install anything? Just copy the product URL and paste it directly in your dashboard.
          </p>
          <StepList steps={URL_STEPS} />
        </section>

        <div className="border-t border-warm-border mb-14" />

        {/* Limitations */}
        <section className="mb-14">
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted mb-4">Known limitations</h2>
          <div className="space-y-3 text-sm text-muted leading-relaxed">
            <p>
              <strong className="text-ink">Some stores block automated access</strong> - Zara, Sephora, Zalando, and The North Face use anti-bot protection. If you share or paste a URL from one of these stores, you may get an error. For those stores, the <a href={EXTENSION_URL} target="_blank" rel="noopener noreferrer" className="text-terra hover:underline">desktop Chrome extension</a> works reliably since it uses your real browser session.
            </p>
            <p>
              <strong className="text-ink">Chrome on iOS</strong> does not support web app installation or share sheet integration - use Safari instead.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-surface border border-warm-border p-6 text-center">
          <p className="text-sm font-medium text-ink mb-1">On desktop? Get the Chrome extension</p>
          <p className="text-xs text-muted mb-4">The extension works on every product page with one click - no URL copying needed.</p>
          <a
            href={EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-terra text-white px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors"
          >
            Add to Chrome - Free
          </a>
        </div>

        <p className="text-center mt-6 text-xs text-muted">
          Questions?{' '}
          <Link href="/help" className="text-terra hover:underline">Check the help page</Link>
          {' '}or{' '}
          <Link href="/feedback" className="text-terra hover:underline">send us a message</Link>.
        </p>
      </div>
    </PublicLayout>
  );
}
