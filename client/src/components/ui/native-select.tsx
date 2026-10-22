import * as React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface NativeSelectProps extends React.ComponentProps<'select'> {
  containerClassName?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    // Extract width-related classes from className so the outer wrapper respects the intended width
    const widthMatch = className?.match(/\b((?:w|min-w|max-w)-(?:\[[^\]]+\]|[^\s]+)|flex-1|shrink-0)\b/g);
    const widthClasses = widthMatch ? widthMatch.join(' ') : 'w-full';

    return (
      <div className={cn('relative', widthClasses, containerClassName)}>
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-background [&>option]:text-foreground',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <CaretDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />
      </div>
    );
  },
);
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };

