import { SpinnerGap, BookOpen, UserCircle, Clock } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { portalApi, type PortalTimetableSlot } from '../../api/portalApi';
import { usePortalResource } from '../../hooks/usePortalResource';

interface SubjectRow {
  id: string;
  name: string;
  teacher: string;
  periods: number;
}

const teacherName = (t: PortalTimetableSlot['teacher']) =>
  t ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || '—' : '—';

// The student's subjects are derived from their class timetable — one row per
// distinct subject, with the teacher and how many weekly periods it has.
function deriveSubjects(slots: PortalTimetableSlot[]): SubjectRow[] {
  const map = new Map<string, SubjectRow>();
  for (const s of slots) {
    const id = s.subject?._id;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) {
      existing.periods += 1;
    } else {
      map.set(id, { id, name: s.subject?.sub_name ?? 'Subject', teacher: teacherName(s.teacher), periods: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function SubjectsTab() {
  const { data, loading, error } = usePortalResource(portalApi.getTimetable);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-green-600" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  const subjects = deriveSubjects(data ?? []);

  return (
    <div className="space-y-6">
      {/* Hairline Divided Summary KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 gap-px">
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BookOpen size={15} className="text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Enrolled Subjects</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{subjects.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active curriculum courses</p>
          </div>

          <div className="bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock size={15} className="text-sky-600 dark:text-sky-400" />
              <span className="text-[11px] font-medium uppercase tracking-wider">Weekly Periods</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{(data ?? []).length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total scheduled instructional slots</p>
          </div>
        </div>
      </Card>

      {/* Main Subjects Card */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold text-foreground">Class Curriculum & Subjects</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Subjects, instructors, and period frequency for your assigned class cohort
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {subjects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <BookOpen size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No subjects scheduled</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                No subjects are scheduled for your class yet. Check back once your timetable is published.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {subjects.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="mt-3 font-semibold text-base text-foreground">{s.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCircle size={13} className="text-muted-foreground" /> {s.teacher}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={13} className="text-muted-foreground" /> {s.periods} period{s.periods === 1 ? '' : 's'} / week
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
