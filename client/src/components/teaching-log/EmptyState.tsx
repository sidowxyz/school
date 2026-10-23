import { NotePencil } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  message?: string;
  onClearFilters?: () => void;
  hasFilters?: boolean;
}

export default function EmptyState({
  message = 'No teaching logs found',
  onClearFilters,
  hasFilters = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card rounded-xl border border-border shadow-sm">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
        <NotePencil size={28} className="stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">No lesson logs</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">
        {message}
      </p>
      {hasFilters && onClearFilters && (
        <Button variant="plain"
          onClick={onClearFilters}
          className="text-xs font-semibold text-primary hover:text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Clear Active Filters
        </Button>
      )}
    </div>
  );
}
