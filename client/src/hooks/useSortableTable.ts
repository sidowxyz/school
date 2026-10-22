import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

interface Options {
  pageSize?: number;
}

/**
 * Generic client-side sort + pagination for table data. Sorting compares
 * numbers numerically and everything else as a case-insensitive string.
 * Pair with <SortableTh> and <TablePagination> from the design system for
 * the standard look, or wire the returned state up manually.
 */
export function useSortableTable<T extends object>(data: T[], options: Options = {}) {
  const pageSize = options.pageSize ?? 10;
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);

  const items = useMemo(
    () => sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [sorted, clampedPage, pageSize]
  );

  function toggleSort(key: keyof T) {
    setPage(1);
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir('asc');
        return key;
      }
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return key;
    });
  }

  return {
    items,
    sortKey,
    sortDir,
    toggleSort,
    page: clampedPage,
    setPage,
    totalPages,
    totalItems: sorted.length,
    pageSize,
  };
}
