import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type StatTone = 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'muted';

// Each tone is a soft pastel tile with dark ink on top (see --tile-* in index.css).
const TILE: Record<StatTone, string> = {
  emerald: 'bg-tile-green text-tile-foreground',
  sky: 'bg-tile-blue text-tile-foreground',
  amber: 'bg-tile-yellow text-tile-foreground',
  violet: 'bg-tile-violet text-tile-foreground',
  rose: 'bg-tile-pink text-tile-foreground',
  muted: 'border border-border bg-card text-card-foreground',
};

export interface StatItem {
  label: string;
  value: string | number;
  icon: Icon;
  tone?: StatTone;
  hint?: string;
  onClick?: () => void;
  /** Marks the tile as the current selection (used when tiles act as tabs). */
  active?: boolean;
}

/** A row of pastel stat tiles (shared look across the app's dashboards and modules). */
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
    <div className={cn('grid gap-3 sm:gap-4', columns)}>
      {items.map(({ label, value, icon: TileIcon, tone = 'muted', hint, onClick, active }) => {
        const Tag = onClick ? 'button' : 'div';
        return (
          <Tag
            key={label}
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={cn(
              'flex min-w-0 flex-col rounded-2xl p-4 text-left sm:p-5',
              TILE[tone],
              active && 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-background',
              onClick && 'transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium opacity-80">{label}</p>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone === 'muted' ? 'bg-muted text-muted-foreground' : 'bg-white/60 dark:bg-white/10')}>
                <TileIcon size={16} weight="bold" />
              </span>
            </div>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
            {hint && <p className="mt-auto pt-3 text-xs opacity-75">{hint}</p>}
          </Tag>
        );
      })}
    </div>
  );
}
