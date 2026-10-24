import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// One button style for the whole app: rounded like the cards and tiles, a soft
// shadow on the main action, and a small press effect.
//
// Pick by role, not looks:
//   default     – the main action on a page or form (Add, Save, Register)
//   outline     – secondary actions next to it (Refresh, Export, Print, Cancel)
//   soft        – a light green action inside a card or list (View all, Clear filters)
//   secondary   – a quiet grey action
//   ghost       – icon buttons and low-key actions in rows and toolbars
//   destructive – deletes and other actions that can't be undone
const buttonVariants = cva(
  [
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold',
    'ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm shadow-destructive/25 hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/25',
        outline: 'border border-border bg-card text-foreground shadow-sm shadow-black/[0.03] hover:border-foreground/20 hover:bg-muted/60',
        secondary: 'bg-muted text-foreground hover:bg-muted/70',
        soft: 'bg-primary/10 text-primary hover:bg-primary/15',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100',
        // Passes the caller's classes through untouched (cards, chips and other
        // clickable things that aren't styled as buttons).
        plain: '',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 rounded-lg px-3 text-[13px]',
        xs: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(variant === 'plain' ? '' : buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
