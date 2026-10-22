import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarBlank,
  PencilSimple,
  Trash,
  Plus,
  X,
  BookOpen,
  Buildings,
  GraduationCap,
  LayoutGrid,
  Stack,
  Clock,
} from '@phosphor-icons/react';

import { academicApi } from "../api/academicApi";
import { teachersApi } from "../../teachers/api/teachersApi";
import type { Year, Level, Term, Class, Section, Subject, Period, Weekday } from "../types";
import type { Teacher } from "../../teachers/types";
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PageHeader from '@/components/common/PageHeader';
import StatStrip from '@/components/shared/StatStrip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type Tab = "Academic Years" | "Terms" | "Levels" | "Periods" | "Classes" | "Sections" | "Subjects";

// Shared Helpers

function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant={status === "active" ? "success" : "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}

function refName(ref: string | { _id: string } | undefined, field: string): string {
  if (!ref || typeof ref === "string") return "â€”";
  return (ref as unknown as Record<string, string>)[field] ?? "â€”";
}

function classTeacherName(ref: Section["classTeacherId"]): string {
  if (!ref || typeof ref === "string") return "Not assigned";
  const name = ref.userId ? `${ref.userId.firstName} ${ref.userId.lastName}` : "";
  return name.trim() || "Not assigned";
}

function SelectField({
  value, onChange, children, required = true,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="relative">
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {children}
      </NativeSelect>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function ModalWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {children}
      </DialogContent>
    </Dialog>
  );
}

function ModalHeader({ title, subtitle }: { title: string; subtitle: string; onClose?: () => void }) {
  return (
    <DialogHeader className="mb-2">
      <DialogTitle>{title}</DialogTitle>
      {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
    </DialogHeader>
  );
}

function ModalActions({ onClose, submitLabel, submitting }: { onClose: () => void; submitLabel: string; submitting?: boolean }) {
  return (
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
        disabled={submitting}
      >
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </DialogFooter>
  );
}

function TextField({
  label, value, onChange, placeholder, type = "text", required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function DeleteModal({
  title, itemName, onClose, onConfirm,
}: { title: string; itemName: string; onClose: () => void; onConfirm: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete.");
      setDeleting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Button variant="plain" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={20} />
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Are you sure you want to delete{" "}
        <span className="font-medium text-foreground">{itemName}</span>? This action cannot be undone.
      </p>
      <FormError message={error} />
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="plain"
          onClick={onClose}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </Button>
        <Button variant="plain"
          onClick={confirm}
          disabled={deleting}
          className="rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </ModalWrapper>
  );
}

/** Loads a list from the API and exposes reload/loading/error, shared by every tab below. */
function useAcademicList<T>(fetcher: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await fetcher());
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, error, reload };
}

interface OverviewCounts {
  years: number;
  activeTerms: number;
  classes: number;
  sections: number;
  subjects: number;
}

/** Fetches headline counts for the overview stat strip on the main page. */
function useOverviewCounts() {
  const [counts, setCounts] = useState<OverviewCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      academicApi.getYears(),
      academicApi.getTerms(),
      academicApi.getClasses(),
      academicApi.getSections(),
      academicApi.getSubjects(),
    ])
      .then(([years, terms, classes, sections, subjects]) => {
        if (cancelled) return;
        setCounts({
          years: years.length,
          activeTerms: terms.Funnel((t) => t.status === "active").length,
          classes: classes.length,
          sections: sections.length,
          subjects: subjects.length,
        });
      })
      .catch((err) => console.error("Failed to load overview counts", err));
    return () => { cancelled = true; };
  }, []);

  return counts;
}

// Academic Years Tab

