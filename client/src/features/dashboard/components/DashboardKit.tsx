import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, CaretLeft, CaretRight, CheckSquareOffset, ClockCounterClockwise, Coins, GearSix, SpinnerGap, Student, UserCircle, WarningCircle, type Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_TOOLTIP } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import { TILE_FILLS, TILE_HSL, sameDay, timeAgo } from './dashboardUtils';
import { EmptyState } from '@/components/common/EmptyState';

// Shared pieces for every role's dashboard: pastel number tiles, white panels,
// a week calendar, quick actions, an activity feed and a donut breakdown.

export function DashboardLoading() {
  return <div className="flex items-center justify-center py-24"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
}

export function DashboardError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      <WarningCircle size={16} /> {message}
    </div>
  );
}

/** A big pastel number tile. */
export function KpiTile({ label, value, fill, icon: TileIcon, note, to, onClick }: {
  label: string; value: string | number; fill: string; icon: Icon; note?: string; to?: string; onClick?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Button
      variant="plain"
      type="button"
      onClick={onClick ?? (to ? () => navigate(to) : undefined)}
      className={cn(
        'group flex min-h-[148px] flex-col rounded-2xl p-5 text-left text-tile-foreground',
        to || onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : 'cursor-default',
        fill,
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 dark:bg-white/10">
          <TileIcon size={16} weight="bold" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{value}</p>
      <div className="mt-auto flex w-full items-center justify-between pt-3 text-xs">
        <span className="opacity-75">{note}</span>
        {(to || onClick) && <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-70" />}
      </div>
    </Button>
  );
}

export function KpiRow({ children, columns = 3 }: { children: ReactNode; columns?: 3 | 4 }) {
  return <div className={cn('grid gap-4', columns === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3')}>{children}</div>;
}

/** The white rounded panel every dashboard section sits in. */
export function Panel({ title, description, action, children, flush, fill, className }: {
  title?: string; description?: string; action?: ReactNode; children: ReactNode;
  /** Let a table run edge to edge under the header. */
  flush?: boolean;
  /** Stretch the body to the panel's full height (when it sits beside a taller panel). */
  fill?: boolean; className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden rounded-2xl border-border/70 shadow-none', fill && 'flex flex-col', className)}>
      {(title || action) && (
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <div>
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {action}
        </CardHeader>
      )}
      {flush ? <div className="border-t border-border">{children}</div> : <CardContent className={cn(!title && !action && 'pt-6', fill && 'flex-1')}>{children}</CardContent>}
    </Card>
  );
}

/** A small "View all →" style link button for panel headers. */
export function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="xs" onClick={() => navigate(to)}>
      {children} <ArrowRight size={13} />
    </Button>
  );
}

export function PanelEmpty({ text, action, icon }: { text: string; action?: ReactNode; icon?: Icon }) {
  return <EmptyState compact icon={icon} text={text} action={action} />;
}

export interface QuickAction { label: string; icon: Icon; to?: string; state?: unknown; onClick?: () => void }

/** A panel of two-column action buttons that fills its height; the first is the pastel "main" action. */
export function QuickActions({ actions, title = 'Quick actions', description }: { actions: QuickAction[]; title?: string; description?: string }) {
  const navigate = useNavigate();
  return (
    <Panel title={title} description={description} fill>
      <div className="grid h-full auto-rows-[minmax(3rem,4.5rem)] content-center grid-cols-2 gap-3">
        {actions.map(({ label, icon: ActionIcon, to, state, onClick }, i) => (
          <Button
            key={label}
            variant={i === 0 ? 'default' : 'outline'}
            onClick={onClick ?? (() => to && navigate(to, { state }))}
            className={cn('h-full min-h-12 justify-between rounded-xl px-4', i === 0 && 'bg-tile-pink text-tile-foreground shadow-none hover:bg-tile-pink/80')}
          >
            <span className="truncate">{label}</span> <ActionIcon size={16} weight="bold" className="shrink-0" />
          </Button>
        ))}
      </div>
    </Panel>
  );
}

// ─── Calendar ──────────────────────────────────────────────────────────────────

export interface CalendarItem { date: string; label: string; type: string }

const EVENT_STYLE: Record<string, string> = {
  Term: 'bg-tile-blue text-tile-foreground',
  Holiday: 'bg-tile-yellow text-tile-foreground',
  Event: 'bg-tile-pink text-tile-foreground',
};

/** Saturday of the week containing `d` (the school week runs Saturday to Thursday; Friday is off). */
function startOfWeek(d: Date) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 1) % 7));
  return out;
}

