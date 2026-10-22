import { useEffect, useState } from 'react';
import { BookBookmark, Warning, Wallet, ClockCounterClockwise } from '@phosphor-icons/react';
import { SectionCard, SearchableSelect, StatusBadge, EmptyState } from '../shared';
import StatStrip from '@/components/shared/StatStrip';
import { useLibraryStore } from '../../store/libraryStore';
import { studentsApi } from '../../../students/api/studentsApi';
import type { Student } from '../../../students/types';
import { bookById, studentBorrowHistory, isOverdue, formatUSD, formatDate } from '../../data/libraryData';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const studentClass = (s: Student) =>
  s.classId && typeof s.classId === 'object' ? s.classId.cl_name : '';

export default function StudentHistoryTab() {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    studentsApi.getAll({ limit: 500 }).then((r) => setStudents(r.students)).catch(() => {});
  }, []);

  const student = students.find((s) => s._id === studentId);
  const studentName = student ? `${student.firstName} ${student.lastName}` : '';
  const ClockCounterClockwise = studentId ? studentBorrowHistory(records, studentId) : [];

  const activeCount = history.Funnel((r) => r.status === 'Active').length;
  const overdueCount = history.Funnel((r) => isOverdue(r)).length;
  const unpaidFines = history.Funnel((r) => r.status === 'Returned' && !r.finePaid).reduce((sum, r) => sum + r.fine, 0);

  return (
    <div className="space-y-5">
      <SectionCard title="Student History" subtitle="Look up a student's full borrowing record">
        <div className="max-w-md">
          <SearchableSelect
            placeholder="Select a student"
            value={studentId}
            onChange={setStudentId}
            options={students.map((s) => ({ value: s._id, label: `${s.firstName} ${s.lastName}`, sub: `${s.admissionNumber}${studentClass(s) ? ` · ${studentClass(s)}` : ''}` }))}
          />
        </div>
      </SectionCard>

      {!student ? (
        <SectionCard title="No Student Selected">
          <EmptyState text="Choose a student above to view their library history." />
        </SectionCard>
      ) : (
        <>
          <StatStrip
            items={[
              {
                label: 'Total Borrowed',
                value: history.length,
                icon: ClockCounterClockwise,
                tone: 'sky',
                hint: 'All time loans',
              },
              {
                label: 'Currently Borrowed',
                value: activeCount,
                icon: BookBookmark,
                tone: 'violet',
                hint: 'Active loans',
              },
              {
                label: 'Overdue',
                value: overdueCount,
                icon: Warning,
                tone: overdueCount > 0 ? 'rose' : 'muted',
                hint: overdueCount > 0 ? `${overdueCount} needs return` : 'All on time',
              },
              {
                label: 'Unpaid Fines',
                value: formatUSD(unpaidFines),
                icon: Wallet,
                tone: unpaidFines > 0 ? 'rose' : 'emerald',
                hint: unpaidFines > 0 ? 'Outstanding balance' : 'All settled',
              },
            ]}
          />

          <SectionCard title={studentName} subtitle={`${student.admissionNumber}${studentClass(student) ? ` · ${studentClass(student)}` : ''}`}>
            {history.length === 0 ? (
              <EmptyState text="This student hasn't borrowed any books yet." />
            ) : (
              <div className="overflow-x-auto -mx-5">
                <Table className="w-full min-w-[680px] text-sm">
                  <TableHeader>
                    <TableRow className="text-left text-gray-500 border-b border-gray-100">
                      <TableHead className="px-5 py-2.5 font-medium">Book</TableHead>
                      <TableHead className="px-5 py-2.5 font-medium">Copy #</TableHead>
                      <TableHead className="px-5 py-2.5 font-medium">Borrowed</TableHead>
                      <TableHead className="px-5 py-2.5 font-medium">Due</TableHead>
                      <TableHead className="px-5 py-2.5 font-medium">Returned</TableHead>
                      <TableHead className="px-5 py-2.5 font-medium">Fine</TableHead>
                      <TableHead className="px-5 py-2.5 font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((r) => {
                      const book = bookById(books, r.bookId);
                      return (
                        <TableRow key={r.id} className="border-b border-gray-50 last:border-0">
                          <TableCell className="px-5 py-3 font-medium text-gray-800">{book?.title ?? 'Unknown title'}</TableCell>
                          <TableCell className="px-5 py-3 text-gray-500">#{r.copyNo}</TableCell>
                          <TableCell className="px-5 py-3 text-gray-500">{formatDate(r.borrowDate)}</TableCell>
                          <TableCell className="px-5 py-3 text-gray-500">{formatDate(r.dueDate)}</TableCell>
                          <TableCell className="px-5 py-3 text-gray-500">{r.returnDate ? formatDate(r.returnDate) : '—'}</TableCell>
                          <TableCell className="px-5 py-3">
                            {r.fine > 0 ? (
                              <span className={r.finePaid ? 'text-gray-400' : 'text-red-600 font-medium'}>{formatUSD(r.fine)}</span>
                            ) : <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell className="px-5 py-3"><StatusBadge status={isOverdue(r) ? 'Overdue' : r.status} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
