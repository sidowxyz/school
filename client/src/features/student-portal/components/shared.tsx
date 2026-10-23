import { TrendUp, type Icon } from '@phosphor-icons/react';

export function TabStatCard({
  title, value, sub, icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10', positive = false,
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
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
      {sub && (
        <p className={`text-xs mt-1.5 ${positive ? 'text-primary font-medium flex items-center gap-1' : 'text-muted-foreground'}`}>
          {positive && <TrendUp size={12} weight="bold" />}{sub}
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
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

export { StatusBadge } from '@/components/common/StatusBadge';
export { EmptyState } from '@/components/common/EmptyState';
