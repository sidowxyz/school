import { useRouteError } from 'react-router-dom';
import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

/**
 * Shown instead of React Router's developer error screen when a page crashes.
 * A new deploy can also make an open tab's code stale; reloading fixes both.
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-tile-pink text-tile-foreground">
        <WarningCircle size={30} />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page hit a problem. Reloading usually fixes it. If it keeps happening, tell the school office what you were doing.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => window.location.reload()} className="gap-2"><ArrowClockwise size={16} /> Reload</Button>
        <Button variant="outline" onClick={() => { window.location.href = '/'; }}>Go to my home page</Button>
      </div>
    </div>
  );
}
