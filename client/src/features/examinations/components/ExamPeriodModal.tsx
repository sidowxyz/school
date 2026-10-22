import { useEffect, useState } from "react";
import { academicApi } from "../../academic-structure/api/academicApi";
import type { Year, Term } from "../../academic-structure/types";
import { examPeriodsApi } from "../api/examPeriodsApi";
import type { ExamPeriod } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  onClose: () => void;
  onSaved?: (period: ExamPeriod) => void;
  period?: ExamPeriod;
};

const refId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String((value as { _id?: string })._id ?? "");
};

const dateInputValue = (value: string | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export default function ExamPeriodModal({ onClose, onSaved, period }: Props) {
  const isEdit = Boolean(period);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [form, setForm] = useState({
    name: period?.name ?? "",
    start_date: dateInputValue(period?.start_date),
    end_date: dateInputValue(period?.end_date),
    academic_year_id: refId(period?.academic_year_id),
    term_id: refId(period?.term_id),
    description: period?.description ?? "",
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([academicApi.getYears(), academicApi.getTerms()])
      .then(([yList, tList]) => {
        if (cancelled) return;
        setYears(yList);
        setTerms(tList);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load academic years and terms.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        academic_year_id: form.academic_year_id || undefined,
        term_id: form.term_id || undefined,
        description: form.description.trim() || undefined,
      };

      const saved = isEdit && period
        ? await examPeriodsApi.update(period._id, payload)
        : await examPeriodsApi.create(payload);

      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to save examination period.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Examination Period" : "New Examination Period"}
          </DialogTitle>
          <DialogDescription>
            The scheduling window that examination timetables are organized within
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="period-name" className="text-xs font-medium">
              Period Name *
            </Label>
            <Input
              id="period-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Term 1 Final Examinations 2026"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="period-start-date" className="text-xs font-medium">
                Start Date *
              </Label>
              <Input
                id="period-start-date"
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-end-date" className="text-xs font-medium">
                End Date *
              </Label>
              <Input
                id="period-end-date"
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                required
                min={form.start_date || undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="period-academic-year" className="text-xs font-medium">
                Academic Year
              </Label>
              <NativeSelect
                id="period-academic-year"
                name="academic_year_id"
                value={form.academic_year_id}
                onChange={handleChange}
              >
                <option value="">Select Academic Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.y_name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-term" className="text-xs font-medium">
                Term
              </Label>
              <NativeSelect
                id="period-term"
                name="term_id"
                value={form.term_id}
                onChange={handleChange}
              >
                <option value="">Select Term</option>
                {terms.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period-desc" className="text-xs font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="period-desc"
              rows={2}
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              placeholder="Notes for staff about this examination period..."
              className="resize-none text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Period"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
