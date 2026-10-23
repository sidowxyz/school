import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldWarning } from '@phosphor-icons/react';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-5">
        <ShieldWarning size={30} />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        You don't have permission to view this page. If you think this is a mistake, contact your administrator.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
