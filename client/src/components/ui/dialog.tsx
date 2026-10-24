import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { DrawerIcon, type DrawerTint } from './drawer-kit';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[100] h-dvh bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
    /** Render as a small centred dialog (confirmations) instead of a right-side drawer. */
    centered?: boolean;
  }
>(({ className, children, hideClose, centered, ...props }, ref) => {
  // Drawers are full height and one standard width, so per-call `max-h-*`
  // caps, narrow `max-w-*` widths and padding resets from the old modal layout
  // are dropped. Wide content (max-w-2xl and up) keeps its width.
  const drawerClass = (className ?? '')
    .split(/\s+/)
    .filter((c) => c && !/^max-h-/.test(c) && !/^max-w-(xs|sm|md|lg|xl)$/.test(c) && !/^(overflow-y-auto|p-0|gap-0)$/.test(c))
    .join(' ');
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={undefined}
        className={
          centered
            ? cn(
                'fixed left-1/2 top-1/2 z-[100] grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                className,
              )
            : cn(
                // A floating rounded panel on larger screens, full screen on phones.
                'fixed right-0 top-0 z-[100] flex h-dvh w-full max-w-xl flex-col gap-5 overflow-y-auto bg-card p-6 text-card-foreground shadow-2xl',
                'sm:right-3 sm:top-3 sm:h-[calc(100dvh-1.5rem)] sm:rounded-3xl sm:border sm:border-border',
                // A form inside fills the panel, so its footer sits at the bottom.
                '[&>form]:flex [&>form]:flex-1 [&>form]:flex-col [&>form>:nth-last-child(2)]:mb-2',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
                'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
                drawerClass,
              )
        }
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Drawer title area. Pass `icon` (and a pastel `tint`) for the icon tile used
 * across the app's drawers.
 */
const DialogHeader = ({
  className,
  icon,
  tint,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { icon?: React.ElementType; tint?: DrawerTint }) => (
  <div className={cn('flex items-start gap-3.5 border-b border-border pb-5 pr-12 text-left', className)} {...props}>
    {icon && <DrawerIcon icon={icon} tint={tint} />}
    <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">{children}</div>
  </div>
);
DialogHeader.displayName = 'DialogHeader';

// Pinned to the bottom of the drawer; stays visible while a long form scrolls.
// The margins are !important because forms often use space-y-*, which would reset them.
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('sticky -bottom-6 z-10 -mx-6 !-mb-6 !mt-auto flex flex-col-reverse gap-2 border-t border-border bg-card/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-tight tracking-tight text-foreground', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
