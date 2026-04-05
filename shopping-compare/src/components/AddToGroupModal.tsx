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
  const [mode, setMode] = useState<'select' | 'new'>('select');
  const [newName, setNewName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    setError('');
    setLoading(true);

    let groupId = selectedGroupId;

    if (mode === 'new') {
      if (!newName.trim()) { setError('Enter a group name.'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase
        .from('comparison_groups')
        .insert({ name: newName.trim(), user_id: user!.id })
        .select('id')
        .single();
      if (err || !data) { setError('Failed to create group.'); setLoading(false); return; }
      groupId = data.id;
    } else {
      if (!groupId) { setError('Select a group.'); setLoading(false); return; }
    }

    const items = productIds.map((product_id, i) => ({ group_id: groupId, product_id, position: i }));
    const { error: err } = await supabase.from('comparison_items').upsert(items, { onConflict: 'group_id,product_id' });

    if (err) { setError('Failed to add products to group.'); setLoading(false); return; }

    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-900 mb-4">Add {productIds.length} products to a group</h2>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('select')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'select' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            Existing group
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'new' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            New group
          </button>
        </div>

        {mode === 'select' ? (
          existingGroups.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No groups yet. Create a new one.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {existingGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${selectedGroupId === g.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="font-medium text-gray-900">{g.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{g.comparison_items.length} items</span>
                </button>
              ))}
            </div>
          )
        ) : (
          <input
            type="text"
            autoFocus
            placeholder="Group name (e.g. Laptops under €800)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
