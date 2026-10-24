import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Receipt, PencilSimple, X, CheckCircle, SpinnerGap, Printer, Wallet } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useCan } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { monthlyFeesApi, apiError } from '../api/monthlyFeesApi';
import FeeReceiptDialog from './FeeReceiptDialog';
import StudentBalancesTable from './StudentBalancesTable';
import {
  addMonths, money, periodLabel, type AccountStudent, type FeeAccount, type FeeDiscount, type FeeReceipt
} from '../monthlyTypes';
import type { PaymentMethod } from '../types';

interface Props {
  paymentMethods: PaymentMethod[];
  /** Open straight onto this student (e.g. from the class view). */
  initialStudentId?: string | null;
  onPaid?: () => void;
}

const AHEAD_OPTIONS = [1, 2, 3, 6, 12];

/** Months from `from` to `to`, inclusive. */
const monthsBetween = (from: string, to: string) => {
  const out: string[] = [];
  for (let p = from; p <= to && out.length < 24; p = addMonths(p, 1)) out.push(p);
  return out;
};

/** What paying through `payThrough` would add for one student, on top of what they already owe. */
const aheadCost = (s: AccountStudent, current: string, payThrough: string) => {
  if (!payThrough || !s.monthlyFee) return 0;
  const owedMonths = new Set(s.outstanding.map((l) => l.period));
  return monthsBetween(current, payThrough).reduce((sum, m) => {
    if (owedMonths.has(m)) return sum;                    // already in totalOwed
    if (s.paidThrough && m <= s.paidThrough) return sum;  // already paid
    return sum + s.monthlyFee!.net;
  }, 0);
};

