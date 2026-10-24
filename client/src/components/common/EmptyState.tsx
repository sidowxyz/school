import type { ReactNode } from 'react';
import { ArrowClockwise, Tray, WarningCircle, type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';

// The one placeholder for empty lists and tables: a pastel icon tile with two
// tilted tiles behind it (the dashboard colours), a short title, a hint about
// what to do next and an optional button.

const TINTS = {
  blue: ['bg-tile-blue', 'bg-tile-violet', 'bg-tile-green'],
  green: ['bg-tile-green', 'bg-tile-blue', 'bg-tile-yellow'],
  yellow: ['bg-tile-yellow', 'bg-tile-pink', 'bg-tile-green'],
  pink: ['bg-tile-pink', 'bg-tile-violet', 'bg-tile-yellow'],
  violet: ['bg-tile-violet', 'bg-tile-pink', 'bg-tile-blue'],
} as const;
export type EmptyTint = keyof typeof TINTS;

export interface EmptyStateProps {
  /** Short headline, e.g. "No students yet". */
  title?: string;
  /** What it means or what to do next. */
  text?: string;
  /** Older name for `text`, kept so existing call sites keep working. */
  message?: string;
  icon?: Icon;
  tint?: EmptyTint;
  /** A button or two, e.g. "Add student" or "Clear filters". */
  action?: ReactNode;
  /** Smaller version for panels and cards. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  text,
  message,
  icon: IconComponent = Tray,
  tint = 'blue',
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  const body = text ?? message ?? (title ? undefined : 'Nothing here yet.');
  const [main, back, front] = TINTS[tint];
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'gap-2 py-8' : 'gap-2.5 py-14', className)}
    >
      <div className={cn('relative', compact ? 'mb-1' : 'mb-3')}>
        {!compact && (
          <>
            <span aria-hidden className={cn('absolute -left-5 top-3 h-11 w-11 -rotate-12 rounded-2xl opacity-70', back)} />
            <span aria-hidden className={cn('absolute -right-5 top-1 h-9 w-9 rotate-12 rounded-xl opacity-70', front)} />
          </>
        )}
        <span
          className={cn(
            'relative flex items-center justify-center text-tile-foreground ring-4 ring-card',
            compact ? 'h-11 w-11 rounded-xl' : 'h-16 w-16 rounded-2xl shadow-sm',
            main,
          )}
        >
          <IconComponent size={compact ? 20 : 28} weight="duotone" />
        </span>
      </div>
      {title && <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>{title}</p>}
      {body && (
        <p className={cn('max-w-sm', title ? 'text-sm text-muted-foreground' : 'text-sm font-medium text-foreground/70')}>{body}</p>
      )}
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Something went wrong loading the list; offers a retry when there is one. */
export function ErrorState({ text, onRetry, compact }: { text: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <EmptyState
      icon={WarningCircle}
      tint="pink"
      title="Couldn't load this"
      text={text}
      compact={compact}
      action={onRetry && <Button variant="outline" size="sm" onClick={onRetry}><ArrowClockwise size={15} /> Try again</Button>}
    />
  );
}

/** An EmptyState (or ErrorState) spanning a whole table row. */
export function TableEmptyRow({ colSpan, children, ...props }: EmptyStateProps & { colSpan: number; children?: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        {children ?? <EmptyState {...props} />}
      </TableCell>
    </TableRow>
  );
}

// Varied bar widths so the skeleton reads like real rows, not a grid.
const BAR_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/12', 'w-7/12'];

/** Placeholder rows shown while a table loads. */
export function TableLoadingRows({ columns, rows = 5, avatar = false }: { columns: number; rows?: number; avatar?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r} aria-hidden className="hover:bg-transparent">
          {Array.from({ length: columns }, (_, c) => (
            <TableCell key={c} className="py-4">
              <div className="flex items-center gap-3">
                {avatar && c === 0 && <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />}
                <span
                  className={cn('block h-3 animate-pulse rounded-full bg-muted', BAR_WIDTHS[(r + c) % BAR_WIDTHS.length])}
                  style={{ animationDelay: `${(r * columns + c) * 40}ms` }}
                />
              </div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Placeholder lines for non-table lists while they load. */
export function ListLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3 px-5 py-3.5" aria-hidden>
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <span className={cn('block h-3 animate-pulse rounded-full bg-muted', BAR_WIDTHS[r % BAR_WIDTHS.length])} />
            <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default EmptyState;
