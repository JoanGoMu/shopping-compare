import Link from 'next/link';
import type { ComparisonGroup } from '@/lib/supabase/types';

interface Props {
  groups: (ComparisonGroup & { comparison_items: { product_id: string }[] })[];
  activeGroupId?: string;
}

export default function GroupList({ groups, activeGroupId }: Props) {
  if (groups.length === 0) {
    return <p className="text-xs text-gray-400 italic">No saved groups yet.</p>;
  }

  return (
    <div className="space-y-1">
      {groups.map((g) => (
        <Link
          key={g.id}
          href={`/compare?group=${g.id}`}
          className={`
            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors
            ${activeGroupId === g.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}
          `}
        >
          <span className="truncate">{g.name}</span>
          <span className="text-xs text-gray-400 shrink-0 ml-2">{g.comparison_items.length}</span>
        </Link>
      ))}
    </div>
  );
}
