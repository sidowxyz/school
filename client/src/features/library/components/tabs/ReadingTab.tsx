import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Clock } from '@phosphor-icons/react';
import { SectionCard, SearchableSelect, EmptyState } from '../shared';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import { studentsApi } from '../../../students/api/studentsApi';
import type { Student } from '../../../students/types';
import { libraryApi, type ReadingSessionRecord } from '../../api/libraryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const studentSub = (s: Student) =>
  `${s.admissionNumber}${s.classId && typeof s.classId === 'object' ? ` · ${s.classId.cl_name}` : ''}`;

const STATUS_OPTIONS: ReadingSessionRecord['status'][] = ['reading', 'completed', 'interrupted'];

/**
 * In-library reading — a student reads a book on-site without borrowing it.
 * The Library Usage report already reads these; this tab exists so the
 * librarian can actually log one from the UI instead of hitting the API by
 * hand. Admin + librarian only (server enforces).
 */
export default function ReadingTab() {
  const books = useLibraryStore((s) => s.books);
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [status, setStatus] = useState<ReadingSessionRecord['status']>('completed');
  const [hoursRead, setHoursRead] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [sessions, setSessions] = useState<ReadingSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    libraryApi
      .getReadingSessions()
      .then(setSessions)
      .catch(() => showToast('Could not load reading sessions.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    studentsApi.getAll({ limit: 500 }).then((r) => setStudents(r.students)).catch(() => {});
    load();
  }, [load]);

  const catalog = books.Funnel((b) => !b.archived);

  async function submit() {
    if (!studentId || !bookId) return;
    setSubmitting(true);
    try {
      const hours = hoursRead === '' ? undefined : Number(hoursRead);
      await libraryApi.logReadingSession({
        st_id: studentId,
        book_id: bookId,
        status,
        hoursRead: Number.isFinite(hours) ? hours : undefined,
        // A completed on-site read ends now; a session still in progress
        // leaves timeOut null so the librarian can PUT to close it later.
        timeOut: status === 'reading' ? null : new Date().toISOString(),
      });
      showToast('Reading session logged.', 'success');
      setStudentId('');
      setBookId('');
      setHoursRead('');
      setStatus('completed');
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not log the reading session.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Log Reading Session" subtitle="Record a student who read a book in the library">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Student</label>
            <SearchableSelect
              placeholder="Select a student"
              value={studentId}
              onChange={setStudentId}
              options={students.map((s) => ({
                value: s._id,
                label: `${s.firstName} ${s.lastName}`,
                sub: studentSub(s),
              }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Book</label>
            <SearchableSelect
              placeholder="Select a book"
              value={bookId}
              onChange={setBookId}
              options={catalog.map((b) => ({ value: b.id, label: b.title, sub: b.author }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <div className="flex items-center gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <Button variant="plain"
                  key={opt}
                  onClick={() => setStatus(opt)}
                  className={`flex-1 text-xs font-medium rounded-lg py-2.5 border transition-colors capitalize ${
                    status === opt
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Hours read</label>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={hoursRead}
              onChange={(e) => setHoursRead(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end mt-5 pt-4 border-t border-gray-50">
          <Button variant="plain"
            onClick={submit}
            disabled={!studentId || !bookId || submitting}
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
          >
            <BookOpen size={15} /> {submitting ? 'Logging…' : 'Log Session'}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Recent Sessions" subtitle={`${sessions.length} on record`}>
        {loading ? (
          <EmptyState text="Loading reading sessions…" />
        ) : sessions.length === 0 ? (
          <EmptyState text="No reading sessions logged yet." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[720px] text-sm">
              <TableHeader>
                <TableRow className="text-left text-gray-500 border-b border-gray-100">
                  <TableHead className="px-5 py-2.5 font-medium">When</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Student</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Book</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium">Status</TableHead>
                  <TableHead className="px-5 py-2.5 font-medium text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.slice(0, 25).map((row) => (
                  <TableRow key={row._id} className="border-b border-gray-50 last:border-0">
                    <TableCell className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-300" />
                        {new Date(row.registerDate).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-700">
                      {row.st_id ? `${row.st_id.firstName} ${row.st_id.lastName}` : '—'}
                      {row.st_id && (
                        <span className="text-gray-400"> · {row.st_id.admissionNumber}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-700">{row.book_id?.book_name ?? '—'}</TableCell>
                    <TableCell className="px-5 py-3 capitalize text-gray-600">{row.status}</TableCell>
                    <TableCell className="px-5 py-3 text-right tabular-nums text-gray-700">
                      {row.hoursRead ? row.hoursRead.toFixed(2) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
