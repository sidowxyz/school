import { ClipboardText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface SuccessModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

export default function SuccessModal({
  open,
  title,
  description,
  onClose,
}: SuccessModalProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[420px] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <ClipboardText className="h-8 w-8 text-green-600" />
        </div>
        <DialogTitle className="mt-5 text-2xl">{title}</DialogTitle>
        <DialogDescription className="mt-2">{description}</DialogDescription>
        <Button onClick={onClose} className="mt-6 w-full">OK</Button>
      </DialogContent>
    </Dialog>
  );
}