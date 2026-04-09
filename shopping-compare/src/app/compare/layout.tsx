import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import ExtensionAuthBridge from '@/components/ExtensionAuthBridge';

export default async function CompareLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-surface border-b border-warm-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-[var(--font-display)] text-xl italic text-ink">{APP_NAME}</Link>
            <nav className="hidden sm:flex items-center gap-6">
              <Link href="/dashboard" className="text-xs tracking-widest uppercase text-muted hover:text-ink transition-colors">Collection</Link>
              <Link href="/compare" className="text-xs tracking-widest uppercase text-muted hover:text-ink transition-colors">Compare</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://buymeacoffee.com/joangm"
              target="_blank"
              rel="noopener noreferrer"
              title="CompareCart is free - if it saves you money, buy me a coffee!"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted hover:text-terra transition-colors"
            >
              <span>☕</span>
              <span className="tracking-wide">Support</span>
            </a>
            <span className="hidden sm:block text-xs text-muted">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
      <ExtensionAuthBridge />
    </div>
  );
}
