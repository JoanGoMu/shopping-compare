'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ComparisonGroup } from '@/lib/supabase/types';

interface Props {
  groups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
  activeGroupId?: string;
}

export default function GroupList({ groups: initialGroups, activeGroupId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  function toggleCheck(e: React.MouseEvent, groupId: string) {
    e.preventDefault();
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  function handleCompareSelected() {
    const ids = Array.from(checkedIds)
      .flatMap((gId) => groups.find((g) => g.id === gId)?.comparison_items.map((i) => i.product_id) ?? []);
    const unique = [...new Set(ids)];
    router.push(`/compare?ids=${unique.join(',')}`);
  }

  async function handleDeleteGroup(e: React.MouseEvent, groupId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDeleteId !== groupId) { setConfirmDeleteId(groupId); return; }
    setDeletingId(groupId);
    setConfirmDeleteId(null);
    await supabase.from('comparison_items').delete().eq('group_id', groupId);
    await supabase.from('comparison_groups').delete().eq('id', groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setCheckedIds((prev) => { const n = new Set(prev); n.delete(groupId); return n; });
    setDeletingId(null);
    if (activeGroupId === groupId) router.push('/compare');
  }

  if (groups.length === 0) {
    return <p className="text-xs text-muted italic">No saved groups yet.</p>;
  }

  return (
    <div>
      <div className="space-y-px">
        {groups.map((g) => (
          <div key={g.id} className="group/item relative flex items-center">
            {/* Checkbox */}
            <button
              onClick={(e) => toggleCheck(e, g.id)}
              className={`shrink-0 w-4 h-4 border mr-2 flex items-center justify-center transition-colors ${checkedIds.has(g.id) ? 'bg-terra border-terra' : 'border-warm-border hover:border-muted bg-surface'}`}
              title="Select group"
            >
              {checkedIds.has(g.id) && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <Link
              href={`/compare?group=${g.id}`}
              className={`
                flex-1 flex items-center justify-between px-3 py-3 text-xs transition-colors pr-8
                ${activeGroupId === g.id ? 'bg-terra-light text-terra border-l-2 border-terra' : 'text-ink hover:bg-surface border-l-2 border-transparent'}
              `}
            >
              <span className="truncate tracking-wide">{g.name}</span>
              {confirmDeleteId !== g.id && <span className="text-muted shrink-0 ml-2">{g.comparison_items.length}</span>}
            </Link>

            {confirmDeleteId === g.id ? (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <button onClick={(e) => handleDeleteGroup(e, g.id)} disabled={deletingId === g.id} className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">Yes</button>
                <span className="text-warm-border text-xs">/</span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }} className="text-xs text-muted hover:text-ink">No</button>
              </div>
            ) : (
              <button
                onClick={(e) => handleDeleteGroup(e, g.id)}
                disabled={deletingId === g.id}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity disabled:opacity-30"
                title="Delete group"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {checkedIds.size >= 2 && (
        <div className="mt-3 border-t border-warm-border pt-3">
          <p className="text-xs text-muted mb-2">{checkedIds.size} groups selected</p>
          <button
            onClick={handleCompareSelected}
            className="w-full bg-terra text-white py-2 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors"
          >
            Compare together
          </button>
          <button
            onClick={() => setCheckedIds(new Set())}
            className="w-full mt-1 text-xs text-muted hover:text-ink py-1"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
