import {
  Warning,
  CalendarRange,
  CheckCircle,
  PencilSimple,
  Plus,
  Trash,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from "react";

import { academicApi } from "../../academic-structure/api/academicApi";
import type { Class, Subject } from "../../academic-structure/types";
import { examPeriodsApi } from "../api/examPeriodsApi";
import { examsApi } from "../api/examsApi";
import type { Exam, ExamPeriod } from "../types";
import ExamFormModal from "./ExamFormModal";
import ExamPeriodModal from "./ExamPeriodModal";
import { examDuration, formatDuration, formatTime } from "../utils/examDuration";
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

type GroupBy = "class" | "subject" | "date" | "school";

const refId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String((value as { _id?: string })._id ?? "");
};

const refLabel = (value: unknown, key: "cl_name" | "sub_name" | "name"): string => {
  if (!value || typeof value !== "object") return "â€”";
  return String((value as Record<string, unknown>)[key] ?? "â€”");
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const periodStatusStyle = (status: ExamPeriod["status"]) => {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-700";
    case "closed":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

export default function ExamTimetable() {
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [entries, setEntries] = useState<Exam[]>([]);
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("class");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [periodModal, setPeriodModal] = useState<{ open: boolean; period?: ExamPeriod }>({
    open: false,
  });
  const [examModal, setExamModal] = useState<{ open: boolean; exam?: Exam }>({ open: false });

  const selectedPeriod = periods.find((p) => p._id === selectedPeriodId);

  const loadPeriods = useCallback(async () => {
    const list = await examPeriodsApi.getAll();
    setPeriods(list);
    setSelectedPeriodId((current) => {
      if (current && list.some((p) => p._id === current)) return current;
      return list[0]?._id ?? "";
    });
    return list;
  }, []);

  const loadTimetable = useCallback(async (periodId: string) => {
    if (!periodId) {
      setEntries([]);
      setConflictIds(new Set());
      return;
    }
    const result = await examsApi.getTimetable({ exam_period_id: periodId });
    setEntries(result.exams);
    setConflictIds(new Set(result.conflicts));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPeriods(), academicApi.getClasses(), academicApi.getSubjects()])
      .then(([, c, s]) => {
        setClasses(c);
        setSubjects(s);
      })
      .catch(() => setError("Failed to load examination periods."))
      .finally(() => setLoading(false));
  }, [loadPeriods]);

  useEffect(() => {
    loadTimetable(selectedPeriodId).catch(() => setError("Failed to load the timetable."));
  }, [selectedPeriodId, loadTimetable]);

  const refresh = useCallback(async () => {
    await loadPeriods();
    await loadTimetable(selectedPeriodId);
  }, [loadPeriods, loadTimetable, selectedPeriodId]);

  const visibleEntries = useMemo(
    () =>
      entries.Funnel(
        (entry) =>
          (!classFilter || refId(entry.class_id) === classFilter) &&
          (!subjectFilter || refId(entry.subject_id) === subjectFilter)
      ),
    [entries, classFilter, subjectFilter]
  );

  // Each class runs its own examination schedule, so the default view groups
  // by class; grouping by subject or date answers the other two questions
  // staff ask of a timetable.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: Exam[] }>();

    for (const entry of visibleEntries) {
      let key: string;
      let label: string;

      if (groupBy === "class") {
        key = refId(entry.class_id) || "unassigned";
        label = refLabel(entry.class_id, "cl_name");
      } else if (groupBy === "subject") {
        key = refId(entry.subject_id) || "unassigned";
        label = refLabel(entry.subject_id, "sub_name");
      } else if (groupBy === "date") {
        key = new Date(entry.exam_date).toISOString().slice(0, 10);
        label = dateLabel(entry.exam_date);
      } else {
        // Whole school: one date-ordered table covering every class.
        key = "school";
        label = selectedPeriod?.name ?? "School Examination Timetable";
      }

      if (!map.has(key)) map.set(key, { label, rows: [] });
      map.get(key)!.rows.push(entry);
    }

    const groups = Array.from(map.entries());
    // Date groups sort chronologically by their yyyy-mm-dd key; the other
    // views read best alphabetically.
    if (groupBy === "date") groups.sort(([a], [b]) => a.localeCompare(b));
    else groups.sort(([, a], [, b]) => a.label.localeCompare(b.label));

    return groups.map(([, group]) => group);
  }, [visibleEntries, groupBy, selectedPeriod]);

  const handleDelete = async (exam: Exam) => {
    if (!window.confirm(`Remove "${exam.name}" from this timetable? This deletes the examination.`)) {
      return;
    }
    try {
      await examsApi.delete(exam._id);
      setNotice("Examination removed from the timetable.");
      await refresh();
    } catch {
      setError("Failed to remove that examination.");
    }
  };

  const handlePublish = async () => {
    if (!selectedPeriod) return;
    setError(null);
    setNotice(null);
    try {
      await examPeriodsApi.publish(selectedPeriod._id);
      setNotice(`"${selectedPeriod.name}" timetable published.`);
      await refresh();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to publish the timetable."
      );
    }
  };

  const handleUnpublish = async () => {
    if (!selectedPeriod) return;
    try {
      await examPeriodsApi.unpublish(selectedPeriod._id);
      setNotice(`"${selectedPeriod.name}" returned to draft.`);
      await refresh();
    } catch {
      setError("Failed to return the timetable to draft.");
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriod) return;
    if (!window.confirm(`Delete the examination period "${selectedPeriod.name}"?`)) return;
    try {
      await examPeriodsApi.delete(selectedPeriod._id);
      setSelectedPeriodId("");
      setNotice("Examination period deleted.");
      await refresh();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to delete the examination period."
      );
    }
  };

  if (loading) return <p className="text-gray-500">Loading examination timetableâ€¦</p>;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Examination Period
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <NativeSelect
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="border rounded-lg px-4 py-3 min-w-[280px]"
              >
                <option value="">
                  {periods.length === 0
                    ? "No examination periods yet"
                    : "Select an examination period"}
                </option>
                {periods.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.start_date.slice(0, 10)} â†’ {p.end_date.slice(0, 10)})
                  </option>
                ))}
              </NativeSelect>

              <Button variant="plain"
                onClick={() => setPeriodModal({ open: true })}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <CalendarRange size={16} />
                New Period
              </Button>
            </div>
          </div>

          {selectedPeriod && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${periodStatusStyle(
                  selectedPeriod.status
                )}`}
              >
                {selectedPeriod.status}
              </span>

              <Button variant="plain"
                onClick={() => setPeriodModal({ open: true, period: selectedPeriod })}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                <PencilSimple size={15} />
                Edit
              </Button>

              {selectedPeriod.status === "published" ? (
                <Button variant="plain"
                  onClick={handleUnpublish}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ArrowUTurnLeft size={15} />
                  Return to Draft
                </Button>
              ) : (
                <Button variant="plain"
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                >
                  <CheckCircle size={15} />
                  Publish Timetable
                </Button>
              )}

              <Button variant="plain"
                onClick={handleDeletePeriod}
                aria-label="Delete examination period"
                className="p-2 rounded-lg border border-red-200 hover:bg-red-50"
              >
                <Trash size={15} className="text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {selectedPeriod?.description && (
          <p className="text-sm text-gray-500">{selectedPeriod.description}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          {notice}
        </div>
      )}

      {!selectedPeriodId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-500">
            Create an examination period to start building a timetable.
          </p>
        </div>
      ) : (
        <>
          {/* Filters + add entry */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <div className="flex flex-col md:flex-row gap-3">
                <NativeSelect
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                  className="border rounded-lg px-4 py-2.5 min-w-[170px]"
                >
                  <option value="class">View by Class</option>
                  <option value="subject">View by Subject</option>
                  <option value="date">View by Date</option>
                  <option value="school">Whole School</option>
                </NativeSelect>

                <NativeSelect
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="border rounded-lg px-4 py-2.5 min-w-[170px]"
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.cl_name}
                    </option>
                  ))}
                </NativeSelect>

                <NativeSelect
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="border rounded-lg px-4 py-2.5 min-w-[170px]"
                >
                  <option value="">All subjects</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.sub_name}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <Button variant="plain"
                onClick={() => setExamModal({ open: true })}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                <Plus size={16} />
                Add Timetable Entry
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              {visibleEntries.length} examination{visibleEntries.length === 1 ? "" : "s"} scheduled
              {conflictIds.size > 0 && ` â€¢ ${conflictIds.size} clashing`}
            </p>
          </div>

          {conflictIds.size > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 flex items-start gap-2">
              <Warning size={16} className="mt-0.5 shrink-0" />
              <span>
                Some examinations overlap for the same class â€” the clashing rows are highlighted
                below. Change their date, start time or duration before publishing.
              </span>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-500">
                No examinations on this timetable yet. Add the first entry to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <div
                  key={group.label}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b bg-slate-50">
                    <h3 className="font-semibold text-gray-900">
                      {group.label}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        {group.rows.length} examination{group.rows.length === 1 ? "" : "s"}
                      </span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[840px] text-sm">
                      <TableHeader>
                        <TableRow className="border-b text-gray-500">
                          <TableHead className="text-left font-medium px-6 py-3">Class</TableHead>
                          <TableHead className="text-left font-medium px-6 py-3">Subject</TableHead>
                          <TableHead className="text-left font-medium px-6 py-3">Date</TableHead>
                          <TableHead className="text-left font-medium px-6 py-3">Start</TableHead>
                          <TableHead className="text-left font-medium px-6 py-3">Duration</TableHead>
                          <TableHead className="text-left font-medium px-6 py-3">End</TableHead>
                          <TableHead className="text-right font-medium px-6 py-3">Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {group.rows.map((row) => {
                          const clashing = conflictIds.has(row._id);
                          return (
                            <TableRow
                              key={row._id}
                              className={`border-b last:border-0 ${clashing ? "bg-amber-50" : ""}`}
                            >
                              <TableCell className="px-6 py-3 font-medium text-gray-900">
                                {refLabel(row.class_id, "cl_name")}
                                {clashing && (
                                  <Warning
                                    size={14}
                                    className="inline ml-2 text-amber-600"
                                    aria-label="Scheduling clash"
                                  />
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-gray-700">
                                {refLabel(row.subject_id, "sub_name")}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-gray-700">
                                {dateLabel(row.exam_date)}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-gray-700">
                                {formatTime(row.start_time)}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-gray-700">
                                {formatDuration(examDuration(row))}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-gray-700">
                                {formatTime(row.end_time)}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="plain"
                                    onClick={() => setExamModal({ open: true, exam: row })}
                                    aria-label={`Edit ${row.name}`}
                                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                                  >
                                    <PencilSimple size={15} className="text-gray-700" />
                                  </Button>
                                  <Button variant="plain"
                                    onClick={() => handleDelete(row)}
                                    aria-label={`Delete ${row.name}`}
                                    className="p-2 rounded-lg border border-red-200 hover:bg-red-50"
                                  >
                                    <Trash size={15} className="text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {periodModal.open && (
        <ExamPeriodModal
          period={periodModal.period}
          onClose={() => setPeriodModal({ open: false })}
          onSaved={(saved) => {
            setSelectedPeriodId(saved._id);
            refresh();
          }}
        />
      )}

      {examModal.open && (
        <ExamFormModal
          exam={examModal.exam}
          examPeriodId={selectedPeriodId}
          onClose={() => setExamModal({ open: false })}
          onSaved={refresh}
        />
      )}
    </div>
  );
}