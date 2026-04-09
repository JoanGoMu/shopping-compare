import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import type { SharedProduct } from '@/lib/supabase/types';

const FEATURES = [
  {
    icon: '✦',
    title: 'Save from any store',
    body: 'Install the browser extension and click "Save to Compare" on any product page. Works on any online store.',
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

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load recent shared comparisons for the homepage
  const { data: recentData } = await supabase
    .from('shared_comparisons')
    .select('slug, title, products, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  type RecentComparison = { slug: string; title: string; products: SharedProduct[]; created_at: string };
  const recent = (recentData ?? []) as RecentComparison[];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="bg-surface border-b border-warm-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <span className="font-[var(--font-display)] text-2xl italic tracking-wide text-ink shrink-0">{APP_NAME}</span>
          <nav className="flex items-center gap-5">
            <Link href="/explore" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Explore</Link>
            <Link href="/stores" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Stores</Link>
            <Link href="/deals" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Deals</Link>
            <a
              href="https://buymeacoffee.com/joangm"
              target="_blank"
              rel="noopener noreferrer"
              title="CompareCart is free - if it saves you money, buy me a coffee!"
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted hover:text-terra transition-colors"
            >
              <span>☕</span>
              <span className="tracking-wide">Support</span>
            </a>
            {user ? (
              <Link href="/dashboard" className="text-sm bg-terra text-white px-5 py-2.5 tracking-widest uppercase hover:bg-terra-dark transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase">Sign in</Link>
                <Link href="/signup" className="text-sm bg-terra text-white px-5 py-2.5 tracking-widest uppercase hover:bg-terra-dark transition-colors">
                  Start free
                </Link>
              </>
            )}
          </nav>
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
            Stop drowning in browser tabs. Save items from any store and compare them all in one clean view.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Link href="/dashboard" className="bg-terra text-white px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-terra-dark transition-colors">
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link href="/signup" className="bg-terra text-white px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-terra-dark transition-colors">
                  Start comparing free
                </Link>
                <Link href="/login" className="border border-warm-border text-ink px-8 py-3.5 text-sm tracking-widest uppercase hover:bg-surface transition-colors">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Recent comparisons from the community */}
        {recent.length > 0 && (
          <>
            <div className="max-w-5xl mx-auto px-6">
              <div className="border-t border-warm-border" />
            </div>
            <section className="max-w-5xl mx-auto px-6 py-16">
              <div className="flex items-baseline justify-between mb-8">
                <p className="text-xs tracking-[0.3em] uppercase text-muted">From the community</p>
                <Link href="/explore" className="text-xs text-terra hover:underline tracking-wide">See all →</Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recent.map((c) => {
                  const thumbs = c.products.slice(0, 3).map((p) => p.images?.[0] ?? p.image_url).filter(Boolean);
                  const stores = [...new Set(c.products.map((p) => p.store_name))].slice(0, 3).join(', ');
                  return (
                    <Link key={c.slug} href={`/c/${c.slug}`} className="bg-surface border border-warm-border hover:border-terra transition-colors p-4 flex flex-col gap-3">
                      <div className="flex gap-1">
                        {thumbs.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src!} alt="" className="w-16 h-20 object-cover bg-cream" referrerPolicy="no-referrer" />
                        ))}
                        {thumbs.length === 0 && <div className="w-full h-20 bg-cream flex items-center justify-center text-2xl text-warm-border">◻</div>}
                      </div>
                      <div>
                        <p className="text-xs text-muted">{c.products.length} products - {stores}</p>
                      </div>
                      <span className="text-xs text-terra tracking-wide uppercase">See comparison →</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}

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
        <Link href="/explore" className="hover:text-ink transition-colors">Explore</Link>
        <span className="mx-3">·</span>
        <Link href="/stores" className="hover:text-ink transition-colors">Stores</Link>
        <span className="mx-3">·</span>
        <Link href="/deals" className="hover:text-ink transition-colors">Deals</Link>
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
        <span className="mx-3">·</span>
        <a href="https://buymeacoffee.com/joangm" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">
          Buy me a coffee ☕
        </a>
      </footer>
    </div>
  );
}
