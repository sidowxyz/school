import { useEffect, useState } from 'react';
import { MagnifyingGlass, Printer, Receipt, SpinnerGap } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { monthlyFeesApi, apiError } from '../api/monthlyFeesApi';
import FeeReceiptDialog from './FeeReceiptDialog';
import { money, type FeeReceipt } from '../monthlyTypes';

const LIMIT = 200;

/** Every counter payment in the report's months — find one and print it again. */
export default function ReceiptsCard({ from, to }: { from: string; to: string }) {
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [rows, setRows] = useState<FeeReceipt[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<FeeReceipt | null>(null);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    monthlyFeesApi.listReceipts({ from, to, q: debouncedQ.trim() || undefined, limit: LIMIT })
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((err) => { if (!cancelled) setError(apiError(err, 'Could not load receipts.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, debouncedQ]);

  const open = async (id: string) => {
    setOpening(id);
    try {
      setReceipt(await monthlyFeesApi.getReceipt(id));
    } catch (err) {
      showToast(apiError(err, 'Could not open this receipt.'), 'error');
    } finally {
      setOpening(null);
    }
  };

  const total = (rows ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <Card className="overflow-hidden border-border shadow-xs print:hidden">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-sm">Receipts</CardTitle>
          <CardDescription className="text-xs">
            {rows
              ? `${rows.length}${rows.length === LIMIT ? '+' : ''} payment${rows.length === 1 ? '' : 's'} · ${money(total)} received`
              : 'Every payment taken at the counter.'}
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt no., payer name or phone" className="h-9 pl-8 text-sm" aria-label="Search receipts" />
          {loading && <SpinnerGap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>

      {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}

      {rows && rows.length === 0 ? (
        <EmptyState icon={Receipt} text={debouncedQ.trim() ? 'No receipt matches this search.' : 'No payments were taken in this period.'} />
      ) : rows && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12"><span className="sr-only">Print</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const at = new Date(r.received_at);
                return (
                  <TableRow key={r._id} className="cursor-pointer" onClick={() => open(r._id)}>
                    <TableCell className="font-mono text-xs font-medium">{r.receipt_no}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {at.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="block text-muted-foreground">{at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.payer_name || '—'}
                      {r.payer_phone && <span className="block text-xs text-muted-foreground">{r.payer_phone}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{r.students.map((s) => s.firstName).join(', ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.payment_method?.payment_method_name ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{money(r.total)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Print ${r.receipt_no}`}
                        onClick={(e) => { e.stopPropagation(); open(r._id); }} disabled={opening === r._id}>
                        {opening === r._id ? <SpinnerGap size={15} className="animate-spin" /> : <Printer size={15} />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {receipt && <FeeReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />}
    </Card>
  );
}
