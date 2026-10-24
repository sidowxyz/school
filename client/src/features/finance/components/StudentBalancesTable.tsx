import { useEffect, useState } from 'react';
import { CaretLeft, CaretRight, MagnifyingGlass, HandCoins, SpinnerGap, Users } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { monthlyFeesApi, apiError } from '../api/monthlyFeesApi';
import { money, periodLabel, type ClassFee, type StudentBalancePage } from '../monthlyTypes';

type StatusFilter = '' | 'owing' | 'paid';

/** Every active student and what they owe — pick a row to take their payment. */
export default function StudentBalancesTable({ onPick, refreshKey }: { onPick: (studentId: string) => void; refreshKey?: number }) {
  const [classes, setClasses] = useState<ClassFee[]>([]);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StudentBalancePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { monthlyFeesApi.getClassFees().then(setClasses).catch(() => undefined); }, []);

  // Any filter change starts again from the first page.
  useEffect(() => { setPage(1); }, [classId, status, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    monthlyFeesApi.listStudentBalances({
      class_id: classId || undefined,
      status: status || undefined,
      q: debouncedQ.trim() || undefined,
      page,
      limit: 25,
    })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(apiError(err, 'Could not load students.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [classId, status, debouncedQ, page, refreshKey]);

  const filtered = Boolean(classId || status || debouncedQ.trim());

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Students</CardTitle>
            <CardDescription className="text-xs">
              {data
                ? `${data.total} student${data.total === 1 ? '' : 's'}${data.owingCount ? ` · ${data.owingCount} owing ${money(data.totalOwed)}` : ''}`
                : 'Pick a student to take their payment.'}
            </CardDescription>
          </div>
          {loading && <SpinnerGap size={18} className="animate-spin text-muted-foreground" />}
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_180px_170px]">
          <div className="space-y-1.5">
            <Label htmlFor="sb-q" className="text-xs">Find student</Label>
            <div className="relative">
              <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="sb-q" value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Name, admission no., parent name or phone" className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sb-class" className="text-xs">Class</Label>
            <NativeSelect id="sb-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sb-status" className="text-xs">Fees</Label>
            <NativeSelect id="sb-status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="">All students</option>
              <option value="owing">Still owing</option>
              <option value="paid">Paid up</option>
            </NativeSelect>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}

        {data && data.rows.length === 0 ? (
          <EmptyState
            icon={Users}
            text={filtered
              ? status === 'owing' && !classId && !debouncedQ.trim() ? 'Nobody owes anything right now.' : 'No students match these filters.'
              : 'No active students yet.'}
          />
        ) : data && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Family / parent</TableHead>
                    <TableHead className="text-right">Unpaid</TableHead>
                    <TableHead>Paid through</TableHead>
                    <TableHead className="text-right">Owed</TableHead>
                    <TableHead className="w-28 text-right"><span className="sr-only">Action</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r._id} className="cursor-pointer" onClick={() => onPick(r._id)}>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.admissionNumber}</p>
                      </TableCell>
                      <TableCell>{r.className || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.familyName ? `${r.familyName} family` : r.parentName || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.unpaidCount ? `${r.unpaidCount} ${r.unpaidCount === 1 ? 'bill' : 'bills'}` : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.paidThrough ? periodLabel(r.paidThrough, true) : '—'}</TableCell>
                      <TableCell className={cn('text-right font-semibold tabular-nums', r.totalOwed > 0 ? 'text-destructive' : 'text-success')}>{money(r.totalOwed)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={r.totalOwed > 0 ? 'default' : 'outline'} className="h-8 gap-1.5 text-xs"
                          onClick={(e) => { e.stopPropagation(); onPick(r._id); }}>
                          <HandCoins size={14} /> {r.totalOwed > 0 ? 'Collect' : 'Open'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>Page {data.page} of {data.pages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon-sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} aria-label="Previous page">
                    <CaretLeft size={14} />
                  </Button>
                  <Button variant="outline" size="icon-sm" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)} aria-label="Next page">
                    <CaretRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
