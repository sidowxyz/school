import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapTrifold } from '@phosphor-icons/react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-5">
        <MapTrifold size={30} />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        This page doesn't exist or has moved. Use the menu, or go back to your dashboard.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
