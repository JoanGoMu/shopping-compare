import Link from 'next/link';
import type { ComparisonGroup } from '@/lib/supabase/types';

interface Props {
  groups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
  activeGroupId?: string;
}

export default function GroupList({ groups, activeGroupId }: Props) {
  if (groups.length === 0) {
    return <p className="text-xs text-muted italic">No saved groups yet.</p>;
  }

  return (
    <div className="space-y-px">
      {groups.map((g) => (
        <Link
          key={g.id}
          href={`/compare?group=${g.id}`}
          className={`
            flex items-center justify-between px-3 py-3 text-xs transition-colors
            ${activeGroupId === g.id ? 'bg-terra-light text-terra border-l-2 border-terra' : 'text-ink hover:bg-surface border-l-2 border-transparent'}
          `}
        >
          <span className="truncate tracking-wide">{g.name}</span>
          <span className="text-muted shrink-0 ml-2">{g.comparison_items.length}</span>
        </Link>
      ))}
    </div>
  );
}
