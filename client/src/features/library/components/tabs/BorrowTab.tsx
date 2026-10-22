import { useEffect, useState } from 'react';
import { BookBookmark, CalendarBlank, ArrowsLeftRight } from '@phosphor-icons/react';
import { SectionCard, SearchableSelect, StatusBadge, EmptyState } from '../shared';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import { studentsApi } from '../../../students/api/studentsApi';
import type { Student } from '../../../students/types';
import { bookById, isOverdue, formatDate } from '../../data/libraryData';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const LOAN_OPTIONS = [7, 14, 21, 30];

const studentClass = (s: Student) =>
  s.classId && typeof s.classId === 'object' ? ` · ${s.classId.cl_name}` : '';

export default function BorrowTab() {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const borrowBook = useLibraryStore((s) => s.borrowBook);
  const defaultLoanDays = useLibraryStore((s) => s.settings.defaultLoanDays);
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [loanDays, setLoanDays] = useState(defaultLoanDays);

  useEffect(() => {
    studentsApi.getAll({ limit: 500 }).then((r) => setStudents(r.students)).catch(() => {});
  }, []);

  const availableBooks = books.Funnel((b) => !b.archived && b.availableCopies > 0);
  const activeLoans = records.Funnel((r) => r.status === 'Active').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const dueDatePreview = (() => {
    const d = new Date();
    d.setDate(d.getDate() + loanDays);
    return d.toISOString().slice(0, 10);
  })();

  async function submit() {
    if (!studentId || !bookId) return;
    const ok = await borrowBook(studentId, bookId, loanDays);
    if (ok) {
      const book = bookById(books, bookId);
      showToast(`"${book?.title}" borrowed successfully`, 'success');
      setStudentId('');
      setBookId('');
      setLoanDays(defaultLoanDays);
    } else {
      showToast('Could not borrow this book. Please try again.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Borrow a Book" subtitle="Issue a book to a student">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Student</label>
            <SearchableSelect
              placeholder="Select a student"
              value={studentId}
              onChange={setStudentId}
              options={students.map((s) => ({ value: s._id, label: `${s.firstName} ${s.lastName}`, sub: `${s.admissionNumber}${studentClass(s)}` }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Book</label>
            <SearchableSelect
              placeholder="Select a book"
              value={bookId}
              onChange={setBookId}
              options={availableBooks.map((b) => ({ value: b.id, label: b.title, sub: `${b.author} · ${b.availableCopies} available` }))}
            />
            {availableBooks.length === 0 && <p className="text-xs text-red-500 mt-1">No books currently available.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Loan Period</label>
            <div className="flex items-center gap-1.5">
              {LOAN_OPTIONS.map((d) => (
                <Button variant="plain"
                  key={d}
                  onClick={() => setLoanDays(d)}
                  className={`flex-1 text-xs font-medium rounded-lg py-2.5 border transition-colors ${
                    loanDays === d ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <CalendarBlank size={13} /> Due date will be <span className="font-medium text-gray-600">{formatDate(dueDatePreview)}</span>
          </p>
          <Button variant="plain"
            onClick={submit}
            disabled={!studentId || !bookId}
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
          >
            <ArrowsLeftRight size={15} /> Borrow Book
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Currently Borrowed" subtitle={`${activeLoans.length} active loan${activeLoans.length === 1 ? '' : 's'}`}>
        {activeLoans.length === 0 ? (
          <EmptyState text="No active loans." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[680px] text-sm">
              <TableHeader>
                <TableRow className="text-left text-gray-500 border-b border-gray-100">
                  <TableHead className="px-5 py-2.5 font-medium">Book</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Copy #</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Student</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Borrowed</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Due</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoans.map((r) => {
                  const book = bookById(books, r.bookId);
                  return (
                    <TableRow key={r.id} className="border-b border-gray-50 last:border-0">
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <BookBookmark size={14} className="text-gray-300 shrink-0" />
                          <span className="font-medium text-gray-800">{book?.title ?? 'Unknown title'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-500">#{r.copyNo}</TableCell>
                      <TableCell className="px-5 py-3 text-gray-600">{r.studentName} <span className="text-gray-400">· {r.rollNo}</span></TableCell>
                      <TableCell className="px-5 py-3 text-gray-500">{formatDate(r.borrowDate)}</TableCell>
                      <TableCell className="px-5 py-3 text-gray-500">{formatDate(r.dueDate)}</TableCell>
                      <TableCell className="px-5 py-3"><StatusBadge status={isOverdue(r) ? 'Overdue' : 'Active'} /></TableCell>
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
