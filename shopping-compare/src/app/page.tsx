import Link from 'next/link';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const FEATURES = [
  {
    icon: '🛒',
    title: 'Save from any store',
    body: 'Install the browser extension and click "Save to Compare" on any product page. Works on Amazon, eBay, AliExpress, and thousands more.',
  },
  {
    icon: '⚖️',
    title: 'Compare side by side',
    body: 'Group products you want to compare and see them in a clean table. Filter by price, sort by any field, spot the best deal instantly.',
  },
  {
    icon: '🔍',
    title: 'All your research, one place',
    body: 'No more 20 browser tabs. Your basket holds everything you found across multiple sessions, devices, and stores.',
  },
];

const STEPS = [
  { step: '1', text: 'Install the Chrome extension' },
  { step: '2', text: 'Browse any shopping site and click "Save"' },
  { step: '3', text: 'Open your dashboard and compare' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">{APP_NAME}</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
            <Link
              href="/signup"
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            {APP_TAGLINE}
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
            Stop opening 20 browser tabs. Save products from Amazon, eBay, Zara, IKEA - wherever you shop - and compare them all in one clean view.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-indigo-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-indigo-700 transition-colors text-sm"
            >
              Start comparing for free
            </Link>
            <Link
              href="/login"
              className="bg-white text-gray-700 border border-gray-300 rounded-xl px-6 py-3 font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              I already have an account
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white border-y border-gray-200 py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-center text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-8">How it works</h2>
            <div className="flex flex-col sm:flex-row items-stretch">
              {STEPS.map((s, i) => (
                <div key={s.step} className="flex-1 flex items-start sm:items-center gap-4 px-6 py-4 sm:py-0 relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 text-xl">→</div>
                  )}
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {s.step}
                  </span>
                  <p className="text-sm text-gray-700">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-indigo-600 py-14 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to shop smarter?</h2>
          <p className="text-indigo-200 text-sm mb-6">Free to use. No credit card required.</p>
          <Link
            href="/signup"
            className="bg-white text-indigo-700 rounded-xl px-6 py-3 font-semibold hover:bg-indigo-50 transition-colors text-sm inline-block"
          >
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        {APP_NAME} - Compare products across any store
      </footer>
    </div>
  );
}
