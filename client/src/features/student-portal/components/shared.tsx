import type { Icon } from '@phosphor-icons/react';

export function TabStatCard({
  title, value, sub, icon: Icon, iconColor = 'text-green-600', iconBg = 'bg-green-50', positive = false,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: Icon;
  iconColor?: string;
  iconBg?: string;
  /** Renders `sub` in green with an up-arrow, for trend callouts. */
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && (
        <p className={`text-xs mt-1.5 ${positive ? 'text-green-600 font-medium flex items-center gap-1' : 'text-gray-400'}`}>
          {positive && '▲ '}{sub}
        </p>
      )}
    </div>
  );
}

export function SectionCard({
  title, subtitle, action, children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {subtitle && <p className="text-sm text-gray-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  'Active': 'bg-green-100 text-green-700',
  'Graded': 'bg-green-100 text-green-700',
  'Submitted': 'bg-blue-100 text-blue-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Present': 'bg-green-100 text-green-700',
  'On Time': 'bg-green-100 text-green-700',
  'Returned': 'bg-gray-100 text-gray-600',
  'Paid': 'bg-green-100 text-green-700',
  'Absent': 'bg-red-100 text-red-600',
  'Overdue': 'bg-red-100 text-red-600',
  'Late': 'bg-amber-100 text-amber-700',
  'Due Soon': 'bg-amber-100 text-amber-700',
  'Due': 'bg-amber-100 text-amber-700',
  'Partially Paid': 'bg-amber-100 text-amber-700',
  'Excused': 'bg-blue-100 text-blue-700',
  'Fine Paid': 'bg-blue-100 text-blue-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{text}</p>;
}
