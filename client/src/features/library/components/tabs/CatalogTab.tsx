import { useRef, useState } from 'react';
import { PencilSimple, Trash, Check, X, CaretDown, Plus, BookmarkSimple, UploadSimple } from '@phosphor-icons/react';
import { SectionCard, SearchBox, EmptyState } from '../shared';
import { SortableTh, TablePagination } from '@/components/shared/table';
import { useSortableTable } from '../../../../hooks/useSortableTable';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import ReserveBookModal from '../modals/ReserveBookModal';
import { CATEGORIES, CATEGORY_COLORS, bookById, formatDate } from '../../data/libraryData';
import { parseCSV } from '../../utils/csv';
import type { Book, BookCategory } from '../../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface Props {
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
}

const AVAILABILITY_FILTERS = ['All', 'Available', 'Fully Borrowed'] as const;

export default function CatalogTab({ onAddBook, onEditBook }: Props) {
  const books = useLibraryStore((s) => s.books);
  const addBook = useLibraryStore((s) => s.addBook);
  const deleteBook = useLibraryStore((s) => s.deleteBook);
  const reservations = useLibraryStore((s) => s.reservations);
  const cancelReservation = useLibraryStore((s) => s.cancelReservation);
  const fulfillReservation = useLibraryStore((s) => s.fulfillReservation);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | Book['category']>('All');
  const [availability, setAvailability] = useState<(typeof AVAILABILITY_FILTERS)[number]>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reserveTarget, setReserveTarget] = useState<Book | null>(null);

  const activeBooks = books.Funnel((b) => !b.archived);
  const pendingReservations = reservations.Funnel((r) => r.status === 'Pending');

  const q = query.trim().toLowerCase();
  const filtered = activeBooks.Funnel((b) => {
    const matchesQuery = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q);
    const matchesCategory = category === 'All' || b.category === category;
    const matchesAvailability =
      availability === 'All' ||
      (availability === 'Available' && b.availableCopies > 0) ||
      (availability === 'Fully Borrowed' && b.availableCopies === 0);
    return matchesQuery && matchesCategory && matchesAvailability;
  });

  const table = useSortableTable(filtered, { pageSize: 8 });

  async function handleDelete(book: Book) {
    const ok = await deleteBook(book.id);
    if (ok) {
      showToast(`"${book.title}" removed from the catalog`, 'success');
    } else {
      showToast('Cannot delete — this book has borrowed copies out', 'error');
    }
    setConfirmDeleteId(null);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result ?? ''));
      if (rows.length === 0) {
        showToast('No rows found in that CSV file', 'error');
        return;
      }
      let imported = 0;
      rows.forEach((row) => {
        const title = row.title?.trim();
        const author = row.author?.trim();
        const rack = row.rack?.trim();
        if (!title || !author || !rack) return;
        const isbn = row.isbn?.trim() || '—';
        const category = (CATEGORIES as string[]).includes(row.category) ? (row.category as BookCategory) : CATEGORIES[0];
        const totalCopies = Math.max(1, parseInt(row.totalCopies, 10) || 1);
        addBook({ title, author, isbn, category, totalCopies, rack, addedDate: new Date().toISOString().slice(0, 10) });
        imported++;
      });
      showToast(
        imported > 0 ? `Imported ${imported} of ${rows.length} book${rows.length === 1 ? '' : 's'}` : 'No valid rows found (need title, author, rack columns)',
        imported > 0 ? 'success' : 'error'
      );
    };
    reader.onerror = () => showToast('Could not read that file', 'error');
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Book Catalog"
        subtitle={`${filtered.length} of ${activeBooks.length} titles`}
        action={
          <div className="flex items-center gap-2">
            <Input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
            <Button variant="plain"
              onClick={handleImportClick}
              title="Import books from a CSV file (title, author, isbn, category, totalCopies, rack)"
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-3.5 py-2 hover:bg-gray-50 transition-colors"
            >
              <UploadSimple size={14} /> Import CSV
            </Button>
            <Button variant="plain"
              onClick={onAddBook}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg px-3.5 py-2 transition-colors"
            >
              <Plus size={14} /> Add Book
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search title, author, or ISBN..." />
          <div className="relative">
            <NativeSelect
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full appearance-none border border-gray-200 rounded-lg pl-3.5 pr-9 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
            <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <NativeSelect
              value={availability}
              onChange={(e) => setAvailability(e.target.value as typeof availability)}
              className="w-full appearance-none border border-gray-200 rounded-lg pl-3.5 pr-9 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
            >
              {AVAILABILITY_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </NativeSelect>
            <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState text="No books match your search." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[860px] text-sm">
              <TableHeader>
                <TableRow className="text-left text-gray-500 border-b border-gray-100">
                  <SortableTh label="Title" sortKeyName="title" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                  <SortableTh label="Category" sortKeyName="category" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                  <TableHead className="px-5 py-2.5 font-medium">ISBN</TableHead>
                  <SortableTh label="Copies" sortKeyName="availableCopies" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                  <SortableTh label="Rack" sortKeyName="rack" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                  <SortableTh label="Added" sortKeyName="addedDate" activeKey={table.sortKey} direction={table.sortDir} onSort={table.toggleSort} />
                  <TableHead className="px-5 py-2.5 font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.items.map((b) => (
                  <TableRow key={b.id} className="border-b border-gray-50 last:border-0">
                    <TableCell className="px-5 py-3">
                      <p className="font-medium text-gray-800">{b.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{b.author}</p>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[b.category]}`}>{b.category}</span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-500 text-xs">{b.isbn}</TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${b.availableCopies === 0 ? 'text-red-600' : 'text-gray-800'}`}>{b.availableCopies}</span>
                        <span className="text-gray-400">/ {b.totalCopies}</span>
                        <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.availableCopies === 0 ? 'bg-red-400' : 'bg-green-500'}`}
                            style={{ width: `${(b.availableCopies / b.totalCopies) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-500">{b.rack}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-400">{formatDate(b.addedDate)}</TableCell>
                    <TableCell className="px-5 py-3">
                      {confirmDeleteId === b.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-gray-500 mr-1">Delete?</span>
                          <Button variant="plain" onClick={() => handleDelete(b)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                            <Check size={13} />
                          </Button>
                          <Button variant="plain" onClick={() => setConfirmDeleteId(null)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            <X size={13} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="plain" onClick={() => setReserveTarget(b)} title="Reserve for a student" className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            <BookmarkSimple size={13} />
                          </Button>
                          <Button variant="plain" onClick={() => onEditBook(b)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            <PencilSimple size={13} />
                          </Button>
                          <Button variant="plain" onClick={() => setConfirmDeleteId(b.id)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash size={13} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
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

      <SectionCard title="Pending Reservations" subtitle={`${pendingReservations.length} awaiting fulfillment`}>
        {pendingReservations.length === 0 ? (
          <EmptyState text="No pending reservations." />
        ) : (
          <div className="space-y-2.5">
            {pendingReservations.map((r) => {
              const book = bookById(books, r.bookId);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{book?.title ?? 'Unknown title'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.studentName} &middot; Reserved {formatDate(r.reservedDate)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="plain"
                      onClick={() => { fulfillReservation(r.id); showToast('Reservation marked as fulfilled', 'success'); }}
                      className="text-xs font-medium text-green-700 hover:underline"
                    >
                      Fulfill
                    </Button>
                    <Button variant="plain"
                      onClick={() => { cancelReservation(r.id); showToast('Reservation cancelled', 'info'); }}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <BookmarkSimple size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {reserveTarget && <ReserveBookModal book={reserveTarget} onClose={() => setReserveTarget(null)} />}
    </div>
  );
}
