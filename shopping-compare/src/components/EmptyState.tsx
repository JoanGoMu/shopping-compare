export default function EmptyState() {
  return (
    <div className="text-center py-24 border border-dashed border-warm-border">
      <p className="text-xs tracking-[0.3em] uppercase text-terra mb-4">Your collection is empty</p>
      <h2 className="font-[var(--font-display)] italic text-2xl text-ink mb-3">Nothing saved yet</h2>
      <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
        Install the browser extension, browse any store, and click the &ldquo;Save to Compare&rdquo; button that appears on product pages.
      </p>
      <div className="mt-8 inline-flex items-center gap-2 border border-terra text-terra px-5 py-2.5 text-xs tracking-widest uppercase">
        <span>Get the extension</span>
        <span className="text-terra/50">— coming soon</span>
      </div>
    </div>
  );
}
