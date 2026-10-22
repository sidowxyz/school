import { SpinnerGap, Megaphone, Calendar, CurrencyDollar, Sun, Info } from '@phosphor-icons/react';
import { SectionCard, EmptyState } from '../shared';
import { parentPortalApi, type ParentNotice } from '../../api/parentPortalApi';
import { useGuardianResource } from '../../hooks/useGuardianResource';

const ICONS: Record<string, React.ElementType> = {
  Academic: Megaphone,
  Event: Calendar,
  Fee: CurrencyDollar,
  Holiday: Sun,
  General: Info,
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export default function NoticesTab() {
  const { data, loading, error } = useGuardianResource(parentPortalApi.getNotices);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-green-600" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  const notices: ParentNotice[] = data ?? [];

  return (
    <SectionCard title="School Notices" subtitle="Published announcements">
      {notices.length === 0 ? (
        <EmptyState text="There are no published notices right now." />
      ) : (
        <div className="space-y-2">
          {notices.map((n) => {
            const Icon = ICONS[n.category ?? ''] ?? Megaphone;
            return (
              <div key={n._id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                    {n.category && <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">{n.category}</span>}
                  </div>
                  {n.content && <p className="text-sm text-gray-600 mt-1">{n.content}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.published_at ?? n.createDate)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
