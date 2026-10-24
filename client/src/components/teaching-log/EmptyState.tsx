import { MagnifyingGlass, NotePencil } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { EmptyState as SharedEmptyState } from '@/components/common/EmptyState';

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
    <div className="rounded-2xl border border-border/70 bg-card">
      <SharedEmptyState
        icon={hasFilters ? MagnifyingGlass : NotePencil}
        tint={hasFilters ? 'violet' : 'green'}
        title={hasFilters ? 'No logs match' : 'No lesson logs yet'}
        text={message}
        action={hasFilters && onClearFilters && <Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>}
      />
    </div>
  );
}
