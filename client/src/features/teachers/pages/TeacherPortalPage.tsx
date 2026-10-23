import { useState } from 'react';
import { CaretLeft, GraduationCap } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import TeachingLogPage from '@/app/dashboard/teaching-log/page';
import type { Teacher } from '../types';
import AdminTeacherSearch from './AdminTeacherSearch';
import { Button } from '@/components/ui/button';

function ViewingBanner({ teacher, onChange }: { teacher: Teacher; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-card border border-primary/20 flex items-center justify-center shrink-0">
          <GraduationCap size={16} className="text-primary" />
        </div>
        <p className="text-sm text-foreground/80 truncate">
          Viewing portal for <span className="font-semibold text-foreground">{teacher.userId?.name || 'Teacher'}</span>{' '}
          <span className="text-muted-foreground">({teacher.staffId})</span>
        </p>
      </div>
      <Button variant="plain"
        type="button"
        onClick={onChange}
        className="shrink-0 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <CaretLeft size={15} /> Change teacher
      </Button>
    </div>
  );
}

export default function TeacherPortalPage() {
  const { role } = useAuth();
  const isTeacher = role === 'teacher';
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  if (!isTeacher && !selectedTeacher) {
    return <AdminTeacherSearch onSelect={setSelectedTeacher} />;
  }

  if (isTeacher) return <TeachingLogPage />;

  return (
    <div>
      {selectedTeacher && (
        <ViewingBanner teacher={selectedTeacher} onChange={() => setSelectedTeacher(null)} />
      )}
      <TeachingLogPage
        teacherId={selectedTeacher?._id}
        teacherName={selectedTeacher?.userId?.name}
        readOnly
      />
    </div>
  );
}