export default function CollectPaymentTab({ paymentMethods, initialStudentId, onPaid }: Props) {
  const canEditDiscount = useCan('fees-setup', 'edit');

  const [studentId, setStudentId] = useState<string | null>(initialStudentId ?? null);
  const [account, setAccount] = useState<FeeAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [recent, setRecent] = useState<FeeReceipt[]>([]);

  const [selected, setSelected] = useState<string[]>([]);
  const [payThrough, setPayThrough] = useState('');
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<FeeReceipt | null>(null);
  const [receiptIsNew, setReceiptIsNew] = useState(false);
  // Bumped after each payment so the student table shows fresh balances.
  const [paidCount, setPaidCount] = useState(0);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);

  useEffect(() => { if (initialStudentId) setStudentId(initialStudentId); }, [initialStudentId]);

  useEffect(() => {
    if (!methodId && paymentMethods.length) {
      setMethodId((paymentMethods.find((m) => /cash/i.test(m.payment_method_name)) ?? paymentMethods[0])._id);
    }
  }, [paymentMethods, methodId]);

  const loadAccount = useCallback(async (id: string, keepSelection = false) => {
    setLoadingAccount(true);
    setError(null);
    try {
      const [acc, receipts] = await Promise.all([
        monthlyFeesApi.getAccount(id),
        monthlyFeesApi.listReceipts({ student: id, limit: 5 }),
      ]);
      setAccount(acc);
      setRecent(receipts);
      if (!keepSelection) {
        // Everyone in the family who owes something; at least the child picked.
        const owing = acc.students.filter((s) => s.totalOwed > 0).map((s) => s._id);
        setSelected(owing.length ? owing : [id]);
        setPayThrough('');
        setPayerName(acc.family?.name ? `${acc.family.name}` : '');
        setPayerPhone(acc.family?.phone ?? '');
      }
    } catch (err) {
      setError(apiError(err, 'Could not load this student’s fees.'));
      setAccount(null);
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  useEffect(() => { if (studentId) loadAccount(studentId); }, [studentId, loadAccount]);

  const selectedStudents = useMemo(
    () => account?.students.filter((s) => selected.includes(s._id)) ?? [],
    [account, selected],
  );
  const owedNow = selectedStudents.reduce((s, x) => s + x.totalOwed, 0);
  const ahead = account ? selectedStudents.reduce((s, x) => s + aheadCost(x, account.currentPeriod, payThrough), 0) : 0;
  const due = Math.round((owedNow + ahead) * 100) / 100;

  // Keep the amount box in step with what's due whenever the choice changes.
  useEffect(() => { setAmount(due > 0 ? String(due) : ''); }, [due]);

  const amountNum = Number(amount);
  const shortBy = due - amountNum;
  const canSave = selected.length > 0 && amountNum > 0 && amountNum <= due + 0.001 && !!methodId && !saving;

  const backToList = () => {
    setStudentId(null);
    setAccount(null);
    setError(null);
  };

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = async () => {
    if (!canSave || !account) return;
    setSaving(true);
    setError(null);
    try {
      const r = await monthlyFeesApi.collect({
        // Keep the family order so siblings are paid month by month together.
        student_ids: account.students.filter((s) => selected.includes(s._id)).map((s) => s._id),
        amount: amountNum,
        pay_through: payThrough || undefined,
        payment_method: methodId,
        payer_name: payerName.trim() || undefined,
        payer_phone: payerPhone.trim() || undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      setReceiptIsNew(true);
      setReceipt(r);
      setReference('');
      setNote('');
      onPaid?.();
      setPaidCount((n) => n + 1);
      await loadAccount(studentId!, true);
    } catch (err) {
      setError(apiError(err, 'The payment could not be recorded.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* The list stays put; a student's account opens on the right. */}
      <StudentBalancesTable onPick={setStudentId} refreshKey={paidCount} />

      <Sheet open={Boolean(studentId)} onOpenChange={(open) => { if (!open) backToList(); }}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader icon={account?.family ? Users : Wallet} tint="green">
            <SheetTitle>
              {account ? (account.family ? `${account.family.name} family` : account.students[0]?.name) : 'Loading…'}
            </SheetTitle>
            <SheetDescription>
              {account
                ? `${account.students.length} ${account.students.length === 1 ? 'child' : 'children'} in school · ${money(account.totalOwed)} owed in total`
                : 'Fetching what they owe…'}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-5">
            {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            {loadingAccount && !account && (
              <div className="flex justify-center py-12"><SpinnerGap size={24} className="animate-spin text-primary" /></div>
            )}

            {account && (
              <>
                {/* Who is paying for whom */}
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Users size={14} /> Paying for
                  </h3>
                  {account.students.map((s) => (
                    <StudentCard
                      key={s._id}
                      student={s}
                      checked={selected.includes(s._id)}
                      onToggle={() => toggle(s._id)}
                      canEditDiscount={canEditDiscount}
                      editing={editingDiscount === s._id}
                      onEdit={() => setEditingDiscount(editingDiscount === s._id ? null : s._id)}
                      onDiscountSaved={() => { setEditingDiscount(null); loadAccount(studentId!, true); }}
                    />
                  ))}
                </section>

                {/* Take the money */}
                <section className="space-y-4 rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Take payment
                    <span className="ml-2 font-normal text-muted-foreground">
                      {selectedStudents.length === 0 ? '— tick the children being paid for' : `for ${selectedStudents.map((s) => s.name.split(' ')[0]).join(', ')}`}
                    </span>
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="pay-through" className="text-xs">Pay for</Label>
                      <NativeSelect id="pay-through" value={payThrough} onChange={(e) => setPayThrough(e.target.value)}>
                        <option value="">What they owe now ({money(owedNow)})</option>
                        {AHEAD_OPTIONS.map((n) => {
                          const through = addMonths(account.currentPeriod, n);
                          return <option key={n} value={through}>Up to {periodLabel(through)} (+{n} {n === 1 ? 'month' : 'months'} ahead)</option>;
                        })}
                      </NativeSelect>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pay-amount" className="text-xs">Amount received</Label>
                      <Input id="pay-amount" type="number" min={0} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 text-lg font-semibold tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pay-method" className="text-xs">Paid by</Label>
                      {paymentMethods.length === 0 ? (
                        <p className="pt-2 text-xs text-destructive">Add a payment method (e.g. Cash) in Setup first.</p>
                      ) : (
                        <NativeSelect id="pay-method" value={methodId} onChange={(e) => setMethodId(e.target.value)} className="h-11">
                          {paymentMethods.map((m) => <option key={m._id} value={m._id}>{m.payment_method_name}</option>)}
                        </NativeSelect>
                      )}
                    </div>
                    {amountNum > 0 && shortBy > 0.001 && (
                      <p className="text-xs text-warning sm:col-span-2">Part payment — {money(shortBy)} will stay owed and show next month.</p>
                    )}
                    {amountNum > due + 0.001 && (
                      <p className="text-xs text-destructive sm:col-span-2">That is more than is due. To pay ahead, choose a later month above.</p>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="payer-name" className="text-xs">Payer name</Label>
                      <Input id="payer-name" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Parent or guardian" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="payer-phone" className="text-xs">Phone</Label>
                      <Input id="payer-phone" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pay-ref" className="text-xs">Reference <span className="text-muted-foreground">(EVC / bank no.)</span></Label>
                      <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pay-note" className="text-xs">Note <span className="text-muted-foreground">(optional)</span></Label>
                      <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                  </div>
                </section>

                {recent.length > 0 && (
                  <section className="space-y-1">
                    <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent receipts</h3>
                    {recent.map((r) => (
                      <Button key={r._id} variant="plain" type="button" onClick={async () => { setReceiptIsNew(false); setReceipt(await monthlyFeesApi.getReceipt(r._id)); }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted">
                        <span className="flex items-center gap-2"><Receipt size={14} className="text-muted-foreground" />{r.receipt_no}</span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          {new Date(r.received_at).toLocaleDateString()} · <span className="font-medium text-foreground">{money(r.total)}</span>
                          <Printer size={13} />
                        </span>
                      </Button>
                    ))}
                  </section>
                )}
              </>
            )}
          </SheetBody>

          {account && (
            <SheetFooter className="items-center sm:justify-between">
              <div className="w-full text-sm sm:w-auto">
                <span className="text-muted-foreground">Total due </span>
                <span className="font-semibold tabular-nums">{money(due)}</span>
                {ahead > 0 && <span className="text-xs text-muted-foreground"> (incl. {money(ahead)} ahead)</span>}
              </div>
              <Button size="lg" onClick={save} disabled={!canSave} className="w-full sm:w-auto">
                {saving ? <SpinnerGap size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {saving ? 'Saving…' : `Record ${amountNum > 0 ? money(amountNum) : 'payment'} & print receipt`}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {receipt && <FeeReceiptDialog receipt={receipt} autoPrint={receiptIsNew} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function StudentCard({ student: s, checked, onToggle, canEditDiscount, editing, onEdit, onDiscountSaved }: {
  student: AccountStudent;
  checked: boolean;
  onToggle: () => void;
  canEditDiscount: boolean;
  editing: boolean;
  onEdit: () => void;
  onDiscountSaved: () => void;
}) {
  const fee = s.monthlyFee;
  const discountNotes = fee ? [
    fee.parts.siblingPct ? `${fee.parts.siblingPct}% sibling` : '',
    fee.parts.scholarshipPct ? `${fee.parts.scholarshipPct}% scholarship` : '',
    fee.parts.ownPct ? `${fee.parts.ownPct}% discount` : '',
    fee.parts.ownAmount ? `${money(fee.parts.ownAmount)} discount` : '',
  ].filter(Boolean) : [];

  return (
    <Card className={cn('border-border shadow-xs transition-colors', checked && 'border-primary/40 ring-1 ring-primary/20')}>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start gap-3">
          <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Pay for ${s.name}`} className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold text-foreground">{s.name}</p>
              <span className="text-xs text-muted-foreground">{s.admissionNumber} · {s.className || 'No class'}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fee ? (
                <>
                  Monthly fee {fee.discount > 0 ? <><s>{money(fee.amount)}</s> <span className="font-medium text-foreground">{money(fee.net)}</span></> : <span className="font-medium text-foreground">{money(fee.amount)}</span>}
                  {discountNotes.length > 0 && ` (${discountNotes.join(' + ')})`}
                </>
              ) : 'No monthly fee set for this class yet'}
              {s.paidThrough && <> · Paid through <span className="font-medium text-foreground">{periodLabel(s.paidThrough)}</span></>}
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-lg font-bold tabular-nums', s.totalOwed > 0 ? 'text-destructive' : 'text-success')}>{money(s.totalOwed)}</p>
            <p className="text-[11px] text-muted-foreground">{s.totalOwed > 0 ? 'owed' : 'nothing owed'}</p>
          </div>
        </div>

        {s.outstanding.length > 0 && (
          <div className="divide-y divide-border rounded-lg border border-border">
            {s.outstanding.map((l) => (
              <div key={l.invoiceId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>{l.period ? periodLabel(l.period) : l.description}</span>
                <span className="flex items-center gap-3">
                  {l.paid > 0 && <span className="text-xs text-muted-foreground">paid {money(l.paid)} of {money(l.amount)}</span>}
                  <span className="font-medium tabular-nums">{money(l.balance)}</span>
                  <StatusBadge status={l.status} />
                </span>
              </div>
            ))}
          </div>
        )}

        {canEditDiscount && (
          <div>
            <Button variant="ghost" size="xs" onClick={onEdit} className="px-2 text-muted-foreground">
              {editing ? <X size={13} /> : <PencilSimple size={13} />}
              {editing ? 'Cancel' : s.feeDiscount ? 'Change discount' : 'Give a discount'}
            </Button>
            {editing && <DiscountForm studentId={s._id} current={s.feeDiscount} onSaved={onDiscountSaved} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiscountForm({ studentId, current, onSaved }: { studentId: string; current: FeeDiscount | null; onSaved: () => void }) {
  const [kind, setKind] = useState<FeeDiscount['kind']>(current?.kind ?? 'percent');
  const [value, setValue] = useState(current ? String(current.value) : '');
  const [reason, setReason] = useState(current?.reason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (clear = false) => {
    setSaving(true);
    setError(null);
    try {
      await monthlyFeesApi.setDiscount(studentId, { kind, value: clear ? 0 : Number(value) || 0, reason: reason.trim() || undefined });
      onSaved();
    } catch (err) {
      setError(apiError(err, 'Could not save the discount.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">Applies from the next monthly charge onwards. Months already charged don’t change.</p>
      <div className="flex flex-wrap items-end gap-2">
        <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as FeeDiscount['kind'])} className="w-32">
          <option value="percent">Percent %</option>
          <option value="amount">Fixed $</option>
        </NativeSelect>
        <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === 'percent' ? '10' : '5'} className="w-24" aria-label="Discount value" />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. staff child)" className="min-w-[160px] flex-1" aria-label="Discount reason" />
        <Button size="sm" onClick={() => save()} disabled={saving || !(Number(value) > 0)}>Save</Button>
        {current && <Button size="sm" variant="outline" onClick={() => save(true)} disabled={saving}>Remove</Button>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
