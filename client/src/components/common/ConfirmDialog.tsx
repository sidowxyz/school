import { useEffect, useState } from 'react';
import { Question, Trash, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// One confirmation dialog for the whole app, in place of the browser's plain
// window.confirm box. Call `await confirmAction({...})` anywhere; <ConfirmHost />
// (rendered once in App) shows it and resolves true/false.

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for deletes and other things that can't be undone. */
  tone?: 'danger' | 'default';
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let show: ((p: Pending) => void) | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) { resolve(window.confirm(options.title)); return; }
    show({ ...options, resolve });
  });
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    show = setPending;
    return () => { show = null; };
  }, []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const danger = pending?.tone === 'danger';

  return (
    <Dialog open={!!pending} onOpenChange={(open) => { if (!open) close(false); }}>
      <DialogContent centered className="max-w-md">
        {pending && (
          <>
            <DialogHeader icon={danger ? (/delete|remove/i.test(pending.confirmLabel ?? '') ? Trash : WarningCircle) : Question} tint={danger ? 'pink' : 'blue'}>
              <DialogTitle>{pending.title}</DialogTitle>
              {pending.text && <DialogDescription>{pending.text}</DialogDescription>}
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>{pending.cancelLabel ?? 'Cancel'}</Button>
              <Button variant={danger ? 'destructive' : 'default'} onClick={() => close(true)} autoFocus>
                {pending.confirmLabel ?? 'Continue'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
