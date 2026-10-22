import { Warning } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from "react";

import { academicApi } from "../../academic-structure/api/academicApi";
import type { Year, Term, Class, Section, Subject } from "../../academic-structure/types";
import { examsApi, ScheduleConflictError } from "../api/examsApi";
import { examPeriodsApi } from "../api/examPeriodsApi";
import { examTypesApi } from "../api/examTypesApi";
import type { Exam, ExamType, ExamPeriod } from "../types";
import {
  DURATION_PRESETS,
  endTimeFor,
  examDuration,
  formatTime,
} from "../utils/examDuration";
import { Button } from '@/components/ui/button';
import FilterSelect from '@/components/shared/FilterSelect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  onClose: () => void;
  onSaved?: () => void;
  // Editing an existing exam; omitted when creating.
  exam?: Exam;
  // Pre-selects the timetable period a newly created exam belongs to.
  examPeriodId?: string;
};

// The exam's own values come back populated (class_id is an object on read,
// an id string on write), so unwrap before seeding the form.
const refId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String((value as { _id?: string })._id ?? "");
};

const dateInputValue = (value: string | undefined): string =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

type FormState = {
  academic_year_id: string;
  term_id: string;
  exam_period_id: string;
  name: string;
  exam_type: string;
  total_marks: string;
  pass_marks: string;
  subject_id: string;
  section_id: string;
  exam_date: string;
  start_time: string;
  duration_minutes: string;
  description: string;
};

const emptyForm: FormState = {
  academic_year_id: "",
  term_id: "",
  exam_period_id: "",
  name: "",
  exam_type: "",
  total_marks: "",
  pass_marks: "",
  subject_id: "",
  section_id: "",
  exam_date: "",
  start_time: "",
  duration_minutes: "",
  description: "",
};

