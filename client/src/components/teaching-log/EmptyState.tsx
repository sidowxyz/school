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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4 border border-green-100">
        <NotePencil size={28} className="stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">No lesson logs</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-5">
        {message}
      </p>
      {hasFilters && onClearFilters && (
        <Button variant="plain"
          onClick={onClearFilters}
          className="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Clear Active Filters
        </Button>
      )}
    </div>
  );
}
