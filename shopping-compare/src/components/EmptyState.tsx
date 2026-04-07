import AddByUrlForm from './AddByUrlForm';

export default function EmptyState() {
  return (
    <div className="text-center py-24 border border-dashed border-warm-border">
      <p className="text-xs tracking-[0.3em] uppercase text-terra mb-4">Your collection is empty</p>
      <h2 className="font-[var(--font-display)] italic text-2xl text-ink mb-3">Nothing saved yet</h2>
      <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed mb-8">
        Paste any product URL below to add it to your collection.
      </p>
      <AddByUrlForm variant="empty-state" />
      <p className="text-xs text-muted mt-6">
        Or install the browser extension to save products while you browse.
      </p>
    </div>
  );
}
