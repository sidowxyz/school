import type { Icon } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tray } from '@phosphor-icons/react';

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
              positive ? 'text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1' : 'text-muted-foreground'
            }`}
          >
            {positive && '▲ '}
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

export function StatusBadge({ status }: { status: string }) {
  const norm = (status || '').toLowerCase();

  if (['active', 'present', 'paid', 'a', 'a+'].includes(norm)) {
    return (
      <Badge variant="success" className="text-[11px] font-medium gap-1.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {status}
      </Badge>
    );
  }
  if (['absent', 'overdue', 'unpaid', 'failed', 'f'].includes(norm)) {
    return (
      <Badge variant="destructive" className="text-[11px] font-medium gap-1.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {status}
      </Badge>
    );
  }
  if (['late', 'due', 'partially paid', 'partially_paid', 'warning', 'c', 'd'].includes(norm)) {
    return (
      <Badge variant="warning" className="text-[11px] font-medium gap-1.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {status === 'partially_paid' ? 'Partially Paid' : status}
      </Badge>
    );
  }
  if (['excused', 'b', 'b+'].includes(norm)) {
    return (
      <Badge variant="secondary" className="text-[11px] font-medium gap-1.5 py-0.5 bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[11px] font-medium gap-1.5 py-0.5 text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      {status || 'Unknown'}
    </Badge>
  );
}

export function EmptyState({ text, icon: Icon = Tray }: { text: string; icon?: Icon }) {
  return (
    <div className="py-10 text-center flex flex-col items-center justify-center space-y-2.5">
      <div className="h-10 w-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
        <Icon size={18} />
      </div>
      <p className="text-xs text-muted-foreground max-w-xs">{text}</p>
    </div>
  );
}
