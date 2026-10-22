import { useEffect, useMemo, useState } from 'react';
import { Shuffle, Warning } from '@phosphor-icons/react';
import { useToast } from '../Toast';
import { promotionApi } from '../../api/promotionApi';
import type { LadderClass } from '../../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  ladder: LadderClass[];
  onClose: () => void;
  onDone?: () => void;
}

interface RosterStudent {
  studentId: string;
  rollNo: string;
  name: string;
}

export default function SpecialPromotionModal({ ladder, onClose, onDone }: Props) {
  const { showToast } = useToast();

  const [fromClassId, setFromClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [reason, setReason] = useState('');

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromClass = ladder.find((c) => c._id === fromClassId);
  const toClass = ladder.find((c) => c._id === toClassId);

  const destinations = useMemo(
    () => ladder.Funnel((c) => c._id !== fromClassId),
    [ladder, fromClassId],
  );

  useEffect(() => {
    setStudentId('');
    setToClassId('');
    setToSectionId('');
    if (!fromClassId) {
      setRoster([]);
      return;
    }
    let cancelled = false;
    setLoadingRoster(true);
    promotionApi
      .getWorkingDecisions(fromClassId)
      .then((decisions) => {
        if (cancelled) return;
        setRoster(
          decisions.map((d) => ({
            studentId: d.student._id,
            rollNo: d.student.admissionNumber,
            name: `${d.student.firstName} ${d.student.lastName}`.trim(),
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load the class roster.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromClassId]);

  useEffect(() => {
    setToSectionId('');
  }, [toClassId]);

  const needsSection =
    toClass !== undefined && Array.isArray(toClass.sections) && toClass.sections.length > 0;

  const canSubmit =
    Boolean(fromClassId) &&
    Boolean(studentId) &&
    Boolean(toClassId) &&
    (!needsSection || Boolean(toSectionId)) &&
    reason.trim().length >= 10;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await promotionApi.specialPromote({
        student_id: studentId,
        from_class_id: fromClassId,
        to_class_id: toClassId,
        to_section_id: needsSection ? toSectionId : undefined,
        reason: reason.trim(),
      });
      showToast('Special promotion recorded.', 'success');
      onDone?.();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to record the special promotion.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Special Promotion / Change Class</DialogTitle>
          <DialogDescription>
            For exceptional student transfers outside the normal class ladder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <Warning size={15} className="mt-0.5 shrink-0" />
            <span>
              This bypasses standard automated progression. The administrative justification, classes, and author will be permanently logged.
            </span>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Current Class *</Label>
            <NativeSelect
              value={fromClassId}
              onChange={(e) => setFromClassId(e.target.value)}
            >
              <option value="">Select the student's current class</option>
              {ladder.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.cl_name} ({c.student_count} students)
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Student *</Label>
            <NativeSelect
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!fromClassId || loadingRoster}
            >
              <option value="">
                {!fromClassId
                  ? 'Select a class first'
                  : loadingRoster
                  ? 'Loading students…'
                  : roster.length === 0
                  ? 'No students in this class'
                  : 'Select a student'}
              </option>
              {roster.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name} ({s.rollNo})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Destination Class *</Label>
            <NativeSelect
              value={toClassId}
              onChange={(e) => setToClassId(e.target.value)}
              disabled={!fromClassId}
            >
              <option value="">Select the destination class</option>
              {destinations.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.cl_name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {needsSection && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Destination Section *</Label>
              <NativeSelect
                value={toSectionId}
                onChange={(e) => setToSectionId(e.target.value)}
              >
                <option value="">Select a section</option>
                {toClass?.sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reason & Justification *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. Exceptional academic performance — accelerated promotion approved by academic board."
              className="resize-none text-xs"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {reason.trim().length < 10
                ? `${10 - reason.trim().length} more characters needed`
                : `${reason.length}/500`}
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            <Shuffle size={14} className="mr-1.5" />
            {submitting ? 'Recording…' : 'Record Special Promotion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
