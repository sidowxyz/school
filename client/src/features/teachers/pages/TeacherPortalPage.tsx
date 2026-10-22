import { useState } from 'react';
import { CaretLeft, GraduationCap } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import TeachingLogPage from '@/app/dashboard/teaching-log/page';
import type { Teacher } from '../types';
import AdminTeacherSearch from './AdminTeacherSearch';
import { Button } from '@/components/ui/button';

function ViewingBanner({ teacher, onChange }: { teacher: Teacher; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-white border border-green-200 flex items-center justify-center shrink-0">
          <GraduationCap size={16} className="text-green-600" />
        </div>
        <p className="text-sm text-gray-700 truncate">
          Viewing portal for <span className="font-semibold text-gray-900">{teacher.userId?.name || 'Teacher'}</span>{' '}
          <span className="text-gray-400">({teacher.staffId})</span>
        </p>
      </div>
      <Button variant="plain"
        type="button"
        onClick={onChange}
        className="shrink-0 flex items-center gap-1 text-sm font-medium text-green-700 hover:underline"
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
