import { useEffect, useState } from "react";
import { Plus, Trash, Books } from '@phosphor-icons/react';
import { teachersApi } from "../api/teachersApi";
import type { TimetableSlotInput, Weekday, RefSubject, RefClass, RefSection, RefTerm, TimetableSlot } from "../types";
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Class, Subject, Section, Term, Period } from "../../academic-structure/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FilterSelect from "@/components/shared/FilterSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmAction } from '@/components/common/ConfirmDialog';

const DAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function termLabel(term: Term | RefTerm) {
  const year = typeof term.academicYearId === "string" ? null : term.academicYearId;
  return year ? `${term.name} (${year.y_name})` : term.name;
}

interface AssignmentLike {
  _id: string;
  subjectId: RefSubject;
  classId: RefClass;
  sectionId: RefSection;
  termId: RefTerm;
  timetableSlots: TimetableSlot[];
}

export interface TeacherOption {
  _id: string;
  label: string;
}

export default function AssignmentFormModal({
  mode,
  teacherId,
  teacherOptions,
  lockedClassId,
  lockedSectionId,
  lockedTermId,
  initialSlot,
  initial,
  classes,
  subjects,
  sections,
  terms,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  teacherId?: string;
  teacherOptions?: TeacherOption[];
  lockedClassId?: string;
  lockedSectionId?: string;
  lockedTermId?: string;
  initialSlot?: { day: Weekday; periodId: string };
  initial?: AssignmentLike;
  classes: Class[];
  subjects: Subject[];
  sections: Section[];
  terms: Term[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId?._id ?? "");
  const [classId, setClassId] = useState(initial?.classId?._id ?? lockedClassId ?? "");
  const [sectionId, setSectionId] = useState(initial?.sectionId?._id ?? lockedSectionId ?? "");
  const [termId, setTermId] = useState(initial?.termId?._id ?? lockedTermId ?? "");
  const [slots, setSlots] = useState<TimetableSlotInput[]>(
    initial?.timetableSlots?.length
      ? initial.timetableSlots.map((s) => ({ day: s.day, periodId: s.periodId._id }))
      : initialSlot
      ? [initialSlot]
      : [{ day: "Monday", periodId: "" }]
  );
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sectionsForClass = sections.filter((s) => (typeof s.class === "string" ? s.class : s.class._id) === classId);
  const selectedTerm = terms.find((t) => t._id === termId);
  const workingDays: Weekday[] = selectedTerm?.workingDays?.length ? selectedTerm.workingDays : DAYS;

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

  const [hasUserChangedTerm, setHasUserChangedTerm] = useState(false);
  useEffect(() => {
    if (hasUserChangedTerm) {
      setSlots([{ day: workingDays[0] ?? "Monday", periodId: "" }]);
    }
  }, [termId]);

  const updateSlot = (i: number, patch: Partial<TimetableSlotInput>) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const addSlot = () => setSlots((prev) => [...prev, { day: workingDays[0] ?? "Monday", periodId: "" }]);
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const periodTimes = (periodId: string) => periods.find((p) => p._id === periodId);

  const slotsOverlap = (a: TimetableSlotInput, b: TimetableSlotInput) => {
    if (a.day !== b.day) return false;
    const pa = periodTimes(a.periodId);
    const pb = periodTimes(b.periodId);
    if (!pa || !pb) return false;
    return pa.time_in < pb.time_out && pb.time_in < pa.time_out;
  };

  const validateSlotsLocally = (): string | null => {
    for (const slot of slots) {
      if (!slot.periodId) return "Every row needs a period selected.";
    }
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].day === slots[j].day && slots[i].periodId === slots[j].periodId) {
          return `The same period is selected twice for ${slots[i].day}.`;
        }
        if (slotsOverlap(slots[i], slots[j])) {
          const pa = periodTimes(slots[i].periodId);
          const pb = periodTimes(slots[j].periodId);
          return `${pa?.per_name} and ${pb?.per_name} overlap on ${slots[i].day}.`;
        }
      }
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const effectiveTeacherId = teacherId || selectedTeacherId;
    if (!effectiveTeacherId) {
      setError("Please select a teacher.");
      return;
    }

    const localError = validateSlotsLocally();
    if (localError) {
      setError(localError);
      return;
    }

    setSubmitting(true);
    const payload = { subjectId, classId, sectionId, termId, timetableSlots: slots };
    try {
      if (mode === "add") {
        await teachersApi.addAssignment(effectiveTeacherId, payload);
      } else if (initial) {
        await teachersApi.updateAssignment(effectiveTeacherId, initial._id, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save assignment.");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    const effectiveTeacherId = teacherId || selectedTeacherId;
    if (!effectiveTeacherId) return;
    if (!(await confirmAction({ title: "Remove this class from the teacher?", text: "Its lessons are taken off the timetable.", confirmLabel: "Remove", tone: "danger" }))) return;
    setSubmitting(true);
    setError("");
    try {
      await teachersApi.removeAssignment(effectiveTeacherId, initial._id);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to remove assignment.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader icon={Books} tint="yellow">
          <DialogTitle>
            {mode === "add" ? "Add Assignment" : "Edit Assignment"}
          </DialogTitle>
          <DialogDescription>
            Assign faculty member to a class, section, and subject for a specific term
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {!teacherId && teacherOptions && (
            <FilterSelect
              label="Teacher *"
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              options={teacherOptions.map((t) => ({ value: t._id, label: t.label }))}
              placeholder="Select teacher"
              required
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FilterSelect
              label="Subject *"
              value={subjectId}
              onChange={setSubjectId}
              options={subjects.map((s) => ({ value: s._id, label: s.sub_name }))}
              placeholder="Select subject"
              required
            />

            <div className="space-y-1.5">
              {lockedClassId ? (
                <>
                  <span className="block text-xs font-medium text-muted-foreground">Class *</span>
                  <div className="h-10 flex items-center px-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
                    {classes.find((c) => c._id === lockedClassId)?.cl_name || "—"}
                  </div>
                </>
              ) : (
                <FilterSelect
                  label="Class *"
                  value={classId}
                  onChange={(v) => {
                    setClassId(v);
                    setSectionId("");
                  }}
                  options={classes.map((c) => ({ value: c._id, label: c.cl_name }))}
                  placeholder="Select class"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              {lockedSectionId ? (
                <>
                  <span className="block text-xs font-medium text-muted-foreground">Section *</span>
                  <div className="h-10 flex items-center px-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
                    {sections.find((s) => s._id === lockedSectionId)?.name || "—"}
                  </div>
                </>
              ) : (
                <FilterSelect
                  label="Section *"
                  value={sectionId}
                  onChange={setSectionId}
                  options={sectionsForClass.map((s) => ({ value: s._id, label: s.name }))}
                  placeholder="Select section"
                  required
                  disabled={!classId}
                />
              )}
            </div>

            <div className="space-y-1.5">
              {lockedTermId ? (
                <>
                  <span className="block text-xs font-medium text-muted-foreground">Term *</span>
                  <div className="h-10 flex items-center px-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
                    {terms.find((t) => t._id === lockedTermId)
                      ? termLabel(terms.find((t) => t._id === lockedTermId)!)
                      : "—"}
                  </div>
                </>
              ) : (
                <FilterSelect
                  label="Term *"
                  value={termId}
                  onChange={(v) => {
                    setHasUserChangedTerm(true);
                    setTermId(v);
                  }}
                  options={terms.map((t) => ({ value: t._id, label: termLabel(t) }))}
                  placeholder="Select term"
                  required
                />
              )}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Timetable Slots</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={addSlot}
                disabled={!termId}
                className="text-primary hover:text-primary"
              >
                <Plus size={13} className="mr-1" /> Add slot
              </Button>
            </div>

            {!termId ? (
              <p className="text-xs text-muted-foreground">Select a term first to choose from its periods.</p>
            ) : periodsLoading ? (
              <p className="text-xs text-muted-foreground">Loading periods...</p>
            ) : periods.length === 0 ? (
              <p className="text-xs text-warning">
                This term has no periods yet — add them under Academic Structure &rarr; Periods first.
              </p>
            ) : (
              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-[150px] shrink-0">
                      <FilterSelect
                        value={slot.day}
                        onChange={(v) => updateSlot(i, { day: v as Weekday })}
                        options={workingDays.map((d) => ({ value: d, label: d }))}
                      />
                    </div>
                    <div className="flex-1">
                      <FilterSelect
                        value={slot.periodId}
                        onChange={(v) => updateSlot(i, { periodId: v })}
                        options={periods.map((p) => ({ value: p._id, label: `${p.per_name} (${p.time_in}-${p.time_out})` }))}
                        placeholder="Select period"
                        required
                      />
                    </div>
                    {slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(i)}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash size={15} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="pt-3 flex flex-row items-center justify-between sm:justify-between">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
              >
                Delete Assignment
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : mode === "add" ? "Add Assignment" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}