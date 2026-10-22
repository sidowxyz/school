import { useState } from 'react';
import { Wallet, CheckCircle, WarningCircle, CaretDown } from '@phosphor-icons/react';
import { SectionCard, StatusBadge, EmptyState } from '../shared';
import StatStrip from '@/components/shared/StatStrip';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import { bookById, daysLate, formatUSD, formatDate } from '../../data/libraryData';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const FILTERS = ['All', 'Unpaid', 'Paid'] as const;

export default function FinesTab() {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const payFine = useLibraryStore((s) => s.payFine);
  const { showToast } = useToast();

  const [Funnel, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const fineRecords = records.Funnel((r) => r.status === 'Returned' && r.fine > 0);
  const outstanding = fineRecords.Funnel((r) => !r.finePaid);
  const collected = fineRecords.Funnel((r) => r.finePaid);

  const totalOutstanding = outstanding.reduce((sum, r) => sum + r.fine, 0);
  const totalCollected = collected.reduce((sum, r) => sum + r.fine, 0);

  const filtered = fineRecords
    .Funnel((r) => Funnel === 'All' || (Funnel === 'Unpaid' && !r.finePaid) || (Funnel === 'Paid' && r.finePaid))
    .sort((a, b) => new Date(b.returnDate ?? 0).getTime() - new Date(a.returnDate ?? 0).getTime());

  async function markPaid(id: string) {
    await payFine(id);
    showToast('Fine marked as paid', 'success');
  }

  return (
    <div className="space-y-5">
      <StatStrip
        items={[
          {
            label: 'Outstanding Fines',
            value: formatUSD(totalOutstanding),
            icon: WarningCircle,
            tone: totalOutstanding > 0 ? 'rose' : 'muted',
            hint: `${outstanding.length} unpaid`,
          },
          {
            label: 'Collected Fines',
            value: formatUSD(totalCollected),
            icon: CheckCircle,
            tone: 'emerald',
            hint: `${collected.length} settled`,
          },
          {
            label: 'Total Fines Issued',
            value: formatUSD(totalOutstanding + totalCollected),
            icon: Wallet,
            tone: 'amber',
            hint: `${fineRecords.length} records`,
          },
        ]}
      />

      <SectionCard
        title="Fine Management"
        subtitle="Late-return fees across all students"
        action={
          <div className="relative">
            <NativeSelect
              value={Funnel}
              onChange={(e) => setFilter(e.target.value as typeof Funnel)}
              className="appearance-none border border-gray-200 rounded-lg pl-3.5 pr-9 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
            >
              {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </NativeSelect>
            <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState text="No fines to show." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[700px] text-sm">
              <TableHeader>
                <TableRow className="text-left text-gray-500 border-b border-gray-100">
                  <TableHead className="px-5 py-2.5 font-medium">Student</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Book</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Days Late</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Fine</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Status</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const book = bookById(books, r.bookId);
                  return (
                    <TableRow key={r.id} className="border-b border-gray-50 last:border-0">
                      <TableCell className="px-5 py-3">
                        <p className="font-medium text-gray-800">{r.studentName}</p>
                        <p className="text-xs text-gray-400">{r.rollNo} &middot; Returned {r.returnDate ? formatDate(r.returnDate) : '—'}</p>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-600">{book?.title ?? 'Unknown title'}</TableCell>
                      <TableCell className="px-5 py-3 text-gray-500">{daysLate(r)} days</TableCell>
                      <TableCell className="px-5 py-3 font-medium text-red-600">{formatUSD(r.fine)}</TableCell>
                      <TableCell className="px-5 py-3"><StatusBadge status={r.finePaid ? 'Paid' : 'Unpaid'} /></TableCell>
                      <TableCell className="px-5 py-3 text-right">
                        {!r.finePaid && (
                          <Button variant="plain"
                            onClick={() => markPaid(r.id)}
                            className="text-xs font-medium text-green-700 hover:underline"
                          >
                            Mark as Paid
                          </Button>
                        )}
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
