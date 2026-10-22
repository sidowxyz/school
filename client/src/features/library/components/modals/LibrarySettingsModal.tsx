import { useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function LibrarySettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useLibraryStore((s) => s.settings);
  const updateSettings = useLibraryStore((s) => s.updateSettings);
  const { showToast } = useToast();

  const [fineRate, setFineRate] = useState(String(settings.fineRatePerDay));
  const [loanDays, setLoanDays] = useState(String(settings.defaultLoanDays));
  const [touched, setTouched] = useState(false);

  const rateNum = Number(fineRate);
  const daysNum = Number(loanDays);
  const rateInvalid = Number.isNaN(rateNum) || rateNum < 0;
  const daysInvalid = !Number.isInteger(daysNum) || daysNum < 1;

  function submit() {
    setTouched(true);
    if (rateInvalid || daysInvalid) return;
    updateSettings({ fineRatePerDay: Math.round(rateNum * 100) / 100, defaultLoanDays: daysNum });
    showToast('Library settings updated', 'success');
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Library Settings</DialogTitle>
          <DialogDescription>
            Configure late return fine rate and default book loan period
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fine-rate" className="text-xs font-medium">
              Late Fine Rate ($ / day)
            </Label>
            <Input
              id="fine-rate"
              type="number"
              min={0}
              step={0.1}
              value={fineRate}
              onChange={(e) => setFineRate(e.target.value)}
            />
            {touched && rateInvalid && (
              <p className="text-xs text-destructive">Enter a non-negative amount.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loan-days" className="text-xs font-medium">
              Default Loan Period (days)
            </Label>
            <Input
              id="loan-days"
              type="number"
              min={1}
              value={loanDays}
              onChange={(e) => setLoanDays(e.target.value)}
            />
            {touched && daysInvalid && (
              <p className="text-xs text-destructive">Enter at least 1 day.</p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Check size={14} className="mr-1.5" /> FloppyDisk Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
