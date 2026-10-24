import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, WarningCircle, Clock, Users, Lightning, SpinnerGap, HandCoins, CurrencyDollar } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import StatStrip from '@/components/shared/StatStrip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { monthlyFeesApi, apiError } from '../api/monthlyFeesApi';
import FeeReceiptDialog from './FeeReceiptDialog';
import { money, periodLabel, thisPeriod, type ClassFee, type ClassStatus, type ClassStatusRow, type FeeReceipt } from '../monthlyTypes';
import type { PaymentMethod } from '../types';
import { useCan } from '@/hooks/usePermission';

type Filter = 'all' | 'owing' | 'paid';

interface Props {
  paymentMethods: PaymentMethod[];
  /** Open the Collect screen for a student (to take arrears, part or advance payments). */
  onCollect: (studentId: string) => void;
}

export default function ClassFeesStatusTab({ paymentMethods, onCollect }: Props) {
  const canCharge = useCan('fees', 'create');
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassFee[]>([]);
  const [loadedClasses, setLoadedClasses] = useState(false);
  const [classId, setClassId] = useState('');
  const [period, setPeriod] = useState(thisPeriod());
  const [status, setStatus] = useState<ClassStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [charging, setCharging] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [receipt, setReceipt] = useState<FeeReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cash = paymentMethods.find((m) => /cash/i.test(m.payment_method_name)) ?? paymentMethods[0];

  useEffect(() => {
    monthlyFeesApi.getClassFees().then((list) => {
      setClasses(list);
      setLoadedClasses(true);
      setClassId((cur) => cur || list.find((c) => c.students > 0)?._id || list[0]?._id || '');
    }).catch((err) => setError(apiError(err, 'Could not load classes.')));
  }, []);

  const load = useCallback(async () => {
    if (!classId || !period) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await monthlyFeesApi.getClassStatus(classId, period));
    } catch (err) {
      setError(apiError(err, 'Could not load this class.'));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [classId, period]);

  useEffect(() => { load(); }, [load]);

  const charge = async () => {
    setCharging(true);
    try {
      const r = await monthlyFeesApi.chargeMonth({ period, class_id: classId });
      showToast(r.created > 0
        ? `Charged ${r.created} student${r.created === 1 ? '' : 's'} for ${periodLabel(period)}.`
        : `Everyone in this class is already charged for ${periodLabel(period)}.`, r.created > 0 ? 'success' : 'info');
      if (r.failed.length) showToast(`${r.failed.length} could not be charged: ${r.failed[0].message}`, 'error');
      await load();
    } catch (err) {
      showToast(apiError(err, 'Could not charge this month.'), 'error');
    } finally {
      setCharging(false);
    }
  };

  const markPaid = async (row: ClassStatusRow) => {
    if (!row.month || !cash) return;
    if (confirming !== row.studentId) { setConfirming(row.studentId); return; }
    setConfirming(null);
    setPaying(row.studentId);
    try {
      const r = await monthlyFeesApi.collect({
        student_ids: [row.studentId],
        invoice_ids: [row.month.invoiceId],
        amount: row.month.balance,
        payment_method: cash._id,
      });
      setReceipt(r);
      await load();
    } catch (err) {
      showToast(apiError(err, 'Could not record the payment.'), 'error');
    } finally {
      setPaying(null);
    }
  };

  const rows = useMemo(() => (status?.rows ?? []).filter((r) =>
    filter === 'all' ? true : filter === 'paid' ? r.totalOwed === 0 : r.totalOwed > 0
  ), [status, filter]);

  const selectedClass = classes.find((c) => c._id === classId);
  const s = status?.summary;

  return (
    <div className="space-y-5">
      <Card className="border-border shadow-xs">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="cs-class" className="text-xs">Class</Label>
            <NativeSelect id="cs-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}{c.level ? ` (${c.level})` : ''} — {c.monthly_fee === null ? 'no fee set' : `${money(c.monthly_fee)}/month`}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-month" className="text-xs">Month</Label>
            <Input id="cs-month" type="month" value={period} max={thisPeriod()} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="w-44" />
          </div>
          {canCharge && <Button variant="outline" onClick={charge} disabled={charging || !classId || selectedClass?.monthly_fee === null} className="gap-2">
            {charging ? <SpinnerGap size={15} className="animate-spin" /> : <Lightning size={15} />}
            Charge {periodLabel(period, true)}
          </Button>}
        </CardContent>
      </Card>

      {loadedClasses && classes.length === 0 && (
        <Card className="border-border shadow-xs">
          <EmptyState icon={Users} text="No classes yet. Add classes in Academic Structure, then set their monthly fee in Setup." />
        </Card>
      )}

      {selectedClass && selectedClass.monthly_fee === null && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
          <WarningCircle size={16} /> {selectedClass.name} has no monthly fee yet. Set it in Setup → Monthly fee per class.
        </div>
      )}
      {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {s && (
        <StatStrip items={[
          { label: 'Paid', value: `${s.paid} / ${s.students}`, icon: CheckCircle, tone: 'emerald', hint: `${money(s.collected)} collected for ${periodLabel(period, true)}` },
          { label: 'Not paid', value: s.unpaid + s.partial, icon: Clock, tone: 'amber', hint: s.partial ? `${s.partial} paid part` : 'Students still owing this month' },
          { label: 'Owed this month', value: money(s.outstanding), icon: CurrencyDollar, tone: 'rose', hint: `of ${money(s.charged)} charged` },
          { label: 'Owed from before', value: money(s.previousOutstanding), icon: HandCoins, tone: 'violet', hint: 'Unpaid earlier months' },
        ]} />
      )}

      {status && s && s.notCharged > 0 && selectedClass?.monthly_fee !== null && (
        <p className="text-xs text-muted-foreground">
          {s.notCharged} student{s.notCharged === 1 ? ' has' : 's have'} not been charged for {periodLabel(period)} yet — press “Charge {periodLabel(period, true)}”.
        </p>
      )}

      {status && (
        <Card className="overflow-hidden border-border shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{status.class.name} · {periodLabel(period)}</p>
            <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
              {(['all', 'owing', 'paid'] as Filter[]).map((f) => (
                <Button key={f} variant="plain" type="button" onClick={() => setFilter(f)}
                  className={cn('rounded-md px-3 py-1 font-medium capitalize', filter === f ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                  {f === 'owing' ? 'Still owing' : f === 'paid' ? 'Fully paid' : 'All'}
                </Button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><SpinnerGap size={22} className="animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Users} text={status.rows.length === 0 ? 'No active students in this class.' : 'No students match this filter.'} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>{periodLabel(period, true)}</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Left this month</TableHead>
                    <TableHead className="text-right">From before</TableHead>
                    <TableHead className="text-right">Total owed</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.admissionNumber}
                          {r.paidAheadThrough && <span className="ml-1 text-success">· paid ahead to {periodLabel(r.paidAheadThrough, true)}</span>}
                        </p>
                      </TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right tabular-nums">{r.month ? money(r.month.paid) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.month ? money(r.month.balance) : '—'}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', r.previousBalance > 0 && 'text-destructive')}>{money(r.previousBalance)}</TableCell>
                      <TableCell className={cn('text-right font-semibold tabular-nums', r.totalOwed > 0 ? 'text-destructive' : 'text-success')}>{money(r.totalOwed)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {r.month && r.month.balance > 0 && cash && (
                            <Button size="sm" variant={confirming === r.studentId ? 'default' : 'outline'} disabled={paying === r.studentId}
                              onClick={() => markPaid(r)} onBlur={() => setConfirming((c) => (c === r.studentId ? null : c))}
                              className="h-8 gap-1.5 text-xs">
                              {paying === r.studentId ? <SpinnerGap size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              {confirming === r.studentId ? `Confirm ${money(r.month.balance)}` : 'Mark paid'}
                            </Button>
                          )}
                          {canCharge && <Button size="sm" variant="ghost" onClick={() => onCollect(r.studentId)} className="h-8 text-xs">Collect…</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {receipt && <FeeReceiptDialog receipt={receipt} autoPrint onClose={() => setReceipt(null)} />}
    </div>
  );
}
