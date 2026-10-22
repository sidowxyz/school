import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, CalendarBlank, Clock, CalendarX, BookOpen } from '@phosphor-icons/react';
import PageHeader from "../../../components/common/PageHeader";
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Term, Class, Section, Subject, Period } from "../../academic-structure/types";
import { teachersApi } from "../../teachers/api/teachersApi";
import type { Teacher, Weekday } from "../../teachers/types";
import { timetableApi } from "../api/timetableApi";
import type { Assignment } from "../types";
import AssignmentFormModal, { termLabel, type TeacherOption } from "../../teachers/components/AssignmentFormModal";
import { Button } from '@/components/ui/button';
import FilterSelect from '@/components/shared/FilterSelect';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

// Somali Buildings week â€” Saturday through Thursday, Friday off by default. Terms
// can customize this via workingDays, so the grid always follows the term.
const WEEK_ORDER: Weekday[] = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const BADGE_COLORS = [
  "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60",
  "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60",
  "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/60",
  "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60",
  "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60",
  "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60",
  "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60",
  "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60",
];
function badgeColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

type ModalState =
  | { mode: "add"; initialSlot?: { day: Weekday; periodId: string } }
  | { mode: "edit"; assignment: Assignment };

export default function TimetablePage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState("");

  const [viewType, setViewType] = useState<"teacher" | "class">("teacher");
  const [termId, setTermId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const [modal, setModal] = useState<ModalState | null>(null);

  // Reference data â€” terms, classes, sections, subjects, teachers.
  useEffect(() => {
    (async () => {
      try {
        setRefLoading(true);
        const [termList, classList, sectionList, subjectList, teacherList] = await Promise.all([
          academicApi.getTerms(),
          academicApi.getClasses(),
          academicApi.getSections(),
          academicApi.getSubjects(),
          teachersApi.getAll(),
        ]);
        setTerms(termList);
        setClasses(classList);
        setSections(sectionList);
        setSubjects(subjectList);
        setTeachers(teacherList);

        const defaultTerm = termList.find((t) => t.status === "active") ?? termList[0];
        if (defaultTerm) setTermId(defaultTerm._id);
        if (teacherList[0]) setTeacherId(teacherList[0]._id);
        if (classList[0]) {
          setClassId(classList[0]._id);
          const firstSection = sectionList.find(
            (s) => (typeof s.class === "string" ? s.class : s.class._id) === classList[0]._id
          );
          if (firstSection) setSectionId(firstSection._id);
        }
        setRefError("");
      } catch (err) {
        console.error(err);
        setRefError("Failed to load timetable reference data.");
      } finally {
        setRefLoading(false);
      }
    })();
  }, []);

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

  // Keep section in sync with class in Class View.
  useEffect(() => {
    if (viewType !== "class" || !classId) return;
    const stillValid = sections.some((s) => s._id === sectionId && (typeof s.class === "string" ? s.class : s.class._id) === classId);
    if (stillValid) return;
    const firstSection = sections.find((s) => (typeof s.class === "string" ? s.class : s.class._id) === classId);
    setSectionId(firstSection?._id ?? "");
  }, [viewType, classId, sections, sectionId]);

  const loadAssignments = useCallback(async () => {
    if (!termId) { setAssignments([]); return; }
    if (viewType === "teacher" && !teacherId) { setAssignments([]); return; }
    if (viewType === "class" && (!classId || !sectionId)) { setAssignments([]); return; }

    try {
      setAssignmentsLoading(true);
      const data = await timetableApi.getAssignments(
        viewType === "teacher" ? { termId, teacherId } : { termId, classId, sectionId }
      );
      setAssignments(data);
    } catch (err) {
      console.error(err);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [termId, viewType, teacherId, classId, sectionId]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const selectedTerm = terms.find((t) => t._id === termId);
  const workingDays: Weekday[] = selectedTerm?.workingDays?.length ? selectedTerm.workingDays : WEEK_ORDER;
  const days = WEEK_ORDER.Funnel((d) => workingDays.includes(d));
  const offDays = WEEK_ORDER.Funnel((d) => !workingDays.includes(d));
  const sortedPeriods = useMemo(
    () => periods.slice().sort((a, b) => (Number(a.per_no) || 0) - (Number(b.per_no) || 0)),
    [periods]
  );

  const sectionsForClass = sections.Funnel((s) => (typeof s.class === "string" ? s.class : s.class._id) === classId);
  const teacherOptions: TeacherOption[] = teachers.map((t) => ({ _id: t._id, label: t.userId?.name || t.staffId }));

  const cellFor = (day: Weekday, periodId: string) => {
    for (const a of assignments) {
      const slot = a.timetableSlots.find((s) => s.day === day && s.periodId._id === periodId);
      if (slot) return a;
    }
    return null;
  };

  const canCreate = viewType === "teacher" ? !!teacherId : !!(classId && sectionId);

  const openAdd = (day?: Weekday, periodId?: string) => {
    if (!termId || !canCreate) return;
    setModal({ mode: "add", initialSlot: day && periodId ? { day, periodId } : undefined });
  };
  const openEdit = (assignment: Assignment) => setModal({ mode: "edit", assignment });

  if (refLoading) return <div className="text-center py-24 text-gray-500">Loading timetable...</div>;
  if (refError) return <div className="text-center py-24 text-red-500">{refError}</div>;

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Weekly timetable for teachers and classes"
        action={
          <Button
            onClick={() => openAdd()}
            disabled={!termId || !canCreate}
            className="gap-2 text-sm font-semibold"
          >
            <Plus size={16} /> Add Timetable Entry
          </Button>
        }
      />

      {/* 4 Stat KPI Cards matching the Admin Dashboard standard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Card className="border-t-2 border-t-emerald-500 border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Teaching Days</p>
              <h4 className="text-2xl font-bold tracking-tight text-foreground mt-1">{days.length} Days</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{days.length ? `${days[0]} â€“ ${days[days.length - 1]}` : "No schedule"}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <CalendarBlank size={18} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-sky-500 border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Periods Per Day</p>
              <h4 className="text-2xl font-bold tracking-tight text-foreground mt-1">{sortedPeriods.length} Periods</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active daily schedule</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
              <Clock size={18} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-indigo-500 border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scheduled Slots</p>
              <h4 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {assignments.reduce((acc, a) => acc + (a.timetableSlots?.length || 0), 0)} Slots
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">In current selection</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <BookOpen size={18} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-rose-500 border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{offDays.length === 1 ? "Day Off" : "Days Off"}</p>
              <h4 className="text-base font-bold tracking-tight text-foreground truncate max-w-[130px] mt-1">
                {offDays.length ? offDays.join(", ") : "None"}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{offDays.length ? "Weekend / recess" : "7 days active"}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
              <CalendarX size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="mb-5 border-border/80 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect
              label="View Type"
              value={viewType}
              onChange={(v) => setViewType(v as "teacher" | "class")}
              options={[{ value: "teacher", label: "Teacher View" }, { value: "class", label: "Class View" }]}
              className="min-w-[160px]"
            />

            <FilterSelect
              label="Academic Term"
              value={termId}
              onChange={setTermId}
              options={terms.length ? terms.map((t) => ({ value: t._id, label: termLabel(t) })) : [{ value: "", label: "No terms yet" }]}
              className="min-w-[180px]"
            />

            {viewType === "teacher" && (
              <FilterSelect
                label="Assigned Teacher"
                value={teacherId}
                onChange={setTeacherId}
                options={teachers.length ? teachers.map((t) => ({ value: t._id, label: t.userId?.name || t.staffId })) : [{ value: "", label: "No teachers yet" }]}
                className="min-w-[200px]"
              />
            )}

            {viewType === "class" && (
              <>
                <FilterSelect
                  label="Target Class"
                  value={classId}
                  onChange={setClassId}
                  options={classes.length ? classes.map((c) => ({ value: c._id, label: c.cl_name })) : [{ value: "", label: "No classes yet" }]}
                  className="min-w-[160px]"
                />
                <FilterSelect
                  label="Section Division"
                  value={sectionId}
                  onChange={setSectionId}
                  options={sectionsForClass.length ? sectionsForClass.map((s) => ({ value: s._id, label: s.name })) : [{ value: "", label: "No sections yet" }]}
                  className="min-w-[160px]"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!termId ? (
        <Card className="border-border/80 p-12 text-center text-sm text-muted-foreground shadow-2xs">
          Create an academic term under Academic Structure first to activate timetable scheduling.
        </Card>
      ) : periodsLoading ? (
        <Card className="border-border/80 p-12 text-center text-sm text-muted-foreground shadow-2xs">
          Loading timetable periods...
        </Card>
      ) : sortedPeriods.length === 0 ? (
        <Card className="border-border/80 p-12 text-center text-sm text-amber-600 dark:text-amber-400 shadow-2xs">
          This term has no periods defined yet â€” configure timetable periods under Academic Structure first.
        </Card>
      ) : (
        <Card className="overflow-x-auto border-border/80 shadow-2xs">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/20">
                <TableHead className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[140px]">Period</TableHead>
                {days.map((day) => (
                  <TableHead key={day} className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[130px]">{day}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPeriods.map((period) => (
                <TableRow key={period._id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap bg-muted/20 py-3 px-4 font-medium">
                    <div className="text-sm font-semibold text-foreground">{period.per_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{period.time_in} - {period.time_out}</div>
                  </TableCell>

                  {days.map((day) => {
                    const assignment = cellFor(day, period._id);
                    const cellKey = `${day}-${period._id}`;

                    if (assignmentsLoading) {
                      return <TableCell key={cellKey} className="p-2"><span className="text-muted-foreground/50">â€¦</span></TableCell>;
                    }

                    if (!assignment) {
                      return (
                        <TableCell key={cellKey} className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => openAdd(day, period._id)}
                            disabled={!canCreate}
                            className="flex h-full min-h-[58px] w-full items-center justify-center rounded-lg border border-dashed border-border/70 text-muted-foreground/40 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all disabled:cursor-not-allowed disabled:hover:border-border/70 disabled:hover:bg-transparent"
                            title={canCreate ? "Add timetable entry" : undefined}
                          >
                            <Plus size={15} />
                          </Button>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={cellKey} className="p-2">
                        <Button
                          variant="plain"
                          type="button"
                          onClick={() => openEdit(assignment)}
                          className={`h-auto min-h-[58px] w-full flex-col justify-center rounded-lg p-2.5 text-center font-normal ${badgeColor(assignment.subjectId?.sub_name || "")} shadow-2xs hover:shadow-xs transition-all hover:Scales-[1.01]`}
                        >
                          <p className="font-bold text-xs leading-snug">{assignment.subjectId?.sub_name || "â€”"}</p>
                          {viewType === "teacher" ? (
                            <p className="text-[11px] opacity-80 mt-1">{assignment.classId?.cl_name} &middot; {assignment.sectionId?.name}</p>
                          ) : (
                            <p className="text-[11px] opacity-80 mt-1">{assignment.teacherId?.userId?.name || "â€”"}</p>
                          )}
                        </Button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {modal && (
        <AssignmentFormModal
          mode={modal.mode}
          teacherId={
            modal.mode === "edit"
              ? modal.assignment.teacherId._id
              : viewType === "teacher"
              ? teacherId
              : undefined
          }
          teacherOptions={modal.mode === "add" && viewType === "class" ? teacherOptions : undefined}
          lockedClassId={viewType === "class" ? classId : undefined}
          lockedSectionId={viewType === "class" ? sectionId : undefined}
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