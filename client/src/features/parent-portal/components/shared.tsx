import { TrendUp, type Icon } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function TabStatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  positive = false,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: Icon;
  iconColor?: string;
  iconBg?: string;
  positive?: boolean;
}) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={16} className={iconColor} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground mt-2">{value}</p>
        {sub && (
          <p
            className={`text-xs mt-1.5 ${
              positive ? 'text-success font-medium flex items-center gap-1' : 'text-muted-foreground'
            }`}
          >
            {positive && <TrendUp size={12} weight="bold" />}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="py-4 px-5 border-b border-border/60 flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

export { StatusBadge } from '@/components/common/StatusBadge';
export { EmptyState } from '@/components/common/EmptyState';
