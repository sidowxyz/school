import type { Icon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';

export type StatTone = 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'muted';

const CHIP: Record<StatTone, string> = {
  emerald: 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  sky: 'bg-sky-100/80 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
  amber: 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  violet: 'bg-violet-100/80 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  rose: 'bg-rose-100/80 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400',
  muted: 'bg-muted text-muted-foreground',
};

export interface StatItem {
  label: string;
  value: string | number;
  icon: Icon;
  tone?: StatTone;
  hint?: string;
  onClick?: () => void;
}

/** One panel of stats separated by hairlines (shared look across the app's dashboards). */
export default function StatStrip({ items }: { items: StatItem[] }) {
  const columns =
    items.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : items.length === 5
      ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
      : items.length === 6
      ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
      : 'grid-cols-2 lg:grid-cols-4';
  return (
    <Card className="overflow-hidden border-border bg-border shadow-sm">
      <div className={`grid gap-px ${columns}`}>
        {items.map(({ label, value, icon: Icon, tone = 'muted', hint, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className={`bg-card p-4 sm:p-5 ${onClick ? 'cursor-pointer hover:bg-muted/40 transition-colors' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${CHIP[tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
            {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
