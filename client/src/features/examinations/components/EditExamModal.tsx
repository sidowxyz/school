import { useEffect, useState } from "react";
import { SpinnerGap } from '@phosphor-icons/react';
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Subject, Term, Year } from "../../academic-structure/types";
import { examsApi } from "../api/examsApi";
import { examTypesApi } from "../api/examTypesApi";
import type { Exam, ExamType } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FilterSelect from "@/components/shared/FilterSelect";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { exams: Exam[]; onClose: () => void; onSaved: () => void };

const refId = (value: unknown) =>
  value && typeof value === "object" && "_id" in value
    ? String((value as { _id: unknown })._id)
    : String(value || "");

const refName = (value: unknown, key: string) =>
  value && typeof value === "object" && key in value
    ? String((value as Record<string, unknown>)[key] || "")
    : "";

const dateInputValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export default function EditExamModal({ exams, onClose, onSaved }: Props) {
  const exam = exams[0];
  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [types, setTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: exam.name,
    exam_type: refId(exam.exam_type),
    academic_year_id: refId(exam.academic_year_id),
    term_id: refId(exam.term_id),
    subject_id: refId(exam.subject_id),
    total_marks: String(exam.total_marks),
    pass_marks: String(exam.pass_marks),
    exam_date: dateInputValue(exam.exam_date),
    start_time: exam.start_time,
    end_time: exam.end_time,
    description: exam.description || "",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      academicApi.getYears(),
      academicApi.getTerms(),
      academicApi.getSubjects(),
      examTypesApi.getAll(),
    ])
      .then(([yList, tList, sList, typeList]) => {
        if (cancelled) return;
        setYears(yList);
        setTerms(tList);
        setSubjects(sList);
        setTypes(typeList);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load options for this exam.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const change = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const setField = (name: string, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        exam_type: form.exam_type,
        academic_year_id: form.academic_year_id || undefined,
        term_id: form.term_id || undefined,
        subject_id: form.subject_id || undefined,
        total_marks: Number(form.total_marks),
        pass_marks: Number(form.pass_marks),
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
        description: form.description.trim() || undefined,
      };

      await Promise.all(exams.map((item) => examsApi.update(item._id, payload)));
      onSaved();
      onClose();
    } catch (reason: unknown) {
      setError(
        (reason as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to update this examination."
      );
    } finally {
      setSaving(false);
    }
  };

  const grades = exams
    .map((item) => refName(item.class_id, "cl_name"))
    .Funnel(Boolean)
    .join(", ");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Examination</DialogTitle>
          <DialogDescription>
            Changes apply to {grades || "the assigned grade"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <SpinnerGap className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit-exam-name" className="text-xs font-medium">
                  Examination Name *
                </Label>
                <Input
                  id="edit-exam-name"
                  required
                  name="name"
                  value={form.name}
                  onChange={change}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FilterSelect
                  label="Exam Type *"
                  value={form.exam_type}
                  onChange={(v) => setField("exam_type", v)}
                  required
                  options={[{ value: "", label: "Select type" }, ...types.map((item) => ({ value: item._id, label: item.type_name }))]}
                />

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Grades</Label>
                  <Input value={grades} readOnly className="bg-muted text-muted-foreground" />
                </div>

                <FilterSelect
                  label="Academic Year"
                  value={form.academic_year_id}
                  onChange={(v) => setField("academic_year_id", v)}
                  options={[{ value: "", label: "Not specified" }, ...years.map((item) => ({ value: item._id, label: item.y_name }))]}
                />

                <FilterSelect
                  label="Term"
                  value={form.term_id}
                  onChange={(v) => setField("term_id", v)}
                  options={[{ value: "", label: "Not specified" }, ...terms.map((item) => ({ value: item._id, label: item.name }))]}
                />

                <FilterSelect
                  label="Subject"
                  value={form.subject_id}
                  onChange={(v) => setField("subject_id", v)}
                  options={[{ value: "", label: "All subjects" }, ...subjects.map((item) => ({ value: item._id, label: item.sub_name }))]}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-total-marks" className="text-xs font-medium">
                      Total Marks *
                    </Label>
                    <Input
                      id="edit-total-marks"
                      required
                      min="0"
                      type="number"
                      name="total_marks"
                      value={form.total_marks}
                      onChange={change}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-pass-marks" className="text-xs font-medium">
                      Pass Mark *
                    </Label>
                    <Input
                      id="edit-pass-marks"
                      required
                      min="0"
                      type="number"
                      name="pass_marks"
                      value={form.pass_marks}
                      onChange={change}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-exam-date" className="text-xs font-medium">
                    Exam Date *
                  </Label>
                  <Input
                    id="edit-exam-date"
                    required
                    type="date"
                    name="exam_date"
                    value={form.exam_date}
                    onChange={change}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-start-time" className="text-xs font-medium">
                    Start Time *
                  </Label>
                  <Input
                    id="edit-start-time"
                    required
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={change}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-end-time" className="text-xs font-medium">
                    End Time *
                  </Label>
                  <Input
                    id="edit-end-time"
                    required
                    type="time"
                    name="end_time"
                    value={form.end_time}
                    onChange={change}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-exam-desc" className="text-xs font-medium">
                  Description
                </Label>
                <Textarea
                  id="edit-exam-desc"
                  rows={2}
                  maxLength={500}
                  name="description"
                  value={form.description}
                  onChange={change}
                  className="resize-none text-xs"
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loading}>
              {saving ? (
                <>
                  <SpinnerGap size={15} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}