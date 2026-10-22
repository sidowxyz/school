import { useState } from 'react';
import { DownloadSimple, CaretDown } from '@phosphor-icons/react';
import { SectionCard, SearchBox, StatusBadge, EmptyState } from '../shared';
import { SortableTh, TablePagination } from '@/components/shared/table';
import { useSortableTable } from '../../../../hooks/useSortableTable';
import { useLibraryStore } from '../../store/libraryStore';
import { downloadCSV } from '../../utils/csv';
import { bookById, isOverdue, formatDate } from '../../data/libraryData';
import type { BorrowRecord } from '../../types';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const STATUS_FILTERS = ['All', 'Active', 'Overdue', 'Returned'] as const;

export default function HistoryTab() {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All');

  const q = query.trim().toLowerCase();
  const filtered: (BorrowRecord & { bookTitle: string; effectiveStatus: string })[] = records
    .Funnel((r) => {
      const book = bookById(books, r.bookId);
      const matchesQuery = !q || r.studentName.toLowerCase().includes(q) || r.rollNo.toLowerCase().includes(q) || (book?.title ?? '').toLowerCase().includes(q);
      const overdue = isOverdue(r);
      const matchesStatus =
        status === 'All' ||
        (status === 'Active' && r.status === 'Active' && !overdue) ||
        (status === 'Overdue' && overdue) ||
        (status === 'Returned' && r.status === 'Returned');
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())
    .map((r) => ({ ...r, bookTitle: bookById(books, r.bookId)?.title ?? 'Unknown title', effectiveStatus: isOverdue(r) ? 'Overdue' : r.status }));

  const table = useSortableTable(filtered, { pageSize: 10 });

  function exportRows() {
    downloadCSV('borrow-history', filtered.map((r) => ({
      Book: r.bookTitle, CopyNo: r.copyNo, Student: r.studentName, Roll: r.rollNo, Borrowed: formatDate(r.borrowDate),
      Due: formatDate(r.dueDate), Returned: r.returnDate ? formatDate(r.returnDate) : '',
      Status: r.effectiveStatus, Fine: r.fine,
    })));
  }

  return (
    <SectionCard
      title="Borrow History"
      subtitle={`${filtered.length} of ${records.length} transactions`}
      action={
        <Button variant="plain"
          onClick={exportRows}
          className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <DownloadSimple size={13} /> Export CSV
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="sm:col-span-2">
          <SearchBox value={query} onChange={setQuery} placeholder="Search student, roll number, or book..." />
        </div>
        <div className="relative">
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full appearance-none border border-gray-200 rounded-lg pl-3.5 pr-9 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
          >
            {STATUS_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </NativeSelect>
          <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No transactions match your search." />
      ) : (
        <div className="overflow-x-auto -mx-5">
          <Table className="w-full min-w-[760px] text-sm">
            <TableHeader>
              <TableRow className="text-left text-gray-500 border-b border-gray-100">
                <SortableTh label="Book" sortKeyName="bookTitle" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                <TableHead className="px-5 py-2.5 font-medium">Copy #</TableHead>
                <SortableTh label="Student" sortKeyName="studentName" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                <SortableTh label="Borrowed" sortKeyName="borrowDate" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                <SortableTh label="Due" sortKeyName="dueDate" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                <TableHead className="px-5 py-2.5 font-medium">Returned</TableHead>
                <SortableTh label="Fine" sortKeyName="fine" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                <SortableTh label="Status" sortKeyName="effectiveStatus" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.items.map((r) => (
                <TableRow key={r.id} className="border-b border-gray-50 last:border-0">
                  <TableCell className="px-5 py-3 font-medium text-gray-800">{r.bookTitle}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-500">#{r.copyNo}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{r.studentName} <span className="text-gray-400">· {r.rollNo}</span></TableCell>
                  <TableCell className="px-5 py-3 text-gray-500">{formatDate(r.borrowDate)}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-500">{formatDate(r.dueDate)}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-500">{r.returnDate ? formatDate(r.returnDate) : '—'}</TableCell>
                  <TableCell className="px-5 py-3">{r.fine > 0 ? <span className="text-red-600 font-medium">${r.fine.toFixed(2)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="px-5 py-3"><StatusBadge status={r.effectiveStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-5">
            <TablePagination page={table.page} totalPages={table.totalPages} totalItems={table.totalItems} pageSize={table.pageSize} onPageChange={table.setPage} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