function YearFormModal({
  mode, initial, onClose, onSave,
}: { mode: "add" | "edit"; initial?: Year; onClose: () => void; onSave: (data: { y_no: string; y_name: string }) => Promise<void> }) {
  const [yNo, setYNo] = useState(initial?.y_no ?? "");
  const [yName, setYName] = useState(initial?.y_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ y_no: yNo, y_name: yName });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk academic year.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Academic Year" : "Edit Academic Year"}
        subtitle={mode === "add" ? "Create a new academic year" : "Update the academic year information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Year Code" value={yNo} onChange={setYNo} placeholder="e.g., Y2026" />
        <TextField label="Year Name" value={yName} onChange={setYName} placeholder="e.g., 2026-2027" />
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function AcademicYearsTab() {
  const { items: years, loading, error, reload } = useAcademicList(academicApi.getYears);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Year | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Year | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Academic Years</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage academic year periods</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus size={15} /> Add Academic Year
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : years.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No academic years yet.</p>
        ) : (
          <div className="space-y-3">
            {years.map((year) => (
              <div key={year._id} className="flex items-center justify-between rounded-xl bg-muted/50 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50">
                    <Calendar size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{year.y_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{year.y_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="plain"
                    onClick={() => setEditTarget(year)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PencilSimple size={15} />
                  </Button>
                  <Button variant="plain"
                    onClick={() => setDeleteTarget(year)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <YearFormModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createYear(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <YearFormModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updateYear(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Academic Year"
          itemName={deleteTarget.y_name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deleteYear(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Terms Tab

const ALL_WEEKDAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_WORKING_DAYS: Weekday[] = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

function TermFormModal({
  mode, initial, years, onClose, onSave,
}: {
  mode: "add" | "edit";
  initial?: Term;
  years: Year[];
  onClose: () => void;
  onSave: (data: { name: string; academicYearId: string; startDate: string; endDate: string; status: "active" | "inactive"; workingDays: Weekday[] }) => Promise<void>;
}) {
  const initialYearId = typeof initial?.academicYearId === "string" ? initial.academicYearId : initial?.academicYearId?._id ?? "";
  const [name, setName] = useState(initial?.name ?? "");
  const [academicYearId, setAcademicYearId] = useState(initialYearId);
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(initial?.status ?? "active");
  const [workingDays, setWorkingDays] = useState<Weekday[]>(initial?.workingDays?.length ? initial.workingDays : DEFAULT_WORKING_DAYS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (day: Weekday) => {
    setWorkingDays((prev) => prev.includes(day) ? prev.Funnel((d) => d !== day) : [...prev, day]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workingDays.length === 0) {
      setError("Select at least one teaching day.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSave({ name, academicYearId, startDate, endDate, status, workingDays });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk term.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Term" : "Edit Term"}
        subtitle={mode === "add" ? "Create a new term" : "Update the term information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Term Name" value={name} onChange={setName} placeholder="e.g., Term 1" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Academic Year</label>
          <SelectField value={academicYearId} onChange={setAcademicYearId}>
            <option value="" disabled>Select academic year</option>
            {years.map((y) => <option key={y._id} value={y._id}>{y.y_name}</option>)}
          </SelectField>
        </div>
        <TextField label="Start Date" value={startDate} onChange={setStartDate} type="date" />
        <TextField label="End Date" value={endDate} onChange={setEndDate} type="date" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
          <SelectField value={status} onChange={(v) => setStatus(v as "active" | "inactive")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Teaching Days</label>
          <div className="grid grid-cols-4 gap-2">
            {ALL_WEEKDAYS.map((day) => (
              <label
                key={day}
                className={`flex items-center justify-center gap-1.5 border rounded-lg px-2 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  workingDays.includes(day) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={workingDays.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="sr-only"
                />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Days left unchecked (e.g. Friday) won't be offered when scheduling classes.</p>
        </div>
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function TermsTab() {
  const { items: years } = useAcademicList(academicApi.getYears);
  const { items: terms, loading, error, reload } = useAcademicList(academicApi.getTerms);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Term | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Terms</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage academic terms within years</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus size={15} /> Add Term
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : terms.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No terms yet.</p>
        ) : (
          <div className="space-y-3">
            {terms.map((term) => (
              <div key={term._id} className="flex items-center justify-between rounded-xl bg-muted/50 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100/80 dark:bg-sky-950/50">
                    <Buildings size={20} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{term.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{refName(term.academicYearId, "y_name")}</p>
                    {(term.startDate || term.endDate) && (
                      <p className="text-xs text-muted-foreground">{term.startDate?.slice(0, 10)} to {term.endDate?.slice(0, 10)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={term.status} />
                  <Button variant="plain"
                    onClick={() => setEditTarget(term)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PencilSimple size={15} />
                  </Button>
                  <Button variant="plain"
                    onClick={() => setDeleteTarget(term)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <TermFormModal
          mode="add"
          years={years}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createTerm(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <TermFormModal
          mode="edit"
          initial={editTarget}
          years={years}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updateTerm(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Term"
          itemName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deleteTerm(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Levels Tab

function LevelFormModal({
  mode, initial, onClose, onSave,
}: { mode: "add" | "edit"; initial?: Level; onClose: () => void; onSave: (data: { lev_no: string; lev_name: string }) => Promise<void> }) {
  const [levNo, setLevNo] = useState(initial?.lev_no ?? "");
  const [levName, setLevName] = useState(initial?.lev_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ lev_no: levNo, lev_name: levName });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk level.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Level" : "Edit Level"}
        subtitle={mode === "add" ? "Create a new level (e.g. Primary, Middle, Secondary)" : "Update the level information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Level Code" value={levNo} onChange={setLevNo} placeholder="e.g., LVL-SEC" />
        <TextField label="Level Name" value={levName} onChange={setLevName} placeholder="e.g., Secondary" />
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function LevelsTab() {
  const { items: levels, loading, error, reload } = useAcademicList(academicApi.getLevels);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Level | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Level | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Levels</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Groupings classes belong to (e.g. Primary, Secondary)</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus size={15} /> Add Level
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : levels.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No levels yet â€” add one before creating classes.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.map((lvl) => (
              <div key={lvl._id} className="flex items-center justify-between rounded-xl bg-muted/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50">
                    <Stack size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{lvl.lev_name}</p>
                    <p className="text-xs text-muted-foreground">{lvl.lev_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="plain"
                    onClick={() => setEditTarget(lvl)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PencilSimple size={14} />
                  </Button>
                  <Button variant="plain"
                    onClick={() => setDeleteTarget(lvl)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <LevelFormModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createLevel(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <LevelFormModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updateLevel(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Level"
          itemName={deleteTarget.lev_name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deleteLevel(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Periods Tab
// Periods are scoped to a term â€” one term might run 6 periods/day, another 7 â€” so
// the admin picks a term first, then manages that term's period list.

function PeriodFormModal({
  mode, initial, termId, onClose, onSave,
}: {
  mode: "add" | "edit";
  initial?: Period;
  termId: string;
  onClose: () => void;
  onSave: (data: { termId: string; per_no: string; per_name: string; time_in: string; time_out: string }) => Promise<void>;
}) {
  const [perNo, setPerNo] = useState(initial?.per_no ?? "");
  const [perName, setPerName] = useState(initial?.per_name ?? "");
  const [timeIn, setTimeIn] = useState(initial?.time_in ?? "");
  const [timeOut, setTimeOut] = useState(initial?.time_out ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ termId, per_no: perNo, per_name: perName, time_in: timeIn, time_out: timeOut });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk period.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Period" : "Edit Period"}
        subtitle={mode === "add" ? "Define a teaching period for this term" : "Update the period information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Period Code" value={perNo} onChange={setPerNo} placeholder="e.g., P1" />
        <TextField label="Period Name" value={perName} onChange={setPerName} placeholder="e.g., Period 1" />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Start Time" value={timeIn} onChange={setTimeIn} type="time" />
          <TextField label="End Time" value={timeOut} onChange={setTimeOut} type="time" />
        </div>
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function PeriodsTab() {
  const { items: terms } = useAcademicList(academicApi.getTerms);
  const [termId, setTermId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Period | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Period | null>(null);

  useEffect(() => {
    if (!termId && terms.length > 0) setTermId(terms[0]._id);
  }, [terms, termId]);

  const reload = useCallback(async () => {
    if (!termId) { setPeriods([]); return; }
    try {
      setLoading(true);
      setPeriods(await academicApi.getPeriods(termId));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load periods.");
    } finally {
      setLoading(false);
    }
  }, [termId]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Periods</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Daily teaching periods for a term</p>
          </div>
          <div className="flex items-center gap-3">
            <SelectField value={termId} onChange={setTermId}>
              <option value="" disabled>Select term</option>
              {terms.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </SelectField>
            <Button size="sm" onClick={() => setShowAdd(true)} disabled={!termId} className="gap-2 whitespace-nowrap">
              <Plus size={15} /> Add Period
            </Button>
          </div>
        </div>

        {!termId ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Select a term to manage its periods.</p>
        ) : loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : periods.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No periods yet for this term.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {periods.map((p) => (
              <div key={p._id} className="flex items-center justify-between rounded-xl bg-muted/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100/80 dark:bg-sky-950/50">
                    <Clock size={20} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.per_name}</p>
                    <p className="text-xs text-muted-foreground">{p.time_in} - {p.time_out}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="plain"
                    onClick={() => setEditTarget(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PencilSimple size={14} />
                  </Button>
                  <Button variant="plain"
                    onClick={() => setDeleteTarget(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && termId && (
        <PeriodFormModal
          mode="add"
          termId={termId}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createPeriod(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <PeriodFormModal
          mode="edit"
          initial={editTarget}
          termId={termId}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updatePeriod(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Period"
          itemName={deleteTarget.per_name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deletePeriod(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Classes Tab

function ClassFormModal({
  mode, initial, levels, onClose, onSave,
}: {
  mode: "add" | "edit";
  initial?: Class;
  levels: Level[];
  onClose: () => void;
  onSave: (data: { cl_no: string; cl_name: string; lev_no: string }) => Promise<void>;
}) {
  const initialLevId = typeof initial?.lev_no === "string" ? initial.lev_no : initial?.lev_no?._id ?? "";
  const [clNo, setClNo] = useState(initial?.cl_no ?? "");
  const [clName, setClName] = useState(initial?.cl_name ?? "");
  const [levNo, setLevNo] = useState(initialLevId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ cl_no: clNo, cl_name: clName, lev_no: levNo });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk class.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Class" : "Edit Class"}
        subtitle={mode === "add" ? "Create a new class" : "Update the class information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Class Code" value={clNo} onChange={setClNo} placeholder="e.g., CL-10" />
        <TextField label="Class Name" value={clName} onChange={setClName} placeholder="e.g., Grade 10" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Level</label>
          <SelectField value={levNo} onChange={setLevNo}>
            <option value="" disabled>Select level</option>
            {levels.map((l) => <option key={l._id} value={l._id}>{l.lev_name}</option>)}
          </SelectField>
        </div>
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function ClassesTab() {
  const { items: levels } = useAcademicList(academicApi.getLevels);
  const { items: classes, loading, error, reload } = useAcademicList(academicApi.getClasses);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Class | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Classes</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage class levels and grades</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            disabled={levels.length === 0}
            title={levels.length === 0 ? "Add a Level first" : undefined}
            className="gap-2"
          >
            <Plus size={15} /> Add Class
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : classes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No classes yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls._id} className="rounded-xl bg-muted/50 p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 dark:bg-emerald-950/50">
                      <GraduationCap size={32} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{cls.cl_name}</p>
                      <p className="text-xs text-muted-foreground">{cls.cl_no}</p>
                      <span className="mt-1 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        {refName(cls.lev_no, "lev_name")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="plain"
                      onClick={() => setEditTarget(cls)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <PencilSimple size={14} />
                    </Button>
                    <Button variant="plain"
                      onClick={() => setDeleteTarget(cls)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <ClassFormModal
          mode="add"
          levels={levels}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createClass(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <ClassFormModal
          mode="edit"
          initial={editTarget}
          levels={levels}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updateClass(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Class"
          itemName={deleteTarget.cl_name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deleteClass(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Sections Tab

function SectionFormModal({
  mode, initial, classes, teachers, onClose, onSave,
}: {
  mode: "add" | "edit";
  initial?: Section;
  classes: Class[];
  teachers: Teacher[];
  onClose: () => void;
  onSave: (data: { name: string; class: string; classTeacherId: string | null }) => Promise<void>;
}) {
  const initialClassId = typeof initial?.class === "string" ? initial.class : initial?.class?._id ?? "";
  const initialTeacherId = !initial?.classTeacherId
    ? ""
    : typeof initial.classTeacherId === "string" ? initial.classTeacherId : initial.classTeacherId._id;
  const [name, setName] = useState(initial?.name ?? "");
  const [classId, setClassId] = useState(initialClassId);
  const [classTeacherId, setClassTeacherId] = useState(initialTeacherId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ name, class: classId, classTeacherId: classTeacherId || null });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk section.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Section" : "Edit Section"}
        subtitle={mode === "add" ? "Create a new section" : "Update the section information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Section Name" value={name} onChange={setName} placeholder="e.g., A, B, C" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Class</label>
          <SelectField value={classId} onChange={setClassId}>
            <option value="" disabled>Select class</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
          </SelectField>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Class Teacher (Advisor)</label>
          <SelectField value={classTeacherId} onChange={setClassTeacherId} required={false}>
            <option value="">Not assigned</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.userId?.name || t.staffId}</option>)}
          </SelectField>
        </div>
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function SectionsTab() {
  const { items: classes } = useAcademicList(academicApi.getClasses);
  const { items: teachers } = useAcademicList(teachersApi.getAll);
  const { items: sections, loading, error, reload } = useAcademicList(academicApi.getSections);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Sections</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage class sections</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            disabled={classes.length === 0}
            title={classes.length === 0 ? "Add a Class first" : undefined}
            className="gap-2"
          >
            <Plus size={15} /> Add Section
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No sections yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((sec) => (
              <div key={sec._id} className="rounded-xl border border-border bg-muted/50 p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-100/80 dark:bg-violet-950/50">
                      <LayoutGrid size={22} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{sec.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{refName(sec.class, "cl_name")}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Advisor: {classTeacherName(sec.classTeacherId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="plain"
                      onClick={() => setEditTarget(sec)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <PencilSimple size={14} />
                    </Button>
                    <Button variant="plain"
                      onClick={() => setDeleteTarget(sec)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <SectionFormModal
          mode="add"
          classes={classes}
          teachers={teachers}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createSection(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <SectionFormModal
          mode="edit"
          initial={editTarget}
          classes={classes}
          teachers={teachers}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updateSection(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Section"
          itemName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deleteSection(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Subjects Tab

function SubjectFormModal({
  mode, initial, classes, onClose, onSave,
}: {
  mode: "add" | "edit";
  initial?: Subject;
  classes: Class[];
  onClose: () => void;
  onSave: (data: { sub_no: string; sub_name: string; subjectCode?: string; classId?: string; status: "active" | "inactive" }) => Promise<void>;
}) {
  const [subNo, setSubNo] = useState(initial?.sub_no ?? "");
  const [subName, setSubName] = useState(initial?.sub_name ?? "");
  const [subjectCode, setSubjectCode] = useState(initial?.subjectCode ?? "");
  const [classId, setClassId] = useState(initial?.classId ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(initial?.status ?? "active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ sub_no: subNo, sub_name: subName, subjectCode: subjectCode || undefined, classId: classId || undefined, status });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to FloppyDisk subject.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Subject" : "Edit Subject"}
        subtitle={mode === "add" ? "Create a new subject" : "Update the subject information"}
        onClose={onClose}
      />
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Subject Code (internal)" value={subNo} onChange={setSubNo} placeholder="e.g., SUB-001" />
        <TextField label="Subject Name" value={subName} onChange={setSubName} placeholder="e.g., Mathematics" />
        <TextField label="Display Code" value={subjectCode} onChange={setSubjectCode} placeholder="e.g., MATH10" required={false} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Class (optional)</label>
          <SelectField value={classId} onChange={setClassId} required={false}>
            <option value="">Not tied to a specific class</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
          </SelectField>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
          <SelectField value={status} onChange={(v) => setStatus(v as "active" | "inactive")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>
        <FormError message={error} />
        <ModalActions onClose={onClose} submitLabel={mode === "add" ? "Add" : "Update"} submitting={submitting} />
      </form>
    </ModalWrapper>
  );
}

function SubjectsTab() {
  const { items: classes } = useAcademicList(academicApi.getClasses);
  const { items: subjects, loading, error, reload } = useAcademicList(academicApi.getSubjects);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const getClassName = (id?: string) => classes.find((c) => c._id === id)?.cl_name ?? "â€”";

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Subjects</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage subjects and curriculum</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus size={15} /> Add Subject
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : subjects.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No subjects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</TableHead>
                  <TableHead className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject Name</TableHead>
                  <TableHead className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</TableHead>
                  <TableHead className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((sub) => (
                  <TableRow key={sub._id} className="border-b border-border/60 transition-colors hover:bg-muted/50">
                    <TableCell className="py-4 pr-4 font-medium text-primary">{sub.subjectCode || sub.sub_no}</TableCell>
                    <TableCell className="py-4 pr-4 font-semibold text-foreground">{sub.sub_name}</TableCell>
                    <TableCell className="py-4 pr-4 text-muted-foreground">{getClassName(sub.classId)}</TableCell>
                    <TableCell className="py-4 pr-4"><StatusPill status={sub.status} /></TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="plain"
                          onClick={() => setEditTarget(sub)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <PencilSimple size={14} />
                        </Button>
                        <Button variant="plain"
                          onClick={() => setDeleteTarget(sub)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showAdd && (
        <SubjectFormModal
          mode="add"
          classes={classes}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => { await academicApi.createSubject(data); await reload(); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <SubjectFormModal
          mode="edit"
          initial={editTarget}
          classes={classes}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => { await academicApi.updateSubject(editTarget._id, data); await reload(); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete Subject"
          itemName={deleteTarget.sub_name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => { await academicApi.deleteSubject(deleteTarget._id); await reload(); setDeleteTarget(null); }}
        />
      )}
    </>
  );
}

// Main Page

const TABS: Tab[] = ["Academic Years", "Terms", "Levels", "Periods", "Classes", "Sections", "Subjects"];

export default function AcademicStructurePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Academic Years");
  const counts = useOverviewCounts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        subtitle="Manage academic years, terms, grade levels, periods, classes, sections, and subjects."
        action={
          <Button size="sm" asChild>
            <Link to="/settings?tab=Academic" className="gap-2">
              <Calendar size={14} />
              Open Academic Calendar
            </Link>
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "Academic Years", value: counts?.years ?? "â€”", icon: CalendarBlank, tone: "sky", hint: "Configured year periods" },
          { label: "Active Terms", value: counts?.activeTerms ?? "â€”", icon: Buildings, tone: "violet", hint: "Terms currently active" },
          { label: "Classes / Sections", value: counts ? `${counts.classes} / ${counts.sections}` : "â€”", icon: GraduationCap, tone: "emerald", hint: "Grades and their sections" },
          { label: "Subjects", value: counts?.subjects ?? "â€”", icon: BookOpen, tone: "amber", hint: "Curriculum subjects" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 border border-border bg-card p-1.5 shadow-sm">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary sm:text-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeTab === "Academic Years" && <AcademicYearsTab />}
      {activeTab === "Terms"          && <TermsTab />}
      {activeTab === "Levels"         && <LevelsTab />}
      {activeTab === "Periods"        && <PeriodsTab />}
      {activeTab === "Classes"        && <ClassesTab />}
      {activeTab === "Sections"       && <SectionsTab />}
      {activeTab === "Subjects"       && <SubjectsTab />}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Calendar size={23} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Academic Calendar Setup</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Your academic calendar is generated from the academic year and term dates configured above. After setting those dates, add Buildings holidays and events in the Academic Calendar.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="rounded-full bg-card px-3 py-1.5 text-foreground ring-1 ring-border">1. Create Academic Year</span>
                <span className="text-muted-foreground/50">â†’</span>
                <span className="rounded-full bg-card px-3 py-1.5 text-foreground ring-1 ring-border">2. Add Term Dates</span>
                <span className="text-muted-foreground/50">â†’</span>
                <span className="rounded-full bg-card px-3 py-1.5 text-foreground ring-1 ring-border">3. Add Holidays & Events</span>
              </div>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link to="/settings?tab=Academic">
              <Plus size={16} /> Open Academic Calendar
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}