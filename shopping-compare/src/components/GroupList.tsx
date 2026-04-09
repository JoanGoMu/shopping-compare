'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ComparisonGroup } from '@/lib/supabase/types';
import { shareComparison, unshareComparison } from '@/app/compare/actions';

interface Props {
  groups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
  activeGroupId?: string;
  activeGroupProductCount?: number; // live count from CompareShell
}

export default function GroupList({ groups: initialGroups, activeGroupId, activeGroupProductCount }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  function toggleCheck(e: React.MouseEvent, groupId: string) {
    e.preventDefault();
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
    setConfirmBatchDelete(false);
  }

  function handleCompareSelected() {
    const ids = Array.from(checkedIds)
      .flatMap((gId) => groups.find((g) => g.id === gId)?.comparison_items.map((i) => i.product_id) ?? []);
    const unique = [...new Set(ids)];
    router.push(`/compare?ids=${unique.join(',')}`);
  }

  async function handleBatchShare() {
    setBatchLoading(true);
    await Promise.all(Array.from(checkedIds).map((gId) => shareComparison(gId)));
    setBatchLoading(false);
    setCheckedIds(new Set());
    router.refresh();
  }

  async function handleBatchUnshare() {
    setBatchLoading(true);
    // Find slugs for checked groups
    const { data } = await supabase
      .from('shared_comparisons')
      .select('slug')
      .in('group_id', Array.from(checkedIds));
    await Promise.all((data ?? []).map((row) => unshareComparison(row.slug)));
    setBatchLoading(false);
    setCheckedIds(new Set());
    router.refresh();
  }

  async function handleBatchDelete() {
    if (!confirmBatchDelete) { setConfirmBatchDelete(true); return; }
    setBatchLoading(true);
    const ids = Array.from(checkedIds);
    for (const gId of ids) {
      await supabase.from('comparison_items').delete().eq('group_id', gId);
      await supabase.from('comparison_groups').delete().eq('id', gId);
    }
    setGroups((prev) => prev.filter((g) => !checkedIds.has(g.id)));
    setCheckedIds(new Set());
    setConfirmBatchDelete(false);
    setBatchLoading(false);
    if (activeGroupId && checkedIds.has(activeGroupId)) router.push('/compare');
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
              {confirmDeleteId !== g.id && (
                <span className="text-muted shrink-0 ml-2">
                  {g.id === activeGroupId && activeGroupProductCount !== undefined
                    ? activeGroupProductCount
                    : g.comparison_items.length}
                </span>
              )}
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

      {checkedIds.size >= 1 && (
        <div className="mt-3 border-t border-warm-border pt-3 space-y-1">
          <p className="text-xs text-muted mb-2">{checkedIds.size} selected</p>

          {checkedIds.size >= 2 && (
            <button
              onClick={handleCompareSelected}
              disabled={batchLoading}
              className="w-full bg-terra text-white py-2 text-xs tracking-widest uppercase hover:bg-terra-dark transition-colors disabled:opacity-50"
            >
              Compare together
            </button>
          )}

          <button
            onClick={handleBatchShare}
            disabled={batchLoading}
            className="w-full border border-warm-border text-ink py-2 text-xs tracking-widest uppercase hover:border-muted transition-colors disabled:opacity-50"
          >
            {batchLoading ? 'Working...' : 'Share all'}
          </button>

          <button
            onClick={handleBatchUnshare}
            disabled={batchLoading}
            className="w-full border border-warm-border text-muted py-2 text-xs tracking-widest uppercase hover:border-muted transition-colors disabled:opacity-50"
          >
            {batchLoading ? 'Working...' : 'Unshare all'}
          </button>

          {confirmBatchDelete ? (
            <div className="flex gap-1">
              <button
                onClick={handleBatchDelete}
                disabled={batchLoading}
                className="flex-1 bg-red-500 text-white py-2 text-xs tracking-widest uppercase hover:bg-red-600 disabled:opacity-50"
              >
                {batchLoading ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmBatchDelete(false)}
                className="flex-1 border border-warm-border text-muted py-2 text-xs tracking-widest uppercase hover:border-muted"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleBatchDelete}
              disabled={batchLoading}
              className="w-full border border-red-200 text-red-500 py-2 text-xs tracking-widest uppercase hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Delete all
            </button>
          )}

          <button
            onClick={() => { setCheckedIds(new Set()); setConfirmBatchDelete(false); }}
            className="w-full text-xs text-muted hover:text-ink py-1"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
