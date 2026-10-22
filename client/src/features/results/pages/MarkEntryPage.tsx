import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Role } from '../../../types/auth.types';
import TeacherMarksView from '../components/teacher/TeacherMarksView';
import AcademicOfficerView from '../components/academic-officer/AcademicOfficerView';

type ViewKey = 'teacher' | 'academic-officer';

function viewForRole(role?: Role): ViewKey {
  return role === 'teacher' ? 'teacher' : 'academic-officer';
}

const VIEW_LABELS: { id: ViewKey; label: string }[] = [
  { id: 'teacher', label: 'Teacher' },
  { id: 'academic-officer', label: 'Academic Officer' },
];

export default function MarkEntryPage() {
  const { role } = useAuth();
  const [view, setView] = useState<ViewKey>(viewForRole(role));

  // Student and parent results live exclusively in their dedicated portals.
  const canSwitch = !role || ['admin', 'principal', 'academic_officer'].includes(role);

  return (
    <div className="space-y-5">
      {canSwitch && (
        <div className="flex items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">Role View:</span>
            <Tabs value={view} onValueChange={(v) => setView(v as ViewKey)}>
              <TabsList className="h-auto gap-1 border border-border bg-card p-1 shadow-sm">
                {VIEW_LABELS.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary"
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {view === 'teacher' && <TeacherMarksView />}
      {view === 'academic-officer' && <AcademicOfficerView />}
    </div>
  );
}
