import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-surface border-b border-warm-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo-icon.svg" alt="" width={28} height={28}/>
            <span className="font-[var(--font-display)] text-2xl italic tracking-wide text-ink">{APP_NAME}</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/explore" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Explore</Link>
            <Link href="/stores" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Stores</Link>
            <Link href="/deals" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Deals</Link>
            <Link href="/help" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Help</Link>
            <Link href="/mobile" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">On mobile</Link>
            <Link href="/feedback" className="text-sm text-muted hover:text-ink transition-colors tracking-wide uppercase hidden sm:block">Feedback</Link>
            <a
              href="https://buymeacoffee.com/joangm"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm text-muted hover:text-terra transition-colors"
            >
              ☕
            </a>
            <Link href="/signup" className="text-sm bg-terra text-white px-5 py-2 tracking-widest uppercase hover:bg-terra-dark transition-colors">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-warm-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted tracking-widest uppercase">
          <span>{APP_NAME} - Compare products across any store</span>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-ink transition-colors">Explore</Link>
            <Link href="/stores" className="hover:text-ink transition-colors">Stores</Link>
            <Link href="/deals" className="hover:text-ink transition-colors">Deals</Link>
            <Link href="/help" className="hover:text-ink transition-colors">Help</Link>
            <Link href="/mobile" className="hover:text-ink transition-colors">On mobile</Link>
            <Link href="/feedback" className="hover:text-ink transition-colors">Feedback</Link>
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <a href="https://buymeacoffee.com/joangm" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">
              Buy me a coffee ☕
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
