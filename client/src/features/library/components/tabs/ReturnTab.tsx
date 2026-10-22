import { useState } from 'react';
import { ArrowsLeftRight, Warning } from '@phosphor-icons/react';
import { SectionCard, SearchableSelect, EmptyState } from '../shared';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import { bookById, daysLate, estimatedFine, formatUSD, formatDate } from '../../data/libraryData';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

export default function ReturnTab() {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const returnBook = useLibraryStore((s) => s.returnBook);
  const fineRatePerDay = useLibraryStore((s) => s.settings.fineRatePerDay);
  const { showToast } = useToast();

  const [recordId, setRecordId] = useState('');

  const activeLoans = records.Funnel((r) => r.status === 'Active');
  const recentReturns = [...records]
    .Funnel((r) => r.status === 'Returned')
    .sort((a, b) => new Date(b.returnDate ?? 0).getTime() - new Date(a.returnDate ?? 0).getTime())
    .slice(0, 8);

  const selected = activeLoans.find((r) => r.id === recordId) ?? null;
  const selectedBook = selected ? bookById(books, selected.bookId) : undefined;
  const late = selected ? daysLate(selected) : 0;
  const fine = selected ? estimatedFine(selected, fineRatePerDay) : 0;

  async function submit() {
    if (!selected) return;
    await returnBook(selected.id);
    showToast(
      fine > 0 ? `Book returned — ${formatUSD(fine)} late fee recorded` : 'Book returned successfully',
      fine > 0 ? 'info' : 'success'
    );
    setRecordId('');
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Return a Book" subtitle="Select an active loan to process its return">
        <div className="max-w-lg">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Active Loan</label>
          <SearchableSelect
            placeholder="Select student or book"
            value={recordId}
            onChange={setRecordId}
            options={activeLoans.map((r) => ({
              value: r.id,
              label: `${bookById(books, r.bookId)?.title ?? 'Unknown title'}`,
              sub: `${r.studentName} · Due ${formatDate(r.dueDate)}`,
            }))}
          />
          {activeLoans.length === 0 && <p className="text-xs text-gray-400 mt-1.5">No active loans to return right now.</p>}
        </div>

        {selected && selectedBook && (
          <div className="mt-5 border border-gray-100 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Info label="Book" value={selectedBook.title} />
              <Info label="Copy #" value={String(selected.copyNo)} />
              <Info label="Student" value={`${selected.studentName}`} />
              <Info label="Borrowed" value={formatDate(selected.borrowDate)} />
              <Info label="Due Date" value={formatDate(selected.dueDate)} />
            </div>

            {late > 0 ? (
              <div className="flex items-center gap-2 mt-4 bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5">
                <Warning size={15} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">
                  This book is <span className="font-semibold">{late} day{late === 1 ? '' : 's'} overdue</span> — a late fee of <span className="font-semibold">{formatUSD(fine)}</span> will be recorded.
                </p>
              </div>
            ) : (
              <p className="text-xs text-green-600 mt-4">On time — no late fee will apply.</p>
            )}

            <div className="flex items-center justify-end mt-4">
              <Button variant="plain"
                onClick={submit}
                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
              >
                <ArrowsLeftRight size={15} /> Mark as Returned
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recently Returned">
        {recentReturns.length === 0 ? (
          <EmptyState text="No returns recorded yet." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[680px] text-sm">
              <TableHeader>
                <TableRow className="text-left text-gray-500 border-b border-gray-100">
                  <TableHead className="px-5 py-2.5 font-medium">Book</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Copy #</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Student</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Returned</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Fine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReturns.map((r) => {
                  const book = bookById(books, r.bookId);
                  return (
                    <TableRow key={r.id} className="border-b border-gray-50 last:border-0">
                      <TableCell className="px-5 py-3 font-medium text-gray-800">{book?.title ?? 'Unknown title'}</TableCell>
                      <TableCell className="px-5 py-3 text-gray-500">#{r.copyNo}</TableCell>
                      <TableCell className="px-5 py-3 text-gray-600">{r.studentName}</TableCell>
                      <TableCell className="px-5 py-3 text-gray-500">{r.returnDate ? formatDate(r.returnDate) : '—'}</TableCell>
                      <TableCell className="px-5 py-3">
                        {r.fine > 0 ? <span className="text-red-600 font-medium">{formatUSD(r.fine)}</span> : <span className="text-gray-400">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
