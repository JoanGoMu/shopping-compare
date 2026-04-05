export default function EmptyState() {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
      <div className="text-5xl mb-4">🛒</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Nothing saved yet</h2>
      <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
        Install the browser extension, browse any shopping site, and click the &quot;Save to Compare&quot; button on any product.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl px-5 py-3 text-sm font-medium">
        <span>Get the extension →</span>
        <span className="text-xs text-indigo-400">(coming soon)</span>
      </div>
    </div>
  );
}
