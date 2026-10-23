import { useEffect, useState } from 'react';
import { CurrencyDollar, DownloadSimple, Printer, Trophy, WarningCircle, CheckCircle, SpinnerGap } from '@phosphor-icons/react';
import { financeApi } from '../../finance/api/financeApi';
import type { StudentInvoice, StudentScholarship } from '../../finance/types';
import { downloadCSV } from '../utils/csv';
import { triggerPrint } from '../../../utils/printHelper';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';

export default function FinanceReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [scholarships, setScholarships] = useState<StudentScholarship[]>([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const loadFinanceData = async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, schRes] = await Promise.allSettled([
        financeApi.getInvoices(),
        financeApi.getStudentScholarships(),
      ]);

      if (invRes.status === 'fulfilled') setInvoices(invRes.value || []);
      if (schRes.status === 'fulfilled') setScholarships(schRes.value || []);
    } catch (err: unknown) {
      setError((err instanceof Error && err.message) || 'Failed to load finance report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'All') return true;
    return inv.status === statusFilter;
  });

  const totalInvoiced = invoices.reduce((s, i) => s + (i.invoice_amount || 0), 0);
  const totalOriginal = invoices.reduce((s, i) => s + (i.original_amount || i.invoice_amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalBalance = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const totalDiscounts = invoices.reduce((s, i) => s + (i.discount_amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  // Export full finance summary CSV
  const exportFinanceCSV = () => {
    const rows = invoices.map((inv) => ({
      'Invoice No': inv.invoice_no,
      'Student Name': `${inv.student?.firstName || ''} ${inv.student?.lastName || ''}`.trim() || '—',
      'Admission No': inv.student?.admission_no || inv.student?.admissionNumber || '—',
      'Fee Type': inv.fee_struc_no?.fee_type_no?.fee_name || 'Tuition',
      'Original Amount ($)': inv.original_amount || inv.invoice_amount,
      'Scholarship Discount ($)': inv.discount_amount || 0,
      'Net Amount ($)': inv.invoice_amount,
      'Paid ($)': inv.paid_amount,
      'Balance ($)': inv.balance,
      'Status': inv.status,
      'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—',
      'Issue Date': new Date(inv.registerDate).toLocaleDateString(),
    }));

    downloadCSV(`finance-revenue-report-${new Date().toISOString().split('T')[0]}`, rows);
  };

  const handlePrint = () => {
    triggerPrint('finance-report-print');
  };

  return (
    <div className="space-y-6">
      {/* Header Actions Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-warning/10 text-warning">
              <CurrencyDollar size={20} />
            </span>
            <h2 className="text-xl font-bold text-foreground">Finance &amp; Revenue Report</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Detailed tuition collections, discounts, revenue aging, and financial audit statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="plain"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 border border-border hover:bg-muted/50 text-foreground/80 text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <Printer size={16} />
            Print Report
          </Button>
          <Button variant="plain"
            onClick={exportFinanceCSV}
            disabled={invoices.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <DownloadSimple size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <SpinnerGap size={32} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-sm">{error}</div>
      ) : (
        <div id="finance-report-print" className="space-y-6 printable-area">
          {/* Official Print Header (Only visible in Print) */}
          <div className="hidden print:block text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-foreground">Sobet School Management</h1>
            <p className="text-sm font-semibold text-muted-foreground">Comprehensive Finance &amp; Revenue Statement</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Net Billed</p>
                <p className="text-2xl font-bold text-foreground mt-1">${totalInvoiced.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Gross: ${totalOriginal.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center">
                <CurrencyDollar size={22} />
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Collected</p>
                <p className="text-2xl font-bold text-success mt-1">${totalPaid.toLocaleString()}</p>
                <p className="text-xs text-success font-medium mt-1">Rate: {collectionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <CheckCircle size={22} />
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding Due</p>
                <p className="text-2xl font-bold text-destructive mt-1">${totalBalance.toLocaleString()}</p>
                <p className="text-xs text-destructive font-medium mt-1">Pending collections</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <WarningCircle size={22} />
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scholarships Applied</p>
                <p className="text-2xl font-bold text-violet mt-1">${totalDiscounts.toLocaleString()}</p>
                <p className="text-xs text-violet font-medium mt-1">{scholarships.length} Beneficiaries</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet/10 text-violet flex items-center justify-center">
                <Trophy size={22} />
              </div>
            </div>
          </div>

          {/* Filter Bar (Hidden in Print) */}
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter Status:</span>
              {(['All', 'Paid', 'Partially_Paid', 'Unpaid'] as const).map((st) => (
                <Button variant="plain"
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === st
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {st === 'Partially_Paid' ? 'Partial' : st}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Showing {filteredInvoices.length} of {invoices.length} invoices</p>
          </div>

          {/* Detailed Invoices & Collections Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Tuition &amp; Fee Invoices Statement</h3>
              <span className="text-xs text-muted-foreground">Currency: USD ($)</span>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/75 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                    <TableHead className="py-3 px-4">Invoice No</TableHead>
                    <TableHead className="py-3 px-4">Student</TableHead>
                    <TableHead className="py-3 px-4">Fee Structure</TableHead>
                    <TableHead className="py-3 px-4 text-right">Original</TableHead>
                    <TableHead className="py-3 px-4 text-right">Scholarship</TableHead>
                    <TableHead className="py-3 px-4 text-right">Net Billed</TableHead>
                    <TableHead className="py-3 px-4 text-right">Paid</TableHead>
                    <TableHead className="py-3 px-4 text-right">Balance</TableHead>
                    <TableHead className="py-3 px-4 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-foreground/80">
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                        No invoice records matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <TableRow key={inv._id} className="hover:bg-muted/50">
                        <TableCell className="py-3 px-4 font-mono text-xs font-semibold text-success">
                          {inv.invoice_no}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <p className="font-semibold text-foreground">
                            {inv.student?.firstName} {inv.student?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {inv.student?.admission_no || inv.student?.admissionNumber || '—'}
                          </p>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                          {inv.fee_struc_no?.fee_type_no?.fee_name || 'Tuition Fee'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-mono text-muted-foreground">
                          ${inv.original_amount || inv.invoice_amount}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-mono text-violet font-medium">
                          {(inv.discount_amount || 0) > 0 ? `-$${inv.discount_amount}` : '—'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          ${inv.invoice_amount}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-mono text-success font-semibold">
                          ${inv.paid_amount}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-mono text-destructive font-semibold">
                          ${inv.balance}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              inv.status === 'Paid'
                                ? 'bg-primary/15 text-primary'
                                : inv.status === 'Partially_Paid'
                                ? 'bg-warning/15 text-warning'
                                : 'bg-destructive/15 text-destructive'
                            }`}
                          >
                            {inv.status === 'Partially_Paid' ? 'Partial' : inv.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold text-foreground border-t-2 border-border">
                    <TableCell colSpan={3} className="py-3.5 px-4 text-right uppercase text-xs text-muted-foreground">
                      Totals:
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-mono">${totalOriginal.toLocaleString()}</TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-mono text-violet">
                      -${totalDiscounts.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-mono">${totalInvoiced.toLocaleString()}</TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-mono text-success">
                      ${totalPaid.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-mono text-destructive">
                      ${totalBalance.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          {/* Official Signatures (Only visible in Print) */}
          <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-center text-xs text-muted-foreground">
            <div className="border-t border-input pt-2">
              <p className="font-bold text-foreground">Prepared By</p>
              <p className="text-[11px] text-muted-foreground mt-1">Accountant / Finance Officer</p>
            </div>
            <div className="border-t border-input pt-2">
              <p className="font-bold text-foreground">Reviewed By</p>
              <p className="text-[11px] text-muted-foreground mt-1">Internal Auditor</p>
            </div>
            <div className="border-t border-input pt-2">
              <p className="font-bold text-foreground">Approved By</p>
              <p className="text-[11px] text-muted-foreground mt-1">School Principal / Director</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
