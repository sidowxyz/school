import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCan, usePermission } from "../../../hooks/usePermission";
import type { DrawerTint } from "@/components/ui/drawer-kit";
import {
  Calendar,
  CalendarBlank,
  PencilSimple,
  Trash,
  Plus,
  BookOpen,
  Buildings,
  GraduationCap,
  SquaresFour,
  Stack,
  Clock,
  Check,
  type Icon,
} from '@phosphor-icons/react';

import { academicApi } from "../api/academicApi";
import { teachersApi } from "../../teachers/api/teachersApi";
import type { Year, Level, Term, Class, Section, Subject, Period, Weekday } from "../types";
import type { Teacher } from "../../teachers/types";
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker, TimePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, ListLoading } from "@/components/common/EmptyState";

type Tab = "Academic Years" | "Terms" | "Levels" | "Periods" | "Classes" | "Sections" | "Subjects";

// Shared Helpers

/** The white card every tab sits in: title, one line of help, the add button. */
function TabPanel({ title, description, action, toolbar, children }: {
  title: string; description: string; action?: React.ReactNode; toolbar?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{toolbar}{action}</div>
      </div>
      {children}
    </Card>
  );
}

function AddButton({ label, onClick, disabled, title }: { label: string; onClick: () => void; disabled?: boolean; title?: string }) {
  const canCreate = useCan("academic-structure", "create");
  if (!canCreate) return null;
  return (
    <Button size="sm" onClick={onClick} disabled={disabled} title={title} className="gap-1.5">
      <Plus size={15} weight="bold" /> {label}
    </Button>
  );
}

/** Loading, error and empty states shared by every list. */
function ListState({ loading, error, empty, emptyText, children }: {
  loading: boolean; error: string; empty: boolean; emptyText: string; children: React.ReactNode;
}) {
  if (loading) return <ListLoading rows={3} />;
  if (error) return <ErrorState text={error} compact />;
  if (empty) return <EmptyState icon={Stack} tint="violet" title="Nothing here yet" text={emptyText} />;
  return <>{children}</>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "32 / 40 students", amber when nearly full and pink when full. */
function SeatsBadge({ count, capacity }: { count: number; capacity?: number | null }) {
  if (!capacity) return <Badge variant="secondary">{plural(count, "student")}</Badge>;
  const full = count >= capacity;
  const tone = full ? "bg-tile-pink text-tile-foreground" : count / capacity >= 0.9 ? "bg-tile-yellow text-tile-foreground" : "bg-muted text-foreground/80";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}>{count} / {capacity}{full ? " · full" : ""}</span>;
}

const ICON_TINTS = {
  blue: "bg-tile-blue", green: "bg-tile-green", yellow: "bg-tile-yellow", pink: "bg-tile-pink", violet: "bg-tile-violet",
} as const;

