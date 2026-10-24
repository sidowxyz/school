import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Buildings, CalendarBlank, ChalkboardTeacher, Clock, Plus, Student, type Icon } from '@phosphor-icons/react';
import PageHeader from "../../../components/common/PageHeader";
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Term, Class, Section, Subject, Period } from "../../academic-structure/types";
import { teachersApi } from "../../teachers/api/teachersApi";
import type { Teacher, Weekday } from "../../teachers/types";
import { timetableApi } from "../api/timetableApi";
import type { Assignment, RefTeacher } from "../types";
import AssignmentFormModal, { termLabel, type TeacherOption } from "../../teachers/components/AssignmentFormModal";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatStrip from '@/components/shared/StatStrip';
import { useAuth } from '@/hooks/useAuth';
import { useCan, usePermission } from '@/hooks/usePermission';
import { EmptyState, ErrorState, ListLoading } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

// Somali school week — Saturday through Thursday, Friday off by default. Terms
// can customize this via workingDays, so the grid always follows the term.
const WEEK_ORDER: Weekday[] = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
// Same default as a new term on the server (Term.workingDays).
const DEFAULT_DAYS: Weekday[] = WEEK_ORDER.filter((d) => d !== "Friday");
const JS_DAY: Record<Weekday, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

// Pastel fills handed out to subjects in name order, so up to five subjects never share a colour.
const SUBJECT_FILLS = ["bg-tile-blue", "bg-tile-green", "bg-tile-yellow", "bg-tile-pink", "bg-tile-violet"];

const teacherName = (t?: RefTeacher | null) =>
  t?.userId?.name || [t?.userId?.firstName, t?.userId?.lastName].filter(Boolean).join(" ") || t?.staffId || "—";

const sectionClass = (s: Section) => (typeof s.class === "string" ? s.class : s.class._id);

type View = "class" | "teacher";

type ModalState =
  | { mode: "add"; initialSlot?: { day: Weekday; periodId: string } }
  | { mode: "edit"; assignment: Assignment };

