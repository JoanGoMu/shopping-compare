import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

const FEATURES = [
  {
    icon: '✦',
    title: 'Save from any store',
    body: 'Install the browser extension and click "Save to Compare" on any product page. Works on ASOS, Zara, Amazon, eBay and thousands more.',
  },
  {
    icon: '✦',
    title: 'Compare side by side',
    body: 'Group pieces you want to compare and see them in a clean table. Filter by price, spot the best deal across every store at once.',
  },
  {
    icon: '✦',
    title: 'All your research, one place',
    body: 'No more 20 open tabs. Your basket holds everything you found across multiple sessions, devices, and stores.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="bg-surface border-b border-warm-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-[var(--font-display)] text-2xl italic tracking-wide text-ink">{APP_NAME}</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase">Sign in</Link>
            <Link
              href="/signup"
              className="text-sm bg-terra text-white px-5 py-2.5 tracking-widest uppercase hover:bg-terra-dark transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-terra mb-5">The smarter way to shop</p>
          <h1 className="font-[var(--font-display)] text-5xl sm:text-6xl text-ink leading-tight italic mb-6">
            Compare products<br />across every store
          </h1>
          <p className="text-muted max-w-xl mx-auto leading-relaxed mb-10">
            Stop drowning in browser tabs. Save pieces from Zara, ASOS, Amazon, or wherever you shop, and compare them all in one clean view.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-terra text-white px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-terra-dark transition-colors"
            >
              Start comparing free
            </Link>
            <Link
              href="/login"
              className="border border-warm-border text-ink px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-surface transition-colors"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="border-t border-warm-border" />
        </div>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs tracking-[0.3em] uppercase text-muted mb-10 text-center">How it works</p>
          <div className="grid sm:grid-cols-3 gap-px bg-warm-border">
            {[
              { n: '01', text: 'Install the Chrome extension' },
              { n: '02', text: 'Browse any store and click "Save"' },
              { n: '03', text: 'Compare everything side by side' },
            ].map((s) => (
              <div key={s.n} className="bg-cream px-8 py-10">
                <p className="font-[var(--font-display)] text-4xl italic text-terra mb-3">{s.n}</p>
                <p className="text-sm text-ink leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-surface border-y border-warm-border py-16">
          <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-3 gap-12">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <p className="text-terra text-xs mb-4">{f.icon}</p>
                <h3 className="font-[var(--font-display)] italic text-xl text-ink mb-3">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="font-[var(--font-display)] italic text-3xl text-ink mb-4">Ready to shop smarter?</p>
          <p className="text-muted text-sm mb-8">Free to use. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-block bg-terra text-white px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-terra-dark transition-colors"
          >
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-warm-border py-6 text-center text-xs text-muted tracking-widest uppercase">
        {APP_NAME} — Compare products across any store
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  );
}
