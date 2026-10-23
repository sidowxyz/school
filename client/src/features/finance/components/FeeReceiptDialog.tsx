import { useEffect, useRef } from 'react';
import { Printer } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { printElement } from '@/lib/printElement';
import { useSchoolIdentity } from '../../settings/hooks/useSchoolIdentity';
import { money, periodLabel, type FeeReceipt } from '../monthlyTypes';

const fullName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`;

/** The paper receipt a family takes home: one per counter payment. */
export function FeeReceiptView({ receipt }: { receipt: FeeReceipt }) {
  const { schoolName, logoSrc } = useSchoolIdentity();
  const received = new Date(receipt.received_at);

  // Group the paid months under each child.
  const byStudent = new Map<string, { name: string; admissionNumber?: string; lines: FeeReceipt['lines'] }>();
  for (const line of receipt.lines) {
    const key = line.student._id;
    if (!byStudent.has(key)) byStudent.set(key, { name: fullName(line.student), admissionNumber: line.student.admissionNumber, lines: [] });
    byStudent.get(key)!.lines.push(line);
  }
  const remaining = new Map((receipt.remainingByStudent ?? []).map((r) => [r.student, r.balance]));

  return (
    <div className="space-y-5 bg-card p-6 text-sm text-foreground print:p-0">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="" className="h-12 w-12 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <p className="text-lg font-bold">{schoolName}</p>
            <p className="text-xs text-muted-foreground">Fee payment receipt</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-semibold">{receipt.receipt_no}</p>
          <p className="text-xs text-muted-foreground">
            {received.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            {received.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <p><span className="text-muted-foreground">Paid by: </span>{receipt.payer_name || '—'}{receipt.payer_phone ? ` (${receipt.payer_phone})` : ''}</p>
        <p><span className="text-muted-foreground">Method: </span>{receipt.payment_method?.payment_method_name ?? '—'}{receipt.reference ? ` · Ref ${receipt.reference}` : ''}</p>
        <p><span className="text-muted-foreground">Received by: </span>{receipt.received_by_name || '—'}</p>
      </div>

      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <TableHead className="py-2 font-semibold">Student</TableHead>
            <TableHead className="py-2 font-semibold">For</TableHead>
            <TableHead className="py-2 text-right font-semibold">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...byStudent.entries()].map(([id, s]) =>
            s.lines.map((line, i) => (
              <TableRow key={line._id} className="border-b border-border/60">
                <TableCell className="py-2 align-top">
                  {i === 0 && (
                    <>
                      <p className="font-medium">{s.name}</p>
                      {s.admissionNumber && <p className="text-xs text-muted-foreground">{s.admissionNumber}</p>}
                    </>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {line.period ? periodLabel(line.period) : line.description}
                  {line.balance_after > 0 && <span className="ml-1 text-xs text-warning">(part payment, {money(line.balance_after)} left)</span>}
                </TableCell>
                <TableCell className="py-2 text-right tabular-nums">{money(line.amount)}</TableCell>
              </TableRow>
            )).concat(
              <TableRow key={`${id}-left`}>
                <TableCell />
                <TableCell colSpan={2} className="pb-3 pt-1 text-right text-xs text-muted-foreground">
                  Still owed by {s.name.split(' ')[0]}: <span className="font-medium text-foreground">{money(remaining.get(id) ?? 0)}</span>
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 border-foreground/40">
            <TableCell colSpan={2} className="py-2 font-semibold">Total paid</TableCell>
            <TableCell className="py-2 text-right text-base font-bold tabular-nums">{money(receipt.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {receipt.note && <p className="text-xs text-muted-foreground">Note: {receipt.note}</p>}

      <div className="flex justify-between pt-6 text-xs text-muted-foreground">
        <p>Thank you.</p>
        <p className="w-48 border-t border-border pt-1 text-center">Signature</p>
      </div>
    </div>
  );
}

export default function FeeReceiptDialog({ receipt, onClose, autoPrint = false }: {
  receipt: FeeReceipt;
  onClose: () => void;
  /** Open the print dialog as soon as the receipt is shown (right after a payment). */
  autoPrint?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const print = () => { if (ref.current) printElement(ref.current, receipt.receipt_no); };

  useEffect(() => {
    if (!autoPrint) return;
    // Give the dialog a moment to render (and the logo to load) first.
    const t = setTimeout(() => { if (ref.current) printElement(ref.current, receipt.receipt_no); }, 400);
    return () => clearTimeout(t);
  }, [autoPrint, receipt.receipt_no]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 print:hidden">
          <DialogTitle>{autoPrint ? 'Payment recorded' : `Receipt ${receipt.receipt_no}`}</DialogTitle>
          <DialogDescription>Print this receipt and give it to the family.</DialogDescription>
        </DialogHeader>
        <div ref={ref}>
          <FeeReceiptView receipt={receipt} />
        </div>
        <DialogFooter className="px-6 pb-6 print:hidden">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={print} className="gap-2"><Printer size={15} /> Print receipt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
