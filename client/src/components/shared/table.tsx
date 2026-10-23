import { CaretLeft, CaretRight, CaretUpDown, CaretUp, CaretDown as ChevronDownIcon } from '@phosphor-icons/react';
import type { SortDirection } from '../../hooks/useSortableTable';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

/** Clickable <th> that shows the active sort direction. Use inside a <thead><tr>. */
export function SortableTh<K extends string>({
  label, sortKeyName, activeKey, direction, onSort, className = '',
}: {
  label: string;
  sortKeyName: K;
  activeKey: K | string | null;
  direction: SortDirection;
  onSort: (key: K) => void;
  className?: string;
}) {
  const active = activeKey === sortKeyName;
  return (
    <TableHead className={`px-5 py-2.5 font-medium ${className}`}>
      <Button variant="plain"
        onClick={() => onSort(sortKeyName)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? 'text-foreground' : ''}`}
      >
        {label}
        {active ? (
          direction === 'asc' ? <CaretUp size={12} /> : <ChevronDownIcon size={12} />
        ) : (
          <CaretUpDown size={12} className="text-muted-foreground/70" />
        )}
      </Button>
    </TableHead>
  );
}

/** Prev/next pagination footer. Renders nothing when there's only one page. */
export function TablePagination({
  page, totalPages, totalItems, pageSize, onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Showing {start}&ndash;{end} of {totalItems}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="plain"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors"
        >
          <CaretLeft size={14} />
        </Button>
        <span className="text-xs text-muted-foreground px-1.5">Page {page} of {totalPages}</span>
        <Button variant="plain"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors"
        >
          <CaretRight size={14} />
        </Button>
      </div>
    </div>
  );
}
