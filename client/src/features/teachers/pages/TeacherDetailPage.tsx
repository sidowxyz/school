import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCan } from "../../../hooks/usePermission";
import { SpinnerGap,
  ArrowLeft, Envelope, Plus, PencilSimple, Trash, Clock, BookOpen, GraduationCap,
  Stack, CalendarDots, Trophy,
} from '@phosphor-icons/react';
import { teachersApi } from "../api/teachersApi";
import type { TeacherDetail, TeacherAssignment } from "../types";
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Class, Subject, Section, Term } from "../../academic-structure/types";
import AssignmentFormModal, { termLabel } from "../components/AssignmentFormModal";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const canEditTimetable = useCan("timetable", "edit");
  const navigate = useNavigate();

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
      setError("Failed to load teacher.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (assignment: TeacherAssignment) => {
    if (!id) return;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-muted-foreground">
        <SpinnerGap size={32} className="animate-spin text-primary mb-3" />
        <span className="text-sm font-medium">Loading faculty profile...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-destructive">
        <p className="text-sm font-medium">{error || "Teacher profile not found."}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/teachers")} className="mt-4">
          Return to Teachers Directory
        </Button>
      </div>
    );
  }

  const { teacher, assignments } = detail;

  const totalWeeklySlots = assignments.reduce(
    (sum, a) => sum + (a.timetableSlots?.length || 0),
    0
  );
  const uniqueSubjectsCount = new Set(
    assignments.map((a) => (typeof a.subjectId === "object" ? a.subjectId?._id : a.subjectId)).filter(Boolean)
  ).size;
  const uniqueClassesCount = new Set(
    assignments.map((a) => (typeof a.classId === "object" ? a.classId?._id : a.classId)).filter(Boolean)
  ).size;

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "active") {
      return (
        <Badge variant="outline" className="border-success/20 bg-success/10 text-success font-medium">
          Active
        </Badge>
      );
    }
    if (s === "on leave") {
      return (
        <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning font-medium">
          On Leave
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="font-medium">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/teachers")}
            className="shrink-0"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Teacher Profile
              </h1>
              {getStatusBadge(teacher.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faculty assignments, curriculum allocations, and scheduled teaching periods.
            </p>
          </div>
        </div>

        {canEditTimetable && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="shrink-0">
            <Plus size={15} />
            Add Assignment
          </Button>
        )}
      </div>

      {/* Hero Faculty Card */}
      <Card className="border-border/80 shadow-2xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 border border-border shadow-xs">
                <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
                  {teacher.userId?.name ? teacher.userId.name.slice(0, 2).toUpperCase() : "TC"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
                    {teacher.userId?.name || "Unnamed Teacher"}
                  </h2>
                  {teacher.department && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {teacher.department}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                  <span className="font-mono font-medium text-foreground">
                    Staff ID: {teacher.staffId}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Envelope size={13} className="text-muted-foreground" />
                    {teacher.userId?.email || "No email on record"}
                  </span>
                </div>
                {teacher.qualifications && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Trophy size={13} className="text-primary/70 shrink-0" />
                    <span>{teacher.qualifications}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-right">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                  Weekly Workload
                </span>
                <span className="text-lg font-bold text-foreground block">
                  {totalWeeklySlots} <span className="text-xs font-normal text-muted-foreground">Periods / wk</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hairline Divided Metric Panel */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BookOpen size={15} className="text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider">Assignments</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{assignments.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active subject courses</p>
          </div>

          <div className="bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Stack size={15} className="text-info" />
              <span className="text-xs font-medium uppercase tracking-wider">Classes Taught</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{uniqueClassesCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Assigned cohort groups</p>
          </div>

          <div className="bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <GraduationCap size={15} className="text-info" />
              <span className="text-xs font-medium uppercase tracking-wider">Subjects</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{uniqueSubjectsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Curriculum subjects</p>
          </div>

          <div className="bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock size={15} className="text-success" />
              <span className="text-xs font-medium uppercase tracking-wider">Teaching Slots</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalWeeklySlots}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Scheduled timetable slots</p>
          </div>
        </div>
      </Card>

      {/* Assignments Section */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Class & Subject Assignments
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Assigned classes, sections, and scheduled timetable periods
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> New Assignment
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <BookOpen size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No teaching assignments recorded</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                Assign this teacher to classes and subjects to generate their instructional timetable.
              </p>
              <Button size="sm" onClick={() => setShowAdd(true)} className="mt-3">
                <Plus size={14} /> Assign Course
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => (
                <div
                  key={a._id}
                  className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                        <BookOpen size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-semibold text-base text-foreground">
                            {a.subjectId?.sub_name || "—"}
                          </h3>
                          {a.subjectId?.sub_no && (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              {a.subjectId.sub_no}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <Stack size={13} className="text-muted-foreground" />
                            {a.classId?.cl_name || "—"} • {a.sectionId?.name || "—"}
                            {a.classId?.lev_no && (
                              <span className="text-muted-foreground font-normal">
                                {" "}({a.classId.lev_no.lev_name})
                              </span>
                            )}
                          </span>
                          {a.termId && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1.5">
                                <CalendarDots size={13} className="text-muted-foreground" />
                                {termLabel(a.termId)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {canEditTimetable && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditTarget(a)}
                          aria-label="Edit assignment"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <PencilSimple size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(a)}
                          disabled={removingId === a._id}
                          aria-label="Remove assignment"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash size={15} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {a.timetableSlots && a.timetableSlots.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-border/60">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                        Timetable Periods ({a.timetableSlots.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {a.timetableSlots.map((slot, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 bg-muted/40 border border-border/70 text-xs text-foreground px-2.5 py-1 rounded-lg"
                          >
                            <Clock size={12} className="text-muted-foreground" />
                            <span className="font-medium">{slot.day}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{slot.periodId?.per_name || "—"}</span>
                            {slot.periodId && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                ({slot.periodId.time_in}–{slot.periodId.time_out})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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