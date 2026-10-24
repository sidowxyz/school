import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCan, usePermission } from "../../../hooks/usePermission";
import {
  BookOpen, CalendarDots, NotePencil, ChalkboardTeacher, Clock, Envelope, IdentificationCard, PencilSimple, Plus, Stack, Trash, Trophy, UsersThree,
} from '@phosphor-icons/react';
import { teachersApi } from "../api/teachersApi";
import type { TeacherDetail, TeacherAssignment } from "../types";
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Class, Subject, Section, Term } from "../../academic-structure/types";
import AssignmentFormModal, { termLabel } from "../components/AssignmentFormModal";
import EditTeacherModal from "../components/EditTeacherModal";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import StatStrip from '@/components/shared/StatStrip';
import { EmptyState, ErrorState, ListLoading } from '@/components/common/EmptyState';
import { InfoGrid, ProfileHero, ProfileSection } from '@/components/shared/ProfileKit';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/components/common/ConfirmDialog';

// Each subject gets the same pastel tile everywhere on the page.
const SUBJECT_TILES = ["bg-tile-blue", "bg-tile-green", "bg-tile-yellow", "bg-tile-pink", "bg-tile-violet"];
const WEEK_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const canEditTimetable = useCan("timetable", "edit");
  const canSeeLogs = usePermission("teacher-portal");
  const canEditTeacher = useCan("teachers", "edit");
  const canRemoveTeacher = useCan("teachers", "delete");
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<TeacherDetail | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherAssignment | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [teacherDetail, classList, subjectList, sectionList, termList] = await Promise.all([
        teachersApi.getById(id),
        academicApi.getClasses(),
        academicApi.getSubjects(),
        academicApi.getSections(),
        academicApi.getTerms(),
      ]);
      setDetail(teacherDetail);
      setClasses(classList);
      setSubjects(subjectList);
      setSections(sectionList);
      setTerms(termList);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not load this teacher.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (assignment: TeacherAssignment) => {
    if (!id) return;
    if (!(await confirmAction({ title: `Remove ${assignment.subjectId?.sub_name ?? "this class"} from ${detail?.teacher.userId?.name ?? "this teacher"}?`, text: "Its lessons are taken off the timetable.", confirmLabel: "Remove", tone: "danger" }))) return;
    setRemovingId(assignment._id);
    try {
      await teachersApi.removeAssignment(id, assignment._id);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId(null);
    }
  };

  // Their login stops and their lessons leave the timetable; past logs and marks stay.
  const removeTeacher = async () => {
    if (!id || !detail) return;
    const ok = await confirmAction({
      title: `Remove ${detail.teacher.userId?.name ?? "this teacher"}?`,
      text: "They can no longer sign in, and their lessons are taken off the timetable. Their past teaching logs and marks stay.",
      confirmLabel: "Remove teacher",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await teachersApi.remove(id);
      showToast(`${detail.teacher.userId?.name ?? "Teacher"} removed.`);
      navigate("/teachers");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Could not remove the teacher.", "error");
    }
  };

  if (loading) return <Card className="rounded-2xl"><ListLoading rows={6} /></Card>;
  if (error || !detail) {
    return (
      <Card className="rounded-2xl">
        <ErrorState text={error || "This teacher couldn't be found."} onRetry={error ? load : undefined} />
        <div className="-mt-8 pb-8 text-center"><Button variant="outline" onClick={() => navigate("/teachers")}>Back to Teachers</Button></div>
      </Card>
    );
  }

  const { teacher, assignments } = detail;
  const name = teacher.userId?.name || "Unnamed teacher";
  const weeklyPeriods = assignments.reduce((sum, a) => sum + (a.timetableSlots?.length || 0), 0);
  const subjectNames = [...new Set(assignments.map((a) => a.subjectId?.sub_name).filter(Boolean) as string[])].sort();
  const classCount = new Set(assignments.map((a) => `${a.classId?._id}|${a.sectionId?._id}`)).size;
  const tileFor = (subject?: string) => SUBJECT_TILES[Math.max(0, subjectNames.indexOf(subject ?? "")) % SUBJECT_TILES.length];
  const addButton = canEditTimetable && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add class</Button>;

  return (
    <div className="space-y-6">
      <ProfileHero
        name={name}
        kind={teacher.department ? `Teacher · ${teacher.department}` : "Teacher"}
        status={teacher.status}
        onBack={() => navigate("/teachers")}
        backLabel="Teachers"
        chips={[
          { icon: IdentificationCard, label: `Staff ID ${teacher.staffId}` },
          ...(teacher.userId?.email ? [{ icon: Envelope, label: teacher.userId.email }] : []),
          ...(teacher.qualifications ? [{ icon: Trophy, label: teacher.qualifications }] : []),
        ]}
        actions={<>
          {canSeeLogs && (
            <Button variant="outline" className="border-transparent bg-card/80" asChild>
              <Link to={`/teacher-portal?teacherId=${teacher._id}`}><NotePencil size={16} /> Teaching logs</Link>
            </Button>
          )}
          {canEditTeacher && <Button variant="outline" className="border-transparent bg-card/80" onClick={() => setEditing(true)}><PencilSimple size={16} /> Edit</Button>}
          {addButton}
        </>}
      />

      <StatStrip items={[
        { label: "Lessons a week", value: weeklyPeriods, icon: Clock, tone: "sky", hint: "On the timetable" },
        { label: "Classes", value: classCount, icon: UsersThree, tone: "emerald", hint: "Class and section groups" },
        { label: "Subjects", value: subjectNames.length, icon: BookOpen, tone: "violet", hint: subjectNames.slice(0, 2).join(", ") || "None yet" },
        { label: "Assignments", value: assignments.length, icon: Stack, tone: "amber", hint: "Class + subject + term" },
      ]} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ProfileSection icon={ChalkboardTeacher} tint="green" title="Classes and subjects" description="What this teacher teaches, and when." flush
          action={assignments.length > 0 ? addButton : undefined}>
          {assignments.length === 0 ? (
            <EmptyState icon={BookOpen} tint="green" title="No classes yet"
              text={canEditTimetable ? "Give this teacher a class and subject to build their timetable." : "The academic office hasn't given this teacher any classes yet."}
              action={addButton} />
          ) : (
            <ul className="divide-y divide-border/70">
              {assignments.map((a) => {
                const slots = [...(a.timetableSlots ?? [])].sort((x, y) => WEEK_ORDER.indexOf(x.day) - WEEK_ORDER.indexOf(y.day));
                return (
                  <li key={a._id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-start gap-3">
                      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-tile-foreground", tileFor(a.subjectId?.sub_name))}>
                        {(a.subjectId?.sub_name ?? "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="font-semibold text-foreground">{a.subjectId?.sub_name || "—"}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
                            {a.classId?.cl_name || "—"}{a.sectionId?.name ? ` · ${a.sectionId.name}` : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDots size={13} /> {a.termId ? termLabel(a.termId) : "No term"} · {slots.length} lesson{slots.length === 1 ? "" : "s"} a week
                        </p>
                        {slots.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {slots.map((slot, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2 py-1 text-xs">
                                <span className="font-medium">{slot.day.slice(0, 3)}</span>
                                <span className="text-muted-foreground">{slot.periodId?.per_name ?? "—"}</span>
                                {slot.periodId && <span className="tabular-nums text-muted-foreground">{slot.periodId.time_in}–{slot.periodId.time_out}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {canEditTimetable && (
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditTarget(a)} aria-label={`Edit ${a.subjectId?.sub_name ?? "assignment"}`}><PencilSimple size={15} /></Button>
                          <Button variant="ghost" size="icon-sm" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemove(a)} disabled={removingId === a._id}
                            aria-label={`Remove ${a.subjectId?.sub_name ?? "assignment"}`}><Trash size={15} /></Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ProfileSection>

        <ProfileSection icon={IdentificationCard} tint="blue" title="Details">
          <InfoGrid columns={2} items={[
            { label: "Full name", value: name, wide: true },
            { label: "Staff ID", value: teacher.staffId },
            { label: "Status", value: teacher.status },
            { label: "Department", value: teacher.department },
            { label: "Email", value: teacher.userId?.email, icon: Envelope, wide: true },
            { label: "Qualifications", value: teacher.qualifications, wide: true },
          ]} />
          {canRemoveTeacher && (
            <div className="mt-5 border-t border-border pt-4">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void removeTeacher()}>
                <Trash size={15} /> Remove teacher
              </Button>
            </div>
          )}
        </ProfileSection>
      </div>

      {editing && <EditTeacherModal teacher={teacher} onClose={() => setEditing(false)} onSaved={load} />}
      {showAdd && id && (
        <AssignmentFormModal
          mode="add"
          teacherId={id}
          classes={classes}
          subjects={subjects}
          sections={sections}
          terms={terms}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}
      {editTarget && id && (
        <AssignmentFormModal
          mode="edit"
          teacherId={id}
          initial={editTarget}
          classes={classes}
          subjects={subjects}
          sections={sections}
          terms={terms}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