export default function TimetablePage() {
  const { role, user } = useAuth();
  const isTeacher = role === "teacher";
  // Assignment changes are admin-only on the server; everyone else just reads.
  const canEdit = useCan("timetable", "edit");
  const canSetUp = usePermission("academic-structure");

  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState("");

  const [view, setView] = useState<View>(isTeacher ? "teacher" : "class");
  const [termId, setTermId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  // Reference data — terms, classes, sections, subjects, teachers — in one go.
  useEffect(() => {
    Promise.all([academicApi.getTerms(), academicApi.getClasses(), academicApi.getSections(), academicApi.getSubjects(), teachersApi.getAll()])
      .then(([termList, classList, sectionList, subjectList, teacherList]) => {
        setTerms(termList);
        setClasses(classList);
        setSections(sectionList);
        setSubjects(subjectList);
        setTeachers(teacherList);
        setTermId((termList.find((t) => t.status === "active") ?? termList[0])?._id ?? "");
        // A teacher opens on their own week; everyone else on the first teacher/class.
        const mine = teacherList.find((t) => t.userId?._id === user?.id);
        setTeacherId((isTeacher ? mine : teacherList[0])?._id ?? "");
        setClassId(classList[0]?._id ?? "");
        setRefError("");
      })
      .catch(() => setRefError("Could not load the timetable."))
      .finally(() => setRefLoading(false));
  }, [isTeacher, user?.id]);

  // Periods are term-scoped.
  useEffect(() => {
    if (!termId) { setPeriods([]); return; }
    let cancelled = false;
    setPeriodsLoading(true);
    academicApi.getPeriods(termId)
      .then((list) => { if (!cancelled) setPeriods(list); })
      .catch(() => { if (!cancelled) setPeriods([]); })
      .finally(() => { if (!cancelled) setPeriodsLoading(false); });
    return () => { cancelled = true; };
  }, [termId]);

  const classSections = useMemo(() => sections.filter((s) => sectionClass(s) === classId), [sections, classId]);

  // Keep the section in step with the class (first section, or none if the class has none).
  useEffect(() => {
    if (!classSections.some((s) => s._id === sectionId)) setSectionId(classSections[0]?._id ?? "");
  }, [classSections, sectionId]);

  const loadAssignments = useCallback(async () => {
    if (!termId || (view === "teacher" && !teacherId) || (view === "class" && !classId)) { setAssignments([]); return; }
    setAssignmentsLoading(true);
    try {
      setAssignments(await timetableApi.getAssignments(
        view === "teacher" ? { termId, teacherId } : { termId, classId, sectionId: sectionId || undefined },
      ));
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [termId, view, teacherId, classId, sectionId]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const selectedTerm = terms.find((t) => t._id === termId);
  const workingDays: Weekday[] = selectedTerm?.workingDays?.length ? selectedTerm.workingDays : DEFAULT_DAYS;
  const days = WEEK_ORDER.filter((d) => workingDays.includes(d));
  const sortedPeriods = useMemo(
    () => periods.slice().sort((a, b) => (Number(a.per_no) || 0) - (Number(b.per_no) || 0)),
    [periods],
  );
  const todayName = WEEK_ORDER.find((d) => JS_DAY[d] === new Date().getDay());

  // day|periodId -> assignment, built once per load instead of searched per cell.
  const cellMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const a of assignments) for (const slot of a.timetableSlots) map.set(`${slot.day}|${slot.periodId?._id}`, a);
    return map;
  }, [assignments]);

  const lessons = assignments.reduce((n, a) => n + a.timetableSlots.filter((s) => days.includes(s.day)).length, 0);
  const totalSlots = days.length * sortedPeriods.length;
  const subjectTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      const name = a.subjectId?.sub_name ?? "—";
      m.set(name, (m.get(name) ?? 0) + a.timetableSlots.length);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [assignments]);
  const fillBySubject = useMemo(
    () => new Map(subjectTotals.map(([name]) => name).sort().map((name, i) => [name, SUBJECT_FILLS[i % SUBJECT_FILLS.length]])),
    [subjectTotals],
  );
  const subjectFill = (name: string) => fillBySubject.get(name) ?? SUBJECT_FILLS[0];

  const canCreate = canEdit && (view === "teacher" ? !!teacherId : !!classId);
  const openAdd = (day?: Weekday, periodId?: string) => {
    if (!termId || !canCreate) return;
    setModal({ mode: "add", initialSlot: day && periodId ? { day, periodId } : undefined });
  };
  const teacherOptions: TeacherOption[] = teachers.map((t) => ({ _id: t._id, label: t.userId?.name || t.staffId }));

  if (refLoading) return <Card className="rounded-2xl border-border/70 shadow-none"><ListLoading rows={6} /></Card>;
  if (refError) return <Card className="rounded-2xl border-border/70 shadow-none"><ErrorState text={refError} onRetry={() => window.location.reload()} /></Card>;

  // What is still missing before a timetable can be shown, in setup order.
  // Teachers and others who can't set things up are told who can.
  const officeHint = "The academic office sets this up.";
  const setupLink = (step: string) => canSetUp
    ? <Button asChild><Link to={`/academic-structure?step=${encodeURIComponent(step)}`}><Buildings size={16} /> Open Academic Structure</Link></Button>
    : undefined;
  const missing: { icon: Icon; title: string; text: string; action?: React.ReactNode } | null =
    !terms.length
      ? { icon: CalendarBlank, title: "No term yet", text: canSetUp ? "Add the school year and its first term, then the periods of the school day." : `The timetable isn't ready yet. ${officeHint}`, action: setupLink("Terms") }
      : view === "class" && !classes.length
      ? { icon: Student, title: "No classes yet", text: canSetUp ? "Add classes (and their sections) to build their timetables." : `No classes have been set up yet. ${officeHint}`, action: setupLink("Classes") }
      : view === "teacher" && !teachers.length
      ? { icon: ChalkboardTeacher, title: "No teachers yet", text: "Add teachers on the Teachers page, then give them lessons here.", action: canEdit ? <Button asChild><Link to="/teachers"><ChalkboardTeacher size={16} /> Open Teachers</Link></Button> : undefined }
      : !periodsLoading && termId && !sortedPeriods.length
      ? { icon: Clock, title: "No periods in this term", text: canSetUp ? "Add the periods of the school day (e.g. Period 1, 07:30–08:15) under Academic Structure → Periods." : `The school day hasn't been set up for this term. ${officeHint}`, action: setupLink("Periods") }
      : view === "teacher" && isTeacher && !teacherId
      ? { icon: ChalkboardTeacher, title: "No timetable for you yet", text: "Your account isn't linked to a teacher record. Ask the school office." }
      : null;

  const filterLabel: { icon: Icon; text: string } = view === "teacher"
    ? { icon: ChalkboardTeacher, text: teachers.find((t) => t._id === teacherId)?.userId?.name ?? "" }
    : { icon: Student, text: [classes.find((c) => c._id === classId)?.cl_name, classSections.find((s) => s._id === sectionId)?.name].filter(Boolean).join(" · ") };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable"
        subtitle={isTeacher ? "Your lessons for the week." : "Each class's weekly lessons and teachers."}
        action={canEdit ? (
          <Button onClick={() => openAdd()} disabled={!termId || !canCreate || !!missing}>
            <Plus size={16} /> Add lesson
          </Button>
        ) : undefined}
      />

      {/* A teacher with a single term has nothing to pick, so no filter bar. */}
      {(!isTeacher || terms.length > 1) && (
      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          {!isTeacher && (
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="class" className="gap-2"><Student size={16} /> By class</TabsTrigger>
                <TabsTrigger value="teacher" className="gap-2"><ChalkboardTeacher size={16} /> By teacher</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {terms.length > 1 && (
            <div className="min-w-[160px] space-y-1.5">
              <Label htmlFor="tt-term" className="text-xs">Term</Label>
              <NativeSelect id="tt-term" value={termId} onChange={(e) => setTermId(e.target.value)}>
                {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
              </NativeSelect>
            </div>
          )}
          {view === "teacher" && !isTeacher && (
            <div className="min-w-[200px] space-y-1.5">
              <Label htmlFor="tt-teacher" className="text-xs">Teacher</Label>
              <NativeSelect id="tt-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {teachers.length === 0 && <option value="">No teachers yet</option>}
                {teachers.map((t) => <option key={t._id} value={t._id}>{t.userId?.name || t.staffId}</option>)}
              </NativeSelect>
            </div>
          )}
          {view === "class" && (
            <>
              <div className="min-w-[160px] space-y-1.5">
                <Label htmlFor="tt-class" className="text-xs">Class</Label>
                <NativeSelect id="tt-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classes.length === 0 && <option value="">No classes yet</option>}
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
                </NativeSelect>
              </div>
              {classSections.length > 0 && (
                <div className="min-w-[120px] space-y-1.5">
                  <Label htmlFor="tt-section" className="text-xs">Section</Label>
                  <NativeSelect id="tt-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    {classSections.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </NativeSelect>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {!missing && <StatStrip items={[
        { label: "Lessons a week", value: lessons, icon: BookOpen, tone: "sky", hint: filterLabel.text || "Selected timetable" },
        { label: "Subjects", value: subjectTotals.length, icon: ChalkboardTeacher, tone: "violet", hint: subjectTotals[0] ? `Most: ${subjectTotals[0][0]}` : "None scheduled" },
        { label: "Free periods", value: Math.max(0, totalSlots - lessons), icon: Clock, tone: "amber", hint: `of ${totalSlots} in the week` },
        { label: "School days", value: days.length, icon: CalendarBlank, tone: "emerald", hint: days.length ? `${days[0].slice(0, 3)} – ${days[days.length - 1].slice(0, 3)}` : "Set in the term" },
      ]} />}

      {missing ? (
        <Card className="rounded-2xl border-border/70 shadow-none">
          <EmptyState icon={missing.icon} tint="blue" title={missing.title} text={missing.text} action={missing.action} />
        </Card>
      ) : periodsLoading ? (
        <Card className="rounded-2xl border-border/70 shadow-none"><ListLoading rows={6} /></Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
          <div className="overflow-x-auto">
            <div className={cn("grid min-w-[760px]", assignmentsLoading && "opacity-60")}
              style={{ gridTemplateColumns: `120px repeat(${days.length}, minmax(110px, 1fr))` }}>
              {/* Header row */}
              <div className="border-b border-border bg-muted/50 px-3 py-3 text-xs font-medium text-muted-foreground">Period</div>
              {days.map((day) => (
                <div key={day} className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-l border-border px-3 py-3 text-sm font-semibold", day === todayName ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground")}>
                  {day}
                  {day === todayName && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Today</span>}
                </div>
              ))}

              {/* One row per period */}
              {sortedPeriods.map((period) => (
                <div key={period._id} className="contents">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="text-sm font-semibold">{period.per_name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{period.time_in}–{period.time_out}</p>
                  </div>
                  {days.map((day) => {
                    const a = cellMap.get(`${day}|${period._id}`);
                    const today = day === todayName;
                    return (
                      <div key={day} className={cn("border-b border-l border-border p-1.5", today && "bg-primary/[0.04]")}>
                        {a ? (
                          <Button variant="plain" type="button" onClick={() => canEdit && setModal({ mode: "edit", assignment: a })}
                            className={cn("flex h-full min-h-[56px] w-full flex-col items-start justify-center rounded-lg px-2.5 py-2 text-left text-tile-foreground", subjectFill(a.subjectId?.sub_name ?? ""), canEdit ? "hover:brightness-95" : "cursor-default")}>
                            <span className="w-full truncate text-xs font-semibold">{a.subjectId?.sub_name ?? "—"}</span>
                            <span className="w-full truncate text-[11px] opacity-75">
                              {view === "teacher" ? `${a.classId?.cl_name ?? ""}${a.sectionId?.name ? ` · ${a.sectionId.name}` : ""}` : teacherName(a.teacherId)}
                            </span>
                          </Button>
                        ) : canCreate ? (
                          <Button variant="plain" type="button" onClick={() => openAdd(day, period._id)} aria-label={`Add a lesson on ${day}, ${period.per_name}`}
                            className="group flex h-full min-h-[56px] w-full items-center justify-center rounded-lg text-muted-foreground/0 transition-colors hover:bg-muted hover:text-muted-foreground">
                            <Plus size={14} />
                          </Button>
                        ) : (
                          <div className="min-h-[56px]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {subjectTotals.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
              {subjectTotals.map(([name, n]) => (
                <span key={name} className={cn("rounded-full px-2.5 py-1 text-xs font-medium text-tile-foreground", subjectFill(name))}>
                  {name} · {n}/week
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {modal && (
        <AssignmentFormModal
          mode={modal.mode}
          teacherId={modal.mode === "edit" ? modal.assignment.teacherId._id : view === "teacher" ? teacherId : undefined}
          teacherOptions={modal.mode === "add" && view === "class" ? teacherOptions : undefined}
          lockedClassId={view === "class" ? classId : undefined}
          lockedSectionId={view === "class" ? sectionId : undefined}
          lockedTermId={termId}
          initialSlot={modal.mode === "add" ? modal.initialSlot : undefined}
          initial={modal.mode === "edit" ? modal.assignment : undefined}
          classes={classes}
          subjects={subjects}
          sections={sections}
          terms={terms}
          onClose={() => setModal(null)}
          onSaved={loadAssignments}
        />
      )}
    </div>
  );
}
