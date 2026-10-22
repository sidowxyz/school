import { useEffect, useState } from 'react';
import { BookmarkSimple } from '@phosphor-icons/react';
import { SearchableSelect } from '../shared';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { studentsApi } from '../../../students/api/studentsApi';
import type { Student } from '../../../students/types';
import type { Book } from '../../types';

interface Props {
  book: Book;
  onClose: () => void;
}

const studentClass = (s: Student) =>
  s.classId && typeof s.classId === 'object' ? s.classId.cl_name : '';

export default function ReserveBookModal({ book, onClose }: Props) {
  const reserveBook = useLibraryStore((s) => s.reserveBook);
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    studentsApi.getAll({ limit: 500 }).then((r) => setStudents(r.students)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function submit() {
    const s = students.find((st) => st._id === studentId);
    if (!s) return;
    const ok = reserveBook(
      { id: s._id, name: `${s.firstName} ${s.lastName}`, rollNo: s.admissionNumber, className: studentClass(s) },
      book.id,
    );
    showToast(ok ? `Reservation placed for "${book.title}"` : 'Could not place reservation', ok ? 'success' : 'error');
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve Book</DialogTitle>
          <DialogDescription>{book.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select Student *</Label>
            <SearchableSelect
              placeholder="Search student by name or ID..."
              value={studentId}
              onChange={setStudentId}
              options={students.map((s) => ({
                value: s._id,
                label: `${s.firstName} ${s.lastName}`,
                sub: `${s.admissionNumber}${studentClass(s) ? ` · ${studentClass(s)}` : ''}`,
              }))}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!studentId}>
            <BookmarkSimple size={14} className="mr-1.5" /> Reserve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
