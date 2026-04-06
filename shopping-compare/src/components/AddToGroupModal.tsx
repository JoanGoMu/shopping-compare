'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ComparisonGroup } from '@/lib/supabase/types';

interface Props {
  productIds: string[];
  existingGroups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
  onClose: () => void;
  onDone: () => void;
}

export default function AddToGroupModal({ productIds, existingGroups, onClose, onDone }: Props) {
  const [mode, setMode] = useState<'select' | 'new'>(existingGroups.length > 0 ? 'select' : 'new');
  const [newName, setNewName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    setError(''); setLoading(true);
    let groupId = selectedGroupId;

    if (mode === 'new') {
      if (!newName.trim()) { setError('Enter a group name.'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase.from('comparison_groups').insert({ name: newName.trim(), user_id: user!.id }).select('id').single();
      if (err || !data) { setError('Failed to create group.'); setLoading(false); return; }
      groupId = data.id;
    } else {
      if (!groupId) { setError('Select a group.'); setLoading(false); return; }
    }

    const items = productIds.map((product_id, i) => ({ group_id: groupId, product_id, position: i }));
    const { error: err } = await supabase.from('comparison_items').upsert(items, { onConflict: 'group_id,product_id' });
    if (err) { setError('Failed to save.'); setLoading(false); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-[var(--font-display)] italic text-xl text-ink mb-1">Save to group</h2>
        <p className="text-xs text-muted mb-5">{productIds.length} products selected</p>

        {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-4">{error}</p>}

        <div className="flex gap-2 mb-4">
          {(['select', 'new'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs tracking-widest uppercase border transition-colors ${mode === m ? 'bg-terra text-white border-terra' : 'border-warm-border text-muted hover:border-muted'}`}
            >
              {m === 'select' ? 'Existing' : 'New group'}
            </button>
          ))}
        </div>

        {mode === 'select' ? (
          existingGroups.length === 0 ? (
            <p className="text-xs text-muted text-center py-6 italic">No groups yet.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {existingGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left px-4 py-3 text-sm border transition-colors ${selectedGroupId === g.id ? 'border-terra bg-terra-light text-terra' : 'border-warm-border hover:border-muted text-ink'}`}
                >
                  <span>{g.name}</span>
                  <span className="text-muted text-xs ml-2">{g.comparison_items.length} items</span>
                </button>
              ))}
            </div>
          )
        ) : (
          <input
            type="text" autoFocus
            placeholder="e.g. Summer dresses under €100"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border border-warm-border px-3 py-2.5 text-sm focus:outline-none focus:border-terra"
          />
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-warm-border text-xs tracking-widest uppercase text-muted hover:border-muted transition-colors">Cancel</button>
          <button
            onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 bg-terra text-white text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
