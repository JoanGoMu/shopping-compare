'use client';

import { useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { submitFeedback } from './actions';

export default function FeedbackPage() {
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    const result = await submitFeedback(category, message, email);
    if (result.ok) {
      setStatus('success');
      setCategory('');
      setEmail('');
      setMessage('');
    } else {
      setStatus('error');
      setError(result.error ?? 'Something went wrong');
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs tracking-widest uppercase text-muted mb-3">CompareCart</p>
        <h1 className="font-[var(--font-display)] italic text-3xl text-ink mb-2">Share your feedback</h1>
        <p className="text-sm text-muted mb-10">Found a bug? Have a suggestion? We read every message.</p>

        {status === 'success' ? (
          <div className="border border-warm-border bg-surface p-8 text-center">
            <p className="font-[var(--font-display)] italic text-2xl text-ink mb-2">Thank you!</p>
            <p className="text-sm text-muted">Your feedback has been received. We appreciate you taking the time.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-xs tracking-widest uppercase text-terra hover:underline"
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs tracking-widest uppercase text-muted mb-2">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
                className="w-full border border-warm-border bg-surface px-3 py-3 text-sm focus:outline-none focus:border-terra text-ink"
              >
                <option value="" disabled>Select a category</option>
                <option value="bug">Bug report</option>
                <option value="feature">Feature request</option>
                <option value="general">General feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-muted mb-2">
                Email <span className="normal-case tracking-normal">(optional - if you want a reply)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-warm-border bg-surface px-3 py-3 text-sm focus:outline-none focus:border-terra"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-muted mb-2">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Tell us what's on your mind..."
                className="w-full border border-warm-border bg-surface px-3 py-3 text-sm focus:outline-none focus:border-terra resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-terra text-white px-8 py-3 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending...' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
