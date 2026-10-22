import { useEffect, useState, useMemo } from 'react';
import { DownloadSimple, MagnifyingGlass, CurrencyDollar, BookOpen, ArrowUpRight, ArrowDownLeft, ArrowCounterClockwise, SpinnerGap, Table as TableIcon, Printer, CheckCircle } from '@phosphor-icons/react';
import { financeApi } from '../api/financeApi';
import type { LedgerEntry } from '../types';
import { triggerPrint } from '../../../utils/printHelper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatStrip from '@/components/shared/StatStrip';

function getAccountBadgeStyle(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('cash') || n.includes('bank')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
  }
  if (n.includes('revenue') || n.includes('fee')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800';
  }
  if (n.includes('expense') || n.includes('depreciation') || n.includes('supplies') || n.includes('fuel')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
  }
  if (n.includes('scholarship') || n.includes('discount')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800';
  }
  if (n.includes('asset') || n.includes('capital') || n.includes('receivable')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
  }
  return 'bg-muted text-muted-foreground border-border';
}

export default function GeneralLedger({ filterAccount }: { filterAccount?: string }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Funnel States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch Ledger data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params: { startDate?: string; endDate?: string; accountName?: string } = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedAccount) params.accountName = selectedAccount;

      const [entriesRes, accountsRes] = await Promise.allSettled([
        financeApi.getLedgerEntries(params),
        financeApi.getLedgerAccounts(),
      ]);

      if (entriesRes.status === 'fulfilled') {
        setEntries(entriesRes.value.data || []);
      }
      if (accountsRes.status === 'fulfilled') {
        setAccounts(accountsRes.value || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load general ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedAccount]);

  // If parent passes a filterAccount prop (drill-down), apply it
  useEffect(() => {
    if (filterAccount) setSelectedAccount(filterAccount);
  }, [filterAccount]);

  // Client-side MagnifyingGlass filtering
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.Funnel(
      (e) =>
        e.referenceNo?.toLowerCase().includes(q) ||
        e.accountName?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  // Totals calculations
  const totalDebit = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0),
    [filteredEntries]
  );
  const totalCredit = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0),
    [filteredEntries]
  );

  // CSV Export
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;
    const headers = ['Date', 'Reference No', 'Account Name', 'Description', 'Debit ($)', 'Credit ($)'];
    const rows = filteredEntries.map((e) => [
      new Date(e.date).toLocaleDateString(),
      `"${e.referenceNo}"`,
      `"${e.accountName}"`,
      `"${e.description || ''}"`,
      e.debit || 0,
      e.credit || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `general-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    triggerPrint('general-ledger-print');
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedAccount('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen size={20} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">General Ledger</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete double-entry accounting records, journal entries, and financial balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 h-9 text-xs"
          >
            <ArrowCounterClockwise size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2 h-9 text-xs"
          >
            <Printer size={14} />
            Print Ledger
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-2 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <DownloadSimple size={14} />
            Export CSV
          </Button>
        </div>
      </Card>

      <div id="general-ledger-print" className="space-y-6 printable-area">
        {/* Official Print Header */}
        <div className="hidden print:block text-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sobet Buildings Management</h1>
          <p className="text-sm font-semibold text-gray-600">General Ledger Accounting Journal &amp; Balances</p>
          <p className="text-xs text-gray-400 mt-1">
            Generated on: {new Date().toLocaleDateString()} {startDate || endDate ? `(Period: ${startDate || 'All'} to ${endDate || 'Present'})` : ''}
          </p>
        </div>

        {/* Summary KPI Cards */}
        <StatStrip
          items={[
            {
              label: 'Total Debit (Dr)',
              value: `$${totalDebit.toLocaleString()}`,
              tone: 'emerald',
              icon: ArrowDownLeft,
              hint: 'Cash inflows & expenses',
            },
            {
              label: 'Total Credit (Cr)',
              value: `$${totalCredit.toLocaleString()}`,
              tone: 'sky',
              icon: ArrowUpRight,
              hint: 'Revenue & receivables',
            },
            {
              label: 'Ledger Balance',
              value: `$${Math.abs(totalDebit - totalCredit).toLocaleString()}`,
              tone: totalDebit === totalCredit ? 'emerald' : 'amber',
              icon: CurrencyDollar,
              hint:
                totalDebit === totalCredit
                  ? 'Balanced (Dr = Cr)'
                  : `Variance: $${Math.abs(totalDebit - totalCredit).toLocaleString()}`,
            },
            {
              label: 'Journal Entries',
              value: filteredEntries.length,
              tone: 'violet',
              icon: Table,
              hint: 'Recorded transactions',
            },
          ]}
        />

      {/* Funnel Bar */}
      <Card className="p-4 no-print border-border shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* MagnifyingGlass Box */}
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ref no, account, note..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Account Funnel */}
          <div className="relative">
            <NativeSelect
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="text-xs"
            >
              <option value="">All Accounts</option>
              <option value="Cash in Hand">Cash in Hand</option>
              <option value="Bank Account">Bank Account</option>
              <option value="Tuition Revenue">Tuition Revenue</option>
              <option value="Scholarship Expense">Scholarship Expense</option>
              <option value="Accounts Receivable">Accounts Receivable</option>
              {accounts
                .Funnel(
                  (a) =>
                    ![
                      'Cash in Hand',
                      'Bank Account',
                      'Tuition Revenue',
                      'Scholarship Expense',
                      'Accounts Receivable',
                    ].includes(a)
                )
                .map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
            </NativeSelect>
          </div>

          {/* Start Date */}
          <div className="relative">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="text-xs"
            />
          </div>

          {/* End Date & Reset */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="text-xs"
            />
            {(startDate || endDate || selectedAccount || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                title="Reset filters"
                className="h-9 w-9 p-0 shrink-0"
              >
                <ArrowCounterClockwise size={14} />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Ledger Table */}
      <Card className="overflow-hidden border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-foreground">Journal Entries &amp; Transactions</h3>
            <Badge variant="outline" className="text-xs font-normal">
              {filteredEntries.length} entries
            </Badge>
          </div>
          {totalDebit === totalCredit && filteredEntries.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle size={13} />
              <span>Balanced (Dr = Cr)</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
            <SpinnerGap size={32} className="animate-spin text-emerald-600 mb-2" />
            <p className="text-sm">Loading ledger entries...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <BookOpen size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-base font-semibold text-foreground">No Ledger Entries Found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Transactions, fee payments, and scholarship discounts will automatically generate double-entry records here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left">
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ref No</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Name</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Debit ($)</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Credit ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {filteredEntries.map((entry) => {
                  return (
                    <TableRow key={entry._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/80">
                          {entry.referenceNo}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAccountBadgeStyle(entry.accountName)}`}
                        >
                          {entry.accountName}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-foreground/80 max-w-md truncate" title={entry.description || ''}>
                        {entry.description || '—'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {entry.debit > 0 ? `$${entry.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground/40 font-normal">—</span>}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-sky-600 dark:text-sky-400">
                        {entry.credit > 0 ? `$${entry.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground/40 font-normal">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/50 font-semibold border-t-2 border-border text-foreground">
                  <TableCell colSpan={4} className="py-3.5 px-4 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Total:
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-right font-mono text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    ${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-right font-mono text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">
                    ${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </Card>

      {/* Official Signatures (Only visible in Print) */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-center text-xs text-gray-600">
        <div className="border-t border-gray-400 pt-2">
          <p className="font-bold text-gray-800">Prepared By</p>
          <p className="text-[11px] text-gray-400 mt-1">Senior Accountant</p>
        </div>
        <div className="border-t border-gray-400 pt-2">
          <p className="font-bold text-gray-800">Verified By</p>
          <p className="text-[11px] text-gray-400 mt-1">Internal Finance Auditor</p>
        </div>
        <div className="border-t border-gray-400 pt-2">
          <p className="font-bold text-gray-800">Approved By</p>
          <p className="text-[11px] text-gray-400 mt-1">School Principal / Director</p>
        </div>
      </div>
    </div>
  </div>
  );
}