/** One week, Saturday to Friday, with the school's calendar items in their day. */
export function WeekCalendar({ items }: { items: CalendarItem[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const isThisWeek = sameDay(weekStart, startOfWeek(today));
  const shift = (weeks: number) => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + weeks * 7); return d; });
  const rangeLabel = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Panel
      title="Calendar"
      description={rangeLabel}
      action={
        <div className="flex items-center gap-1">
          {!isThisWeek && <Button variant="ghost" size="xs" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>}
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous week"><CaretLeft size={14} /></Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Next week"><CaretRight size={14} /></Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-7 overflow-hidden rounded-xl border border-border">
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            const dayItems = items.filter((it) => sameDay(new Date(it.date), d));
            return (
              <div key={d.toISOString()} className={cn('min-h-[148px] border-border', i > 0 && 'border-l', d.getDay() === 5 && 'bg-muted/60')}>
                <div className={cn('flex items-center justify-between border-b border-border px-2.5 py-2 text-xs', isToday && 'bg-primary/10')}>
                  <span className="font-medium text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full font-semibold tabular-nums', isToday ? 'bg-primary text-primary-foreground' : 'text-foreground')}>
                    {d.getDate()}
                  </span>
                </div>
                <div className="space-y-1.5 p-1.5">
                  {dayItems.map((it, k) => (
                    <p key={k} title={`${it.type}: ${it.label}`} className={cn('truncate rounded-md px-2 py-1 text-[11px] font-medium', EVENT_STYLE[it.type] ?? 'bg-muted text-foreground')}>
                      {it.label}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(EVENT_STYLE).map(([type, cls]) => (
          <span key={type} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm', cls)} />{type}</span>
        ))}
      </div>
    </Panel>
  );
}

// ─── Activity and breakdowns ───────────────────────────────────────────────────

// Keyed by audit module name; anything else gets a generic icon.
const ACTIVITY_ICON: Record<string, Icon> = {
  Student: Student, Students: Student, Fees: Coins, Finance: Coins, MonthlyFees: Coins,
  Attendance: CheckSquareOffset, User: UserCircle, Users: UserCircle, Settings: GearSix,
};

export interface ActivityItem { type: string; title: string; desc: string; time: string }

export function ActivityFeed({ items, title = 'Recent activity' }: { items: ActivityItem[]; title?: string }) {
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing new yet.</p>
      ) : (
        <div className="-mt-2 space-y-1">
          {items.slice(0, 6).map((n, i) => {
            const ActivityIcon = ACTIVITY_ICON[n.type] ?? ClockCounterClockwise;
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60">
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>
                  <ActivityIcon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.time)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/** A rounded donut with the total in the middle and a legend with percentages. */
export function DonutBreakdown({ title, description, data, centerLabel, emptyText, format = (n) => n.toLocaleString(), colors = TILE_HSL }: {
  title: string; description?: string; data: { name: string; value: number; color?: string }[]; centerLabel: string; emptyText: string;
  format?: (n: number) => string; colors?: string[];
}) {
  // Colour by original position (or the row's own colour) so a slice keeps its colour when others are empty.
  const rows = data.map((d, i) => ({ ...d, fill: d.color ?? colors[i % colors.length] })).filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  return (
    <Panel title={title} description={description}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88}
                  paddingAngle={rows.length > 1 ? 4 : 0} cornerRadius={8} stroke="none">
                  {rows.map((r, i) => <Cell key={i} fill={r.fill} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number | string) => (typeof v === 'number' ? format(v) : v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">{format(total)}</span>
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {rows.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center gap-2.5 text-sm">
                <span className="h-3.5 w-3.5 shrink-0 rounded" style={{ backgroundColor: c.fill }} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="tabular-nums text-muted-foreground">{format(c.value)}</span>
                <span className="w-10 text-right text-xs font-semibold tabular-nums">{total ? Math.round((c.value / total) * 100) : 0}%</span>
              </div>
            ))}
            {rows.length > 6 && <p className="text-xs text-muted-foreground">+{rows.length - 6} more</p>}
          </div>
        </>
      )}
    </Panel>
  );
}

/** A small pastel figure, used two-up inside side panels. */
export function MiniStat({ label, value, fill }: { label: string; value: string; fill: string }) {
  return (
    <div className={cn('rounded-xl p-3 text-tile-foreground', fill)}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** A thin labelled progress bar. */
export function ProgressLine({ label, percent }: { label: string; percent: number }) {
  const pct = Math.min(100, Math.max(0, percent || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** A status pill with a dot, like "● Active". */
export function DotPill({ tone, children }: { tone: 'success' | 'warning' | 'muted' | 'destructive'; children: ReactNode }) {
  const cls = {
    success: 'bg-success/10 text-success [&>span]:bg-success',
    warning: 'bg-warning/10 text-warning [&>span]:bg-warning',
    destructive: 'bg-destructive/10 text-destructive [&>span]:bg-destructive',
    muted: 'bg-muted text-muted-foreground [&>span]:bg-muted-foreground',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', cls)}>
      <span className="h-1.5 w-1.5 rounded-full" />
      {children}
    </span>
  );
}

/** This week's student attendance as an area chart. */
export function AttendancePanel({ weekly, rate }: { weekly: { day: string; present: number; absent: number; excused?: number }[]; rate?: number }) {
  const navigate = useNavigate();
  const hasData = weekly.some((d) => (d.present ?? 0) + (d.absent ?? 0) + (d.excused ?? 0) > 0);
  return (
    <Panel
      title="Attendance this week"
      description="Students present and absent each school day"
      action={hasData && rate !== undefined ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{rate}% present</span> : undefined}
    >
      {!hasData ? (
        <PanelEmpty
          text="No attendance has been taken this week."
          action={<Button variant="outline" size="xs" onClick={() => navigate('/attendance')}>Take attendance</Button>}
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={weekly} margin={{ left: -16, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={CHART_TOOLTIP} />
            <Area type="monotone" dataKey="present" name="Present" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#presentFill)" />
            <Area type="monotone" dataKey="absent" name="Absent" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

/** Students enrolled in each class, as labelled bars. */
export function ClassSizeBars({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  if (data.length === 0) return <PanelEmpty text="No students are in a class yet." />;
  return (
    <div className="space-y-3">
      {data.map((c) => {
        const pct = total ? Math.round((c.value / total) * 100) : 0;
        return (
          <div key={c.name} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 text-sm">
            <span className="truncate font-medium">{c.name}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/80" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-right tabular-nums text-muted-foreground">{c.value} · {pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
