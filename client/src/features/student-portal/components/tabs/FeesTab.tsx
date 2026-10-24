import { useEffect, useState } from 'react';
import { CheckCircle, DownloadSimple, Receipt, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import StatStrip from '@/components/shared/StatStrip';
import { cn } from '@/lib/utils';
import { DashboardError, DashboardLoading, Panel, PanelEmpty, ProgressLine } from '../../../dashboard/components/DashboardKit';
import { downloadCSV } from '../../utils/csv';
import { portalApi, type PortalInvoicesResponse } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';

const formatUSD = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS: Record<string, { label: string; pill: string }> = {
  Paid: { label: 'Paid', pill: 'bg-success/10 text-success' },
  Partially_Paid: { label: 'Part paid', pill: 'bg-warning/10 text-warning' },
  Unpaid: { label: 'Unpaid', pill: 'bg-destructive/10 text-destructive' },
};

export default function FeesTab() {
  const { studentId } = usePortal();
  const [data, setData] = useState<PortalInvoicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    portalApi.getInvoices(studentId)
      .then((res) => { if (!cancelled) { setData(res); setError(''); } })
      .catch(() => { if (!cancelled) setError('Could not load your fees.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  const totals = data?.totals ?? { invoiced: 0, paid: 0, balance: 0 };
  const invoices = (data?.invoices ?? []).slice().sort((a, b) => (b.dueDate ?? b.registerDate ?? '').localeCompare(a.dueDate ?? a.registerDate ?? ''));
  const paidPct = totals.invoiced > 0 ? Math.round((totals.paid / totals.invoiced) * 100) : 0;

  const exportCsv = () => downloadCSV('fees', invoices.map((i) => ({
    Bill: i.invoice_no, Amount: i.invoice_amount, Paid: i.paid_amount, Balance: i.balance,
    Status: STATUS[i.status]?.label ?? i.status, Due: formatDate(i.dueDate),
  })));

  return (
    <div className="space-y-6">
      <StatStrip items={[
        { label: 'Still to pay', value: formatUSD(totals.balance), icon: WarningCircle, tone: totals.balance > 0 ? 'rose' : 'emerald', hint: totals.balance > 0 ? 'Balance due' : 'All paid, thank you' },
        { label: 'Paid', value: formatUSD(totals.paid), icon: CheckCircle, tone: 'emerald', hint: `${paidPct}% of all bills` },
        { label: 'Billed', value: formatUSD(totals.invoiced), icon: Receipt, tone: 'sky', hint: `${invoices.length} bill${invoices.length === 1 ? '' : 's'}` },
      ]} />

      <Panel title="My bills" description="Monthly fees and what has been paid" flush
        action={<Button variant="outline" size="xs" onClick={exportCsv} disabled={!invoices.length}><DownloadSimple size={13} /> CSV</Button>}>
        {invoices.length === 0 ? (
          <PanelEmpty text="No bills yet. They appear here once the school charges your fees." />
        ) : (
          <>
            <div className="px-6 py-4"><ProgressLine label="Paid so far" percent={paidPct} /></div>
            <ul className="divide-y divide-border border-t border-border">
              {invoices.map((i) => (
                <li key={i._id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <div className="min-w-[140px] flex-1">
                    <p className="text-sm font-medium">{i.invoice_no}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(i.dueDate)}</p>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatUSD(i.invoice_amount)}</p>
                    {i.paid_amount > 0 && i.balance > 0 && <p className="text-xs text-muted-foreground">{formatUSD(i.balance)} left</p>}
                  </div>
                  <span className={cn('w-20 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-medium', STATUS[i.status]?.pill ?? 'bg-muted text-muted-foreground')}>
                    {STATUS[i.status]?.label ?? i.status}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
