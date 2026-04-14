'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push('/dashboard'); router.refresh(); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-warm-border px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-icon.svg" alt="" width={28} height={28}/>
          <span className="font-[var(--font-display)] text-2xl italic tracking-wide text-ink">{APP_NAME}</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="font-[var(--font-display)] italic text-3xl text-ink mb-2">Welcome back</h1>
          <p className="text-sm text-muted mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

            <div>
              <label className="block text-xs tracking-widest uppercase text-muted mb-2">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-warm-border bg-surface px-3 py-3 text-sm focus:outline-none focus:border-terra"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-muted mb-2">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-warm-border bg-surface px-3 py-3 text-sm focus:outline-none focus:border-terra"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-terra text-white py-3 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-muted pt-2">
              No account?{' '}
              <Link href="/signup" className="text-terra hover:underline">Create one free</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