/** One row of a list: pastel icon, name, details, then badges and edit/delete. */
function ItemRow({ icon: RowIcon, tint, title, meta, badges, onEdit, onDelete }: {
  icon: Icon; tint: keyof typeof ICON_TINTS; title: React.ReactNode; meta?: React.ReactNode; badges?: React.ReactNode;
  onEdit: () => void; onDelete: () => void;
}) {
  const canEdit = useCan("academic-structure", "edit");
  const canDelete = useCan("academic-structure", "delete");
  return (
    <li className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-tile-foreground ${ICON_TINTS[tint]}`}>
        <RowIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      {badges && <div className="hidden shrink-0 items-center gap-2 sm:flex">{badges}</div>}
      <div className="flex shrink-0 items-center gap-1">
        {canEdit && (
          <Button variant="ghost" size="icon-sm" onClick={onEdit} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
            <PencilSimple size={15} />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon-sm" onClick={onDelete} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
            <Trash size={15} />
          </Button>
        )}
      </div>
    </li>
  );
}

function ItemList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-border">{children}</ul>;
}

const fmtDay = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "";

function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant={status === "active" ? "success" : "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}

function refName(ref: string | { _id: string } | undefined, field: string): string {
  if (!ref || typeof ref === "string") return "—";
  return (ref as unknown as Record<string, string>)[field] ?? "—";
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

function ModalWrapper({ onClose, children, centered }: { onClose: () => void; children: React.ReactNode; centered?: boolean }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent centered={centered} className={centered ? "max-w-md" : undefined}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function ModalHeader({ title, subtitle, icon, tint }: { title: string; subtitle: string; onClose?: () => void; icon?: Icon; tint?: DrawerTint }) {
  return (
    <DialogHeader icon={icon ?? Stack} tint={tint}>
      <DialogTitle>{title}</DialogTitle>
      {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
    </DialogHeader>
  );
}

function ModalActions({ onClose, submitLabel, submitting }: { onClose: () => void; submitLabel: string; submitting?: boolean }) {
  return (
    <DialogFooter>
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
      {type === "date" ? (
        <DatePicker value={value} onChange={onChange} required={required} aria-label={label} />
      ) : type === "time" ? (
        <TimePicker value={value} onChange={onChange} required={required} aria-label={label} />
      ) : (
        <Input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
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
    <ModalWrapper onClose={onClose} centered>
      <DialogHeader icon={Trash} tint="pink">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{itemName}</span>? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <FormError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={confirm} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogFooter>
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
  terms: number;
  levels: number;
  classes: number;
  sections: number;
  subjects: number;
}

/** Fetches headline counts for the overview stat strip on the main page. */
function useOverviewCounts(refreshKey: string) {
  const [counts, setCounts] = useState<OverviewCounts | null>(null);

  // Re-counted whenever the open tab changes, so a step ticks once it is done.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      academicApi.getYears(),
      academicApi.getTerms(),
      academicApi.getLevels(),
      academicApi.getClasses(),
      academicApi.getSections(),
      academicApi.getSubjects(),
    ])
      .then(([years, terms, levels, classes, sections, subjects]) => {
        if (cancelled) return;
        setCounts({
          years: years.length,
          terms: terms.length,
          levels: levels.length,
          classes: classes.length,
          sections: sections.length,
          subjects: subjects.length,
        });
      })
      .catch((err) => console.error("Failed to load overview counts", err));
    return () => { cancelled = true; };
  }, [refreshKey]);

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
      setError(err?.response?.data?.message || "Failed to save academic year.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Academic Year" : "Edit Academic Year"}
        icon={Calendar}
        tint="blue"
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

      <TabPanel title="Academic Years" description="The school years, e.g. 2026–2027." action={<AddButton label="Add year" onClick={() => setShowAdd(true)} />}>
        <ListState loading={loading} error={error} empty={years.length === 0} emptyText="No academic years yet. Add the current school year to start.">
          <ItemList>
            {years.map((year) => (
              <ItemRow key={year._id} icon={CalendarBlank} tint="blue" title={year.y_name} meta={year.y_no}
                onEdit={() => setEditTarget(year)} onDelete={() => setDeleteTarget(year)} />
            ))}
          </ItemList>
        </ListState>
      </TabPanel>

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
    setWorkingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
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
      setError(err?.response?.data?.message || "Failed to save term.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Term" : "Edit Term"}
        icon={CalendarBlank}
        tint="green"
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

      <TabPanel title="Terms" description="Terms inside each year, with their dates and school days."
        action={<AddButton label="Add term" onClick={() => setShowAdd(true)} disabled={years.length === 0} title={years.length === 0 ? "Add an academic year first" : undefined} />}>
        <ListState loading={loading} error={error} empty={terms.length === 0} emptyText={years.length === 0 ? "Add an academic year first, then its terms." : "No terms yet."}>
          <ItemList>
            {terms.map((term) => (
              <ItemRow key={term._id} icon={Buildings} tint="violet" title={term.name}
                meta={[refName(term.academicYearId, "y_name"), term.startDate || term.endDate ? `${fmtDay(term.startDate)} – ${fmtDay(term.endDate)}` : "", term.workingDays?.length ? `${term.workingDays.length} school days a week` : ""].filter(Boolean).join(" · ")}
                badges={<StatusPill status={term.status} />}
                onEdit={() => setEditTarget(term)} onDelete={() => setDeleteTarget(term)} />
            ))}
          </ItemList>
        </ListState>
      </TabPanel>

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
      setError(err?.response?.data?.message || "Failed to save level.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Level" : "Edit Level"}
        icon={Stack}
        tint="violet"
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

      <TabPanel title="Levels" description="Groups of classes, e.g. Primary and Secondary." action={<AddButton label="Add level" onClick={() => setShowAdd(true)} />}>
        <ListState loading={loading} error={error} empty={levels.length === 0} emptyText="No levels yet. Add one before creating classes.">
          <ItemList>
            {levels.map((lvl) => (
              <ItemRow key={lvl._id} icon={Stack} tint="green" title={lvl.lev_name} meta={lvl.lev_no}
                onEdit={() => setEditTarget(lvl)} onDelete={() => setDeleteTarget(lvl)} />
            ))}
          </ItemList>
        </ListState>
      </TabPanel>

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
// Periods are scoped to a term — one term might run 6 periods/day, another 7 — so
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
      setError(err?.response?.data?.message || "Failed to save period.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Period" : "Edit Period"}
        icon={Clock}
        tint="yellow"
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

      <TabPanel title="Periods" description="The lessons in a school day, for the chosen term."
        toolbar={terms.length > 0 ? (
          <div className="w-44">
            <SelectField value={termId} onChange={setTermId}>
              {terms.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </SelectField>
          </div>
        ) : undefined}
        action={<AddButton label="Add period" onClick={() => setShowAdd(true)} disabled={!termId} title={!termId ? "Add a term first" : undefined} />}>
        {!termId ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Add a term first, then its periods.</p>
        ) : (
          <ListState loading={loading} error={error} empty={periods.length === 0} emptyText="No periods for this term yet.">
            <ItemList>
              {periods.slice().sort((a, b) => (Number(a.per_no) || 0) - (Number(b.per_no) || 0)).map((p) => (
                <ItemRow key={p._id} icon={Clock} tint="yellow" title={p.per_name} meta={`${p.time_in} – ${p.time_out}`}
                  onEdit={() => setEditTarget(p)} onDelete={() => setDeleteTarget(p)} />
              ))}
            </ItemList>
          </ListState>
        )}
      </TabPanel>

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
      setError(err?.response?.data?.message || "Failed to save class.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Class" : "Edit Class"}
        icon={Buildings}
        tint="pink"
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

      <TabPanel title="Classes" description="The grades students are placed in."
        action={<AddButton label="Add class" onClick={() => setShowAdd(true)} disabled={levels.length === 0} title={levels.length === 0 ? "Add a level first" : undefined} />}>
        <ListState loading={loading} error={error} empty={classes.length === 0} emptyText={levels.length === 0 ? "Add a level first, then its classes." : "No classes yet."}>
          <ItemList>
            {classes.map((cls) => (
              <ItemRow key={cls._id} icon={GraduationCap} tint="green" title={cls.cl_name}
                meta={`${cls.cl_no} · ${plural(cls.studentCount ?? 0, "student")}`}
                badges={<Badge variant="secondary">{refName(cls.lev_no, "lev_name")}</Badge>}
                onEdit={() => setEditTarget(cls)} onDelete={() => setDeleteTarget(cls)} />
            ))}
          </ItemList>
        </ListState>
      </TabPanel>

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
  onSave: (data: { name: string; class: string; classTeacherId: string | null; capacity: number | null }) => Promise<void>;
}) {
  const initialClassId = typeof initial?.class === "string" ? initial.class : initial?.class?._id ?? "";
  const initialTeacherId = !initial?.classTeacherId
    ? ""
    : typeof initial.classTeacherId === "string" ? initial.classTeacherId : initial.classTeacherId._id;
  const [name, setName] = useState(initial?.name ?? "");
  const [classId, setClassId] = useState(initialClassId);
  const [classTeacherId, setClassTeacherId] = useState(initialTeacherId);
  const [capacity, setCapacity] = useState(initial?.capacity ? String(initial.capacity) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSave({ name, class: classId, classTeacherId: classTeacherId || null, capacity: capacity ? Number(capacity) : null });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save section.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Section" : "Edit Section"}
        icon={SquaresFour}
        tint="blue"
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
        <div>
          <label htmlFor="section-capacity" className="mb-1.5 block text-sm font-medium text-foreground">Capacity <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Input id="section-capacity" type="number" min={1} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="No limit" />
          <p className="mt-1 text-xs text-muted-foreground">Most students it can take. A full section can't take new students.</p>
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

      <TabPanel title="Sections" description="Divisions of a class (A, B…) and their class teacher."
        action={<AddButton label="Add section" onClick={() => setShowAdd(true)} disabled={classes.length === 0} title={classes.length === 0 ? "Add a class first" : undefined} />}>
        <ListState loading={loading} error={error} empty={sections.length === 0} emptyText={classes.length === 0 ? "Add a class first, then its sections." : "No sections yet. Classes without sections work too."}>
          <ItemList>
            {sections.map((sec) => (
              <ItemRow key={sec._id} icon={SquaresFour} tint="pink" title={`${refName(sec.class, "cl_name")} · ${sec.name}`}
                meta={`Class teacher: ${classTeacherName(sec.classTeacherId)}`}
                badges={<SeatsBadge count={sec.studentCount ?? 0} capacity={sec.capacity} />}
                onEdit={() => setEditTarget(sec)} onDelete={() => setDeleteTarget(sec)} />
            ))}
          </ItemList>
        </ListState>
      </TabPanel>

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
      setError(err?.response?.data?.message || "Failed to save subject.");
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <ModalHeader
        title={mode === "add" ? "Add Subject" : "Edit Subject"}
        icon={BookOpen}
        tint="green"
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

  const getClassName = (id?: string) => classes.find((c) => c._id === id)?.cl_name ?? "—";

  return (
    <>

      <TabPanel title="Subjects" description="What is taught, optionally tied to one class." action={<AddButton label="Add subject" onClick={() => setShowAdd(true)} />}>
        <ListState loading={loading} error={error} empty={subjects.length === 0} emptyText="No subjects yet.">
          <ItemList>
            {subjects.map((sub) => (
              <ItemRow key={sub._id} icon={BookOpen} tint="blue" title={sub.sub_name}
                meta={[sub.subjectCode || sub.sub_no, sub.classId ? getClassName(sub.classId) : "All classes"].join(" · ")}
                badges={<StatusPill status={sub.status} />}
                onEdit={() => setEditTarget(sub)} onDelete={() => setDeleteTarget(sub)} />
            ))}
          </ItemList>
        </ListState>
      </TabPanel>

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

// In setup order: each step needs the one before it.
// Periods are per term, so that step shows no count.
const TABS: { value: Tab; count?: keyof OverviewCounts }[] = [
  { value: "Academic Years", count: "years" },
  { value: "Terms", count: "terms" },
  { value: "Levels", count: "levels" },
  { value: "Periods" },
  { value: "Classes", count: "classes" },
  { value: "Sections", count: "sections" },
  { value: "Subjects", count: "subjects" },
];

/** Lives as a tab in Settings (embedded); kept usable on its own too. */
export default function AcademicStructurePage({ embedded = false }: { embedded?: boolean }) {
  const canSettings = usePermission("settings");
  const canStructure = usePermission("academic-structure");
  const canOpenCalendar = canSettings || canStructure;
  const [activeTab, setActiveTab] = useState<Tab>("Academic Years");
  const counts = useOverviewCounts(activeTab);

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Academic Structure"
          subtitle="Years, terms, levels, periods, classes and subjects."
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {TABS.map(({ value, count }, i) => {
            const n = count && counts ? counts[count] : undefined;
            return (
              <TabsTrigger key={value} value={value} className="gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {n ? <Check size={11} weight="bold" className="text-success" /> : i + 1}
                </span>
                {value}
                {n !== undefined && <span className="rounded-full bg-background/70 px-1.5 text-[11px] tabular-nums">{n}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {activeTab === "Academic Years" && <AcademicYearsTab />}
      {activeTab === "Terms"          && <TermsTab />}
      {activeTab === "Levels"         && <LevelsTab />}
      {activeTab === "Periods"        && <PeriodsTab />}
      {activeTab === "Classes"        && <ClassesTab />}
      {activeTab === "Sections"       && <SectionsTab />}
      {activeTab === "Subjects"       && <SubjectsTab />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tile-yellow text-tile-foreground"><Calendar size={18} /></span>
          <div>
            <p className="text-sm font-semibold">Holidays and events</p>
            <p className="text-xs text-muted-foreground">Term dates appear in the calendar automatically. Add holidays and school events there.</p>
          </div>
        </div>
        {canOpenCalendar && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=calendar" className="gap-2"><Calendar size={14} /> Open calendar</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