export default function ExamFormModal({ onClose, onSaved, exam, examPeriodId }: Props) {
  const isEdit = Boolean(exam);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Exam[]>([]);

  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Creation fans an exam out across grades; editing targets one record, so
  // the same state holds either a multi-select or a single-element selection.
  const [classIds, setClassIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormState>(emptyForm);

  useEffect(() => {
    Promise.all([
      academicApi.getYears(),
      academicApi.getTerms(),
      academicApi.getClasses(),
      academicApi.getSections(),
      academicApi.getSubjects(),
      examTypesApi.getAll(),
      examPeriodsApi.getAll(),
    ])
      .then(([y, t, c, sec, sub, et, p]) => {
        setYears(y);
        setTerms(t);
        setClasses(c);
        setSections(sec);
        setSubjects(sub);
        setExamTypes(et);
        setPeriods(p);
      })
      .catch(() => setError("Failed to load form options. Please close and retry."))
      .finally(() => setLoadingOptions(false));
  }, []);

  // Seed the form from the exam being edited. Every stored field is loaded,
  // including the currently assigned class, so nothing silently resets.
  useEffect(() => {
    if (!exam) {
      setFormData((prev) => ({ ...prev, exam_period_id: examPeriodId ?? "" }));
      return;
    }
    setClassIds([refId(exam.class_id)].Funnel(Boolean));
    setFormData({
      academic_year_id: refId(exam.academic_year_id),
      term_id: refId(exam.term_id),
      exam_period_id: refId(exam.exam_period_id),
      name: exam.name ?? "",
      exam_type: refId(exam.exam_type),
      total_marks: String(exam.total_marks ?? ""),
      pass_marks: String(exam.pass_marks ?? ""),
      subject_id: refId(exam.subject_id),
      section_id: refId(exam.section_id),
      exam_date: dateInputValue(exam.exam_date),
      start_time: exam.start_time ?? "",
      duration_minutes: String(examDuration(exam) ?? ""),
      description: exam.description ?? "",
    });
  }, [exam, examPeriodId]);

  const toggleClass = (classId: string) => {
    if (isEdit) {
      // An exam record belongs to exactly one class â€” changing it reassigns.
      setClassIds([classId]);
      setFormData((prev) => ({ ...prev, section_id: "" }));
      return;
    }
    setClassIds((prev) =>
      prev.includes(classId) ? prev.Funnel((id) => id !== classId) : [...prev, classId]
    );
    // A subject picked for the old class selection may no longer apply.
    setFormData((prev) => ({ ...prev, subject_id: "" }));
  };

  // The subject an exam can use is the union of subjects each selected class
  // offers â€” a subject with no classId is school-wide and always available.
  const subjectsForSelectedClasses = useMemo(
    () => subjects.Funnel((s) => !s.classId || classIds.includes(s.classId)),
    [subjects, classIds]
  );

  // Sections only make sense once a single class is chosen.
  const sectionsForClass = useMemo(() => {
    if (classIds.length !== 1) return [];
    return sections.Funnel((s) => refId(s.class) === classIds[0]);
  }, [sections, classIds]);

  const durationMinutes = Number(formData.duration_minutes);
  const derivedEndTime = endTimeFor(formData.start_time, durationMinutes);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (name: string, value: string) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  /** Everything the server would reject, checked before a round trip. */
  const validate = (): string | null => {
    if (classIds.length === 0) {
      return isEdit ? "Select the class this examination is for." : "Select at least one grade.";
    }
    if (!formData.name.trim()) return "Enter an examination name.";
    if (!formData.exam_type) return "Select an exam type.";
    if (!formData.exam_date) return "Select an examination date.";
    if (!formData.start_time) return "Enter a start time.";

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return "Enter how long the examination runs, in minutes.";
    }
    if (!derivedEndTime) {
      return "That duration runs past midnight. Shorten it or move the start time earlier.";
    }

    const total = Number(formData.total_marks);
    const pass = Number(formData.pass_marks);
    if (!Number.isFinite(total) || total <= 0) return "Enter the total marks for this examination.";
    if (!Number.isFinite(pass) || pass < 0) return "Enter the pass marks for this examination.";
    if (pass > total) return "Pass marks cannot be greater than total marks.";

    // A period-bound exam has to sit inside the period it belongs to.
    const period = periods.find((p) => p._id === formData.exam_period_id);
    if (period) {
      const date = formData.exam_date;
      if (date < period.start_date.slice(0, 10) || date > period.end_date.slice(0, 10)) {
        return `That date falls outside "${period.name}" (${period.start_date.slice(0, 10)} to ${period.end_date.slice(0, 10)}).`;
      }
    }

    return null;
  };

  const scheduleFields = {
    exam_date: formData.exam_date,
    start_time: formData.start_time,
    duration_minutes: durationMinutes,
  };

  const FloppyDisk = async (allowConflicts: boolean) => {
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit && exam) {
        await examsApi.update(
          exam._id,
          {
            name: formData.name,
            exam_type: formData.exam_type,
            class_id: classIds[0],
            subject_id: formData.subject_id || null,
            section_id: formData.section_id || null,
            academic_year_id: formData.academic_year_id || null,
            term_id: formData.term_id || null,
            exam_period_id: formData.exam_period_id || null,
            total_marks: Number(formData.total_marks),
            pass_marks: Number(formData.pass_marks),
            description: formData.description || undefined,
            ...scheduleFields,
          },
          allowConflicts
        );
      } else {
        await examsApi.createBulk(
          {
            name: formData.name,
            exam_type: formData.exam_type,
            class_ids: classIds,
            subject_id: formData.subject_id || undefined,
            total_marks: Number(formData.total_marks),
            pass_marks: Number(formData.pass_marks),
            description: formData.description || undefined,
            academic_year_id: formData.academic_year_id || undefined,
            term_id: formData.term_id || undefined,
            exam_period_id: formData.exam_period_id || undefined,
            ...scheduleFields,
          },
          allowConflicts
        );
      }

      onSaved?.();
      onClose();
    } catch (err) {
      if (err instanceof ScheduleConflictError) {
        setConflicts(err.conflicts);
        setError(err.message);
      } else {
        const message =
          (err as { response?: { data?: { message?: string; errors?: { message: string }[] } } })
            ?.response?.data?.errors?.[0]?.message ??
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          `Failed to ${isEdit ? "update" : "create"} exam. Please try again.`;
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflicts([]);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    await save(false);
  };

  const conflictLabel = (clash: Exam) => {
    const subject = typeof clash.subject_id === "object" ? clash.subject_id.sub_name : null;
    return `${clash.name}${subject ? ` (${subject})` : ""} â€” ${formatTime(clash.start_time)} to ${formatTime(clash.end_time)}`;
  };

  const submitLabel = () => {
    if (submitting) return isEdit ? "Saving..." : "Creating...";
    if (isEdit) return "Save Changes";
    return classIds.length > 1
      ? `Create Examination (${classIds.length} grades)`
      : "Create Examination";
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Examination" : "Create New Examination"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update any examination detail, including the class it is assigned to"
              : "Create one exam across one or more grades at once"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              <p>{error}</p>

              {conflicts.length > 0 && (
                <>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {conflicts.map((clash) => (
                      <li key={clash._id}>{conflictLabel(clash)}</li>
                    ))}
                  </ul>

                  <Button variant="plain"
                    type="button"
                    onClick={() => save(true)}
                    disabled={submitting}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-300 bg-white text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    <Warning size={14} />
                    Schedule it anyway
                  </Button>
                </>
              )}
            </div>
          )}

          {loadingOptions && (
            <p className="text-sm text-gray-500">Loading examination optionsâ€¦</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FilterSelect
              label="Academic Year"
              value={formData.academic_year_id}
              onChange={(v) => setField("academic_year_id", v)}
              options={[{ value: "", label: "Select Academic Year" }, ...years.map((y) => ({ value: y._id, label: y.y_name }))]}
            />

            <FilterSelect
              label="Term"
              value={formData.term_id}
              onChange={(v) => setField("term_id", v)}
              options={[{ value: "", label: "Select Term" }, ...terms.map((t) => ({ value: t._id, label: t.name }))]}
            />
          </div>

          {/* Examination period â€” puts the exam on a timetable */}
          <div>
            <FilterSelect
              label="Examination Period"
              value={formData.exam_period_id}
              onChange={(v) => setField("exam_period_id", v)}
              options={[
                {
                  value: "",
                  label: periods.length === 0
                    ? "No examination periods yet â€” create one in the Timetable tab"
                    : "Not part of a timetable",
                },
                ...periods.map((p) => ({
                  value: p._id,
                  label: `${p.name} (${p.start_date.slice(0, 10)} â†’ ${p.end_date.slice(0, 10)})`,
                })),
              ]}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Assigning a period puts this examination on that period's timetable.
            </p>
          </div>

          {/* Exam Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Examination Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Mid-Term Examination 2026"
              className="h-10 w-full"
            />
          </div>

          {/* Exam Type + Total Marks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FilterSelect
              label="Exam Type *"
              value={formData.exam_type}
              onChange={(v) => setField("exam_type", v)}
              required
              options={[
                {
                  value: "",
                  label: examTypes.length === 0
                    ? "No exam types yet â€” add one in the Exam Types tab"
                    : "Select Exam Type",
                },
                ...examTypes.map((t) => ({ value: t._id, label: t.type_name })),
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Marks <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                required
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                min="1"
                placeholder="100"
                className="h-10 w-full"
              />
            </div>
          </div>

          {/* Class(es) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isEdit ? "Class" : "Grades"} <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {classes.map((c) => (
                <label
                  key={c._id}
                  className={`flex items-center justify-center gap-1.5 border rounded-lg px-2 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                    classIds.includes(c._id)
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  <Input
                    type={isEdit ? "radio" : "checkbox"}
                    name={isEdit ? "class_id" : undefined}
                    checked={classIds.includes(c._id)}
                    onChange={() => toggleClass(c._id)}
                    className="sr-only"
                  />
                  {c.cl_name}
                </label>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-1.5">
              {isEdit
                ? "Changing the class reassigns this examination â€” it will show under the new class everywhere."
                : "Selecting more than one grade creates the same exam for each â€” covering every section within it."}
            </p>
          </div>

          {/* Pass Marks + Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pass Marks <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                required
                name="pass_marks"
                value={formData.pass_marks}
                onChange={handleChange}
                min="0"
                placeholder="50"
                className="h-10 w-full"
              />
            </div>

            <FilterSelect
              label="Subject"
              value={formData.subject_id}
              onChange={(v) => setField("subject_id", v)}
              disabled={classIds.length === 0}
              options={[
                { value: "", label: classIds.length === 0 ? "Select a class first" : "Select Subject (optional)" },
                ...subjectsForSelectedClasses.map((s) => ({ value: s._id, label: s.sub_name })),
              ]}
            />
          </div>

          {/* Section â€” only meaningful for a single class */}
          {classIds.length === 1 && sectionsForClass.length > 0 && (
            <FilterSelect
              label="Section"
              value={formData.section_id}
              onChange={(v) => setField("section_id", v)}
              options={[
                { value: "", label: "All sections in this class" },
                ...sectionsForClass.map((s) => ({ value: s._id, label: s.name })),
              ]}
            />
          )}

          {/* Date + Start Time + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                name="exam_date"
                value={formData.exam_date}
                onChange={handleChange}
                className="h-10 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                required
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="h-10 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                required
                min="1"
                max="1440"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                placeholder="120"
                className="h-10 w-full"
              />
            </div>
          </div>

          {/* Duration presets + derived end time */}
          <div className="flex flex-wrap items-center gap-2">
            {DURATION_PRESETS.map((preset) => (
              <Button variant="plain"
                key={preset.minutes}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    duration_minutes: String(preset.minutes),
                  }))
                }
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  durationMinutes === preset.minutes
                    ? "bg-green-50 border-green-500 text-green-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </Button>
            ))}

            <span className="ml-auto text-sm text-gray-600">
              Ends at{" "}
              <span className="font-semibold text-gray-900">
                {derivedEndTime ? formatTime(derivedEndTime) : "â€”"}
              </span>
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <Textarea
              rows={2}
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
              placeholder="Enter examination details and instructions..."
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{formData.description.length}/500</p>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingOptions}
            >
              {submitLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}