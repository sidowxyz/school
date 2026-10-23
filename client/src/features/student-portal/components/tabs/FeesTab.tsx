import { useEffect, useState } from 'react';
import { SpinnerGap, Receipt, CheckCircle, WarningCircle, DownloadSimple } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '../shared';
import { downloadCSV } from '../../utils/csv';
import { portalApi, type PortalInvoicesResponse } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const formatUSD = (n: number) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_LABEL: Record<string, string> = {
  Unpaid: 'Unpaid',
  Partially_Paid: 'Partially Paid',
  Paid: 'Paid',
};

export default function FeesTab() {
  const { studentId } = usePortal();
  const [data, setData] = useState<PortalInvoicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await portalApi.getInvoices(studentId);
        if (!cancelled) { setData(res); setError(''); }
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load fees.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  const totals = data?.totals ?? { invoiced: 0, paid: 0, balance: 0 };
  const invoices = data?.invoices ?? [];

  const exportInvoices = () => {
    downloadCSV('fees', invoices.map((i) => ({
      Invoice: i.invoice_no, Amount: i.invoice_amount, Paid: i.paid_amount,
      Balance: i.balance, Status: STATUS_LABEL[i.status] ?? i.status,
      Due: formatDate(i.dueDate), Issued: formatDate(i.registerDate),
    })));
  };

  return (
    <div className="space-y-6">
      {/* Hairline Divided KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
          <KPICell icon={Receipt} iconClass="text-info" label="Total Invoiced" value={formatUSD(totals.invoiced)} sub="All issued invoices" />
          <KPICell icon={CheckCircle} iconClass="text-success" label="Total Paid" value={formatUSD(totals.paid)} sub="Payments received" />
          <KPICell icon={WarningCircle} iconClass="text-destructive" label="Outstanding Balance" value={formatUSD(totals.balance)} sub="Amount remaining" />
        </div>
      </Card>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Receipt size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No invoices issued</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                No invoices have been issued to you yet. They will appear here once generated.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Invoices</CardTitle>
                <CardDescription className="text-xs mt-0.5">Your fee invoices and payment status</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportInvoices}
                className="inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <DownloadSimple size={13} /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[680px]">
                <TableHeader>
                  <TableRow className="border-b border-border/60">
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Invoice</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Paid</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Balance</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i._id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                      <TableCell className="px-5 py-3 text-sm font-medium text-foreground">{i.invoice_no}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-foreground">{formatUSD(i.invoice_amount)}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-success">{formatUSD(i.paid_amount)}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-foreground">{formatUSD(i.balance)}</TableCell>
                      <TableCell className="px-5 py-3"><StatusBadge status={STATUS_LABEL[i.status] ?? i.status} /></TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">{formatDate(i.dueDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── KPI Strip Cell ─── */
function KPICell({ icon: Icon, iconClass, label, value, sub }: { icon: React.ElementType; iconClass: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon size={15} className={iconClass} />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
