import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Shared look for the right-side drawers (Dialog and Sheet): a pastel icon tile
// in the header and titled sections for grouping form fields.

export const DRAWER_TINT = {
  blue: 'bg-tile-blue', green: 'bg-tile-green', yellow: 'bg-tile-yellow', pink: 'bg-tile-pink', violet: 'bg-tile-violet',
} as const;
export type DrawerTint = keyof typeof DRAWER_TINT;

export function DrawerIcon({ icon: Icon, tint = 'blue' }: { icon: ElementType; tint?: DrawerTint }) {
  return (
    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-tile-foreground', DRAWER_TINT[tint])}>
      <Icon size={20} weight="duotone" />
    </span>
  );
}

/** A titled group of fields inside a drawer form. */
export function FormSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4 rounded-2xl border border-border/70 bg-muted/25 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <Icon size={16} className="shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
