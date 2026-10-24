import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TINT = {
  blue: 'bg-tile-blue', green: 'bg-tile-green', yellow: 'bg-tile-yellow', pink: 'bg-tile-pink', violet: 'bg-tile-violet',
} as const;
export type Tint = keyof typeof TINT;

/** A titled card that groups related settings, in the same style as the dashboard panels. */
export function SettingsSection({
  icon: Icon,
  tint = 'blue',
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  icon?: ElementType;
  tint?: Tint;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Let a list run edge to edge under the header. */
  flush?: boolean;
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-border/70 bg-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-tile-foreground', TINT[tint])}>
              <Icon size={19} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={cn(flush ? 'mt-4 border-t border-border' : 'p-5 sm:p-6')}>{children}</div>
    </section>
  );
}

/** Label + control, wired together so the label names the control. */
export function SettingsField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-xs font-medium text-foreground/80">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
