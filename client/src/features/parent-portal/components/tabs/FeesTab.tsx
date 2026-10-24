import { SpinnerGap, Receipt, CheckCircle, WarningCircle, DownloadSimple } from '@phosphor-icons/react';
import { TabStatCard, SectionCard, StatusBadge, EmptyState } from '../shared';
import { downloadCSV } from '../../utils/csv';
import { parentPortalApi } from '../../api/parentPortalApi';
import { useChildResource } from '../../hooks/useChildResource';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const formatUSD = (n: number) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_LABEL: Record<string, string> = { Unpaid: 'Unpaid', Partially_Paid: 'Partially Paid', Paid: 'Paid' };

export default function FeesTab() {
  const { data, loading, error } = useChildResource(parentPortalApi.getChildInvoices);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  const totals = data?.totals ?? { invoiced: 0, paid: 0, balance: 0 };
  const invoices = data?.invoices ?? [];

  const exportInvoices = () => {
    downloadCSV('child-fees', invoices.map((i) => ({
      Invoice: i.invoice_no, Amount: i.invoice_amount, Paid: i.paid_amount, Balance: i.balance,
      Status: STATUS_LABEL[i.status] ?? i.status, Due: formatDate(i.dueDate), Issued: formatDate(i.registerDate),
    })));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TabStatCard title="Total Invoiced" value={formatUSD(totals.invoiced)} icon={Receipt} iconColor="text-info" iconBg="bg-info/10" />
        <TabStatCard title="Total Paid" value={formatUSD(totals.paid)} icon={CheckCircle} iconColor="text-primary" iconBg="bg-primary/10" />
        <TabStatCard title="Outstanding Balance" value={formatUSD(totals.balance)} icon={WarningCircle} iconColor="text-destructive" iconBg="bg-destructive/10" />
      </div>

      {invoices.length === 0 ? (
        <SectionCard title="Fees">
          <EmptyState text="No invoices have been issued for this child yet." />
        </SectionCard>
      ) : (
        <SectionCard
          title="Invoices"
          subtitle="Fee invoices and payment status"
          action={
            <Button variant="outline" size="xs" onClick={exportInvoices}>
              <DownloadSimple size={13} /> Export CSV
            </Button>
          }
        >
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[680px]">
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Invoice #</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Amount</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Paid</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Balance</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Status</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i._id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                    <TableCell className="px-5 py-3 font-mono text-xs font-semibold text-primary">{i.invoice_no}</TableCell>
                    <TableCell className="px-5 py-3 font-mono text-xs text-foreground">{formatUSD(i.invoice_amount)}</TableCell>
                    <TableCell className="px-5 py-3 font-mono text-xs font-medium text-success">{formatUSD(i.paid_amount)}</TableCell>
                    <TableCell className={`px-5 py-3 font-mono text-xs font-semibold ${i.balance > 0 ? 'text-destructive' : 'text-success'}`}>{formatUSD(i.balance)}</TableCell>
                    <TableCell className="px-5 py-3"><StatusBadge status={STATUS_LABEL[i.status] ?? i.status} /></TableCell>
                    <TableCell className="px-5 py-3 text-xs text-muted-foreground">{formatDate(i.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
