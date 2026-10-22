import { useState } from 'react';
import { CheckCircle, XCircle, PencilLine, ArrowRight } from '@phosphor-icons/react';
import { useToast } from '../Toast';
import { promotionApi } from '../../api/promotionApi';
import type { LadderClass, WorkingDecision } from '../../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  classId: string;
  className: string;
  destinationLabel: string;
  nextClass: LadderClass['next_class'];
  decisions: WorkingDecision[];
  onClose: () => void;
  onConfirmed: () => void;
}

export default function ConfirmPromotionModal({
  classId,
  className,
  destinationLabel,
  nextClass,
  decisions,
  onClose,
  onConfirmed,
}: Props) {
  const { showToast } = useToast();

  const [sectionId, setSectionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promotedCount = decisions.Funnel((d) => d.decision === 'Promoted').length;
  const retainedCount = decisions.Funnel((d) => d.decision === 'Retained').length;
  const overriddenCount = decisions.Funnel((d) => d.decision !== d.suggestedDecision).length;

  const needsSection =
    nextClass !== null && Array.isArray(nextClass.sections) && nextClass.sections.length > 0;
  const canConfirm = !needsSection || Boolean(sectionId);

  async function confirm() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        promotions: decisions.map((d) => ({
          student_id: d.student._id,
          decision: d.decision,
          target_class_id: d.decision === 'Promoted' ? (nextClass ? nextClass._id : null) : classId,
          target_section_id:
            d.decision === 'Promoted' ? (needsSection ? sectionId : undefined) : undefined,
          notes: d.reason || undefined,
        })),
      };

      await promotionApi.batchPromote(payload);
      showToast(`Promotion recorded for ${decisions.length} students.`, 'success');
      onConfirmed();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to record the promotion. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Promotion</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 font-medium text-foreground">
            {className} <ArrowRight size={12} className="text-muted-foreground" /> {destinationLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            This will promote students to <span className="font-semibold text-foreground">{destinationLabel}</span> and record audit entries in the promotion ledger.
          </p>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border bg-card p-3 text-center">
              <CheckCircle size={16} className="text-primary mx-auto" />
              <p className="text-lg font-bold text-foreground mt-1">{promotedCount}</p>
              <p className="text-[11px] text-muted-foreground">Promoted</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <XCircle size={16} className="text-destructive mx-auto" />
              <p className="text-lg font-bold text-destructive mt-1">{retainedCount}</p>
              <p className="text-[11px] text-muted-foreground">Retained</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <PencilLine size={16} className="text-amber-500 mx-auto" />
              <p className="text-lg font-bold text-amber-500 mt-1">{overriddenCount}</p>
              <p className="text-[11px] text-muted-foreground">Overridden</p>
            </div>
          </div>

          {needsSection && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Target Section in {nextClass!.cl_name} *
              </Label>
              <NativeSelect
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                required
              >
                <option value="">Select a section</option>
                {nextClass!.sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-[11px] text-muted-foreground">
                All promoted students will be initially assigned here.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={!canConfirm || submitting}
          >
            <CheckCircle size={14} className="mr-1.5" />
            {submitting ? 'Recording…' : 'Confirm Promotion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
