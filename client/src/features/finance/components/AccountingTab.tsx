// AccountingTab.tsx
// Full Enterprise Accounting & Financial Reports Module
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ListDashes, Calendar, Printer, Plus, X, TrendDown, Buildings, Table as TableIcon, DownloadSimple, ArrowsClockwise, CheckCircle, WarningCircle, Users, ArrowUpRight, ArrowDownLeft, Bank, CreditCard, Scales, TrendUp } from '@phosphor-icons/react';
import {
  ChartPie, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { exportSvgToPng as exportSvgToPngUtil, downloadSvg as downloadSvgUtil, printChart as printChartUtil } from '../utils/chartUtils';
import { financeApi } from '../api/financeApi';
import type {
  ChartOfAccount, FiscalYear, AccountingPeriod, JournalEntry, TrialBalanceRow,
  Supplier, Expense, FixedAsset, IncomeStatementData, BalanceSheetData, CashFlowData, ArAgingData
} from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatStrip from '@/components/shared/StatStrip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const fmtNum = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—';

const TYPE_COLORS: Record<string, string> = {
  Asset: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
  Liability: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  Equity: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  Revenue: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  Expense: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
};
const TYPE_COLOR_HEX: Record<string, string> = {
  Asset: '#0284c7', // sky-600
  Liability: '#e11d48', // rose-600
  Equity: '#9333ea', // purple-600
  Revenue: '#10b981', // emerald-500
  Expense: '#f59e0b', // amber-500
};

const ACCOUNTING_TABS = [
  { key: 'coa',       label: 'Chart of Accounts',  icon: <ListDashes size={14} /> },
  { key: 'fiscal',    label: 'Fiscal Years',        icon: <Calendar size={14} /> },
  { key: 'journal',   label: 'Journal Entries',     icon: <BookOpen size={14} /> },
  { key: 'expenses',  label: 'Expenses & AP',       icon: <TrendDown size={14} /> },
  { key: 'assets',    label: 'Fixed Assets',        icon: <Buildings size={14} /> },
  { key: 'reports',   label: 'Financial Statements',icon: <TableIcon size={14} /> },
];

// Helper to DownloadSimple CSV
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Chart of Accounts Panel
// ─────────────────────────────────────────────────────────────────────────────
function ChartOfAccountsPanel() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    accountCode: '', accountName: '',
    type: 'Asset' as ChartOfAccount['type'],
    normalBalance: 'Debit' as ChartOfAccount['normalBalance'],
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coa, ls] = await Promise.all([financeApi.getChartOfAccounts(), financeApi.getLedgerSummary()]);
      setAccounts(coa || []);
      setLedgerSummary(ls.data || []);
    } catch (err) { console.error(err); setMsg('Failed to load chart of accounts.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await financeApi.seedChartOfAccounts();
      setMsg((res as any).data?.message || 'Seeded successfully.');
      load();
    } catch { setMsg('Seed failed.'); }
    finally { setSeeding(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createChartOfAccount(form);
      setShowForm(false);
      setForm({ accountCode: '', accountName: '', type: 'Asset', normalBalance: 'Debit', description: '' });
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to create account.'); }
  }

  async function handleDelete(id: string, isSystem: boolean) {
    if (isSystem) { setMsg('System accounts cannot be deleted.'); return; }
    if (!confirm('Deactivate this account?')) return;
    try { await financeApi.deleteChartOfAccount(id); load(); }
    catch { setMsg('Failed to delete.'); }
  }

  const byType = (type: string) => accounts.Funnel(a => a.type === type);

  // Prepare chart data
  const CHART_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  const countsData = CHART_TYPES.map((t) => ({ name: t, value: byType(t).length }));

  const totalsByType = CHART_TYPES.map((t) => {
    const acctCodes = byType(t).map(a => a.accountCode);
    const total = ledgerSummary.reduce((sum: number, row: any) => {
      if (acctCodes.includes(row.accountCode)) {
        const net = (row.netBalance ?? ((Number(row.totalDebit) || 0) - (Number(row.totalCredit) || 0))) as number;
        return sum + net;
      }
      return sum;
    }, 0);
    return { name: t, total };
  });

  // wrappers for local buttons
  const exportSvgToPng = (selector: string, filename?: string) => exportSvgToPngUtil(selector, filename);
  const downloadSvg = (selector: string, filename?: string) => downloadSvgUtil(selector, filename);
  const printChart = (selector: string) => printChartUtil(selector);

  return (
    <div className="space-y-6">
      {msg && (
        <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl px-4 py-3 text-xs text-sky-700 dark:text-sky-300">
          <span>{msg}</span>
          <Button variant="ghost" size="sm" onClick={() => setMsg('')} className="h-6 w-6 p-0 hover:bg-sky-100 dark:hover:bg-sky-900/40"><X size={14} /></Button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <StatStrip
        items={[
          {
            label: 'Asset Accounts',
            value: byType('Asset').length,
            tone: 'sky',
            icon: Bank,
            hint: 'Cash, bank, receivables & fixed assets',
          },
          {
            label: 'Liability Accounts',
            value: byType('Liability').length,
            tone: 'rose',
            icon: CreditCard,
            hint: 'Payables, accrued salaries & dues',
          },
          {
            label: 'Equity Accounts',
            value: byType('Equity').length,
            tone: 'violet',
            icon: Scales,
            hint: 'Capital & retained Buildings surplus',
          },
          {
            label: 'Revenue Accounts',
            value: byType('Revenue').length,
            tone: 'emerald',
            icon: TrendUp,
            hint: 'Tuitions, admission, lab & fees',
          },
          {
            label: 'Expense Accounts',
            value: byType('Expense').length,
            tone: 'amber',
            icon: TrendDown,
            hint: 'Salaries, fuel, supplies & repairs',
          },
        ]}
      />

      {/* Controls & Category Funnel Bar */}
      <Card className="p-4 border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={selectedType === null ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType(null)}
              className="text-xs h-8 px-3 rounded-lg"
            >
              All ({accounts.length})
            </Button>
            {CHART_TYPES.map((t) => {
              const count = byType(t).length;
              const isSelected = selectedType === t;
              return (
                <Button
                  key={t}
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedType(isSelected ? null : t)}
                  className={`text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 ${
                    isSelected ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: TYPE_COLOR_HEX[t] }}
                  />
                  {t} ({count})
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {accounts.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
                className="text-xs h-8 flex items-center gap-1.5 text-sky-600 border-sky-300 hover:bg-sky-50"
              >
                <ArrowsClockwise size={13} className={seeding ? 'animate-spin' : ''} />
                Seed Standard Accounts
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="text-xs h-8 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Plus size={14} /> Add Account
            </Button>
          </div>
        </div>
      </Card>

      {/* Charts: Account type distribution & totals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Account Balances by Type</CardTitle>
              <CardDescription className="text-xs">Net financial balance aggregated per account classification</CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => exportSvgToPng('#coa-balances-chart svg', 'coa-balances.png')}
                className="h-7 text-xs px-2.5">Export PNG</Button>
              <Button variant="outline" size="sm" onClick={() => downloadSvg('#coa-balances-chart svg', 'coa-balances.svg')}
                className="h-7 text-xs px-2.5">Download SVG</Button>
              <Button variant="outline" size="sm" onClick={() => printChart('#coa-balances-chart')}
                className="h-7 text-xs px-2.5">Print</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div id="coa-balances-chart" style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalsByType} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: any) => [`$${fmtNum(value)}`, 'Net Balance']}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {totalsByType.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={TYPE_COLOR_HEX[entry.name] ?? '#CBD5E1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Accounts by Type</CardTitle>
              <CardDescription className="text-xs">Count distribution across core ledger types</CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => exportSvgToPng('#coa-counts-chart svg', 'coa-counts.png')}
                className="h-7 text-xs px-2">PNG</Button>
              <Button variant="outline" size="sm" onClick={() => downloadSvg('#coa-counts-chart svg', 'coa-counts.svg')}
                className="h-7 text-xs px-2">SVG</Button>
              <Button variant="outline" size="sm" onClick={() => printChart('#coa-counts-chart')}
                className="h-7 text-xs px-2">Print</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div id="coa-counts-chart" style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ChartPie>
                  <Pie
                    data={countsData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    onClick={(data) => {
                      if (data && (data as any).name) setSelectedType((data as any).name);
                    }}
                  >
                    {countsData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={TYPE_COLOR_HEX[entry.name] ?? '#E5E7EB'} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </ChartPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="p-5 border-border shadow-sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="font-semibold text-sm text-foreground">New General Ledger Account</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-7 w-7 p-0">
                <X size={14} />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Account Code</Label>
                <Input required placeholder="Account Code (e.g. 1020)" value={form.accountCode}
                  onChange={e => setForm(f => ({ ...f, accountCode: e.target.value }))}
                  className="text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Account Name</Label>
                <Input required placeholder="Account Name (e.g. Premier Bank Account)" value={form.accountName}
                  onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                  className="text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Classification Type</Label>
                <NativeSelect value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  className="text-xs">
                  {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => <option key={t}>{t}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Normal Balance</Label>
                <NativeSelect value={form.normalBalance} onChange={e => setForm(f => ({ ...f, normalBalance: e.target.value as any }))}
                  className="text-xs">
                  <option>Debit</option>
                  <option>Credit</option>
                </NativeSelect>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs mb-1 block">Description (Optional)</Label>
                <Input placeholder="Purpose or remarks for this ledger account..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="text-xs" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
              <Button size="sm" type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Save Account</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Card className="py-20 text-center text-muted-foreground">
          <ArrowsClockwise size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm">Loading accounts...</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => {
            const rows = byType(type).Funnel(() => !selectedType || selectedType === type);
            if (!rows.length) return null;
            return (
              <Card key={type} className="overflow-hidden border-border shadow-sm">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${TYPE_COLORS[type]}`}>{type}</span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {rows.length} accounts
                    </Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="w-full text-left">
                    <TableHeader>
                      <TableRow className="bg-muted/30 border-b border-border">
                        <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Code</TableHead>
                        <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Name</TableHead>
                        <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Normal Balance</TableHead>
                        <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</TableHead>
                        <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {rows.map(acct => (
                        <TableRow key={acct._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/80">
                              {acct.accountCode}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                            <span>{acct.accountName}</span>
                            {acct.isSystemAccount && (
                              <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 bg-muted/60 text-muted-foreground border-border">
                                System
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                acct.normalBalance === 'Debit'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400'
                              }`}
                            >
                              {acct.normalBalance}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate" title={acct.description || ''}>
                            {acct.description || '—'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                            {acct.isSystemAccount ? (
                              <span className="text-xs text-muted-foreground/60 font-medium">Protected</span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(acct._id, acct.isSystemAccount)}
                                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                Deactivate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Fiscal Years & Periods Panel
// ─────────────────────────────────────────────────────────────────────────────
function FiscalYearsPanel() {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [msg, setMsg] = useState('');

  const [yearForm, setYearForm] = useState({ yearName: '', startDate: '', endDate: '' });
  const [periodForm, setPeriodForm] = useState({ periodName: '', fiscalYearId: '', startDate: '', endDate: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ys, ps] = await Promise.all([financeApi.getFiscalYears(), financeApi.getAccountingPeriods()]);
      setYears(ys);
      setPeriods(ps);
      if (!selectedYear && ys.length > 0) setSelectedYear(ys[0]._id);
    } catch { setMsg('Failed to load fiscal data.'); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentYearPeriods = periods.Funnel(p => {
    const fyId = typeof p.fiscalYearId === 'string' ? p.fiscalYearId : (p.fiscalYearId as FiscalYear)?._id;
    return fyId === selectedYear;
  });

  async function createYear(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createFiscalYear(yearForm);
      setYearForm({ yearName: '', startDate: '', endDate: '' });
      setShowYearForm(false);
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to create fiscal year.'); }
  }

  async function createPeriod(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createAccountingPeriod({ ...periodForm, fiscalYearId: selectedYear });
      setPeriodForm({ periodName: '', fiscalYearId: '', startDate: '', endDate: '' });
      setShowPeriodForm(false);
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to create period.'); }
  }

  async function closeYear(id: string) {
    if (!confirm('Close this fiscal year? This will also close all open periods within it.')) return;
    try { await financeApi.closeFiscalYear(id); load(); }
    catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to close year.'); }
  }

  async function closePeriod(id: string) {
    if (!confirm('Close this accounting period?')) return;
    try { await financeApi.closeAccountingPeriod(id); load(); }
    catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to close period.'); }
  }

  const inp = 'border border-gray-200 rounded-lg px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      {msg && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
          {msg}<Button variant="plain" onClick={() => setMsg('')}><X size={14} /></Button>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Fiscal Years</h3>
            <p className="text-xs text-gray-400">Select a fiscal year to view its accounting periods</p>
          </div>
          <Button variant="plain" onClick={() => setShowYearForm(s => !s)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg">
            <Plus size={12} /> New Fiscal Year
          </Button>
        </div>

        {showYearForm && (
          <form onSubmit={createYear} className="p-5 bg-gray-50 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input required placeholder="e.g. FY 2026/2027" value={yearForm.yearName}
              onChange={e => setYearForm(f => ({ ...f, yearName: e.target.value }))} className={inp} />
            <Input required type="date" value={yearForm.startDate}
              onChange={e => setYearForm(f => ({ ...f, startDate: e.target.value }))} className={inp} />
            <div className="flex gap-2">
              <Input required type="date" value={yearForm.endDate}
                onChange={e => setYearForm(f => ({ ...f, endDate: e.target.value }))} className={`${inp} flex-1`} />
              <Button variant="plain" type="submit" className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg">Save</Button>
            </div>
          </form>
        )}

        {loading ? <p className="text-center py-8 text-sm text-gray-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400">
                  <TableHead className="px-5 py-3">Year Name</TableHead>
                  <TableHead className="px-5 py-3">Start Date</TableHead>
                  <TableHead className="px-5 py-3">End Date</TableHead>
                  <TableHead className="px-5 py-3">Status</TableHead>
                  <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400 text-sm">No fiscal years configured yet.</TableCell></TableRow>
                ) : years.map(y => (
                  <TableRow key={y._id} onClick={() => setSelectedYear(y._id)}
                    className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${selectedYear === y._id ? 'bg-green-50/70 font-medium' : 'hover:bg-gray-50'}`}>
                    <TableCell className="px-5 py-3 font-semibold text-gray-800">{y.yearName}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-500">{fmtDate(y.startDate)}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-500">{fmtDate(y.endDate)}</TableCell>
                    <TableCell className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${y.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {y.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      {y.status === 'Open' && (
                        <Button variant="plain" onClick={e => { e.stopPropagation(); closeYear(y._id); }}
                          className="text-xs text-red-500 hover:underline font-medium">Close Year</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedYear && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">
              Accounting Periods for {years.find(y => y._id === selectedYear)?.yearName || 'Selected Year'}
            </h3>
            <Button variant="plain" onClick={() => setShowPeriodForm(s => !s)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
              <Plus size={12} /> Add Period
            </Button>
          </div>

          {showPeriodForm && (
            <form onSubmit={createPeriod} className="p-5 bg-gray-50 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input required placeholder="e.g. Month 1 / Jan 2026" value={periodForm.periodName}
                onChange={e => setPeriodForm(f => ({ ...f, periodName: e.target.value }))} className={inp} />
              <Input required type="date" value={periodForm.startDate}
                onChange={e => setPeriodForm(f => ({ ...f, startDate: e.target.value }))} className={inp} />
              <div className="flex gap-2">
                <Input required type="date" value={periodForm.endDate}
                  onChange={e => setPeriodForm(f => ({ ...f, endDate: e.target.value }))} className={`${inp} flex-1`} />
                <Button variant="plain" type="submit" className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">Save</Button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400">
                  <TableHead className="px-5 py-3">Period</TableHead>
                  <TableHead className="px-5 py-3">Start Date</TableHead>
                  <TableHead className="px-5 py-3">End Date</TableHead>
                  <TableHead className="px-5 py-3">Status</TableHead>
                  <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentYearPeriods.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400 text-sm">No periods created for this fiscal year yet.</TableCell></TableRow>
                ) : currentYearPeriods.map(p => (
                  <TableRow key={p._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <TableCell className="px-5 py-3 font-semibold text-gray-800">{p.periodName}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-500">{fmtDate(p.startDate)}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-500">{fmtDate(p.endDate)}</TableCell>
                    <TableCell className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${p.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      {p.status === 'Open' && (
                        <Button variant="plain" onClick={() => closePeriod(p._id)} className="text-xs text-red-500 hover:underline font-medium">Close</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Journal Entries Panel
// ─────────────────────────────────────────────────────────────────────────────
function JournalEntriesPanel() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 25;
  const [loading, setLoading] = useState(false);
  const [refType, setRefType] = useState('');
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [lineDetails, setLineDetails] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getJournalEntries({ page, limit: LIMIT, referenceType: refType || undefined });
      setEntries(res.data);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, refType]);

  useEffect(() => { load(); }, [load]);

  async function viewEntry(entry: JournalEntry) {
    setSelected(entry);
    setLoadingLines(true);
    try {
      const full = await financeApi.getJournalEntry(entry._id);
      setLineDetails(full.lines || []);
    } catch { setLineDetails([]); }
    finally { setLoadingLines(false); }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const REF_TYPES = ['', 'Invoice', 'Payment', 'Expense', 'Depreciation', 'Asset Purchase', 'Manual'];

  return (
    <div className="space-y-4">
      <Card className="p-4 border-border shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <NativeSelect
              value={refType}
              onChange={e => { setRefType(e.target.value); setPage(1); }}
              className="text-xs h-8 pr-7"
            >
              <option value="">All Reference Types</option>
              {REF_TYPES.Funnel(Boolean).map(t => <option key={t}>{t}</option>)}
            </NativeSelect>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {total} balanced entries recorded
          </Badge>
        </div>
      </Card>

      {loading ? (
        <Card className="py-16 text-center text-muted-foreground">
          <ArrowsClockwise size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm">Loading journal entries...</p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <Table className="w-full text-left">
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Journal #</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reference Type</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {entries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No journal entries found.</TableCell></TableRow>
                ) : entries.map(entry => (
                  <TableRow key={entry._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/80">
                        {entry.journalNumber}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(entry.date)}</TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-full border border-sky-200/80 dark:border-sky-800">
                        {entry.referenceType}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-foreground/80 max-w-xs truncate" title={entry.description || ''}>
                      {entry.description}
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                        {entry.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewEntry(entry)}
                        className="text-xs h-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-semibold"
                      >
                        View Lines
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground bg-muted/20">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="h-7 text-xs">Prev</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="h-7 text-xs">Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {selected && (
        <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Journal Entry: {selected.journalNumber}</DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-lg border">
                <div><p className="text-[11px] uppercase tracking-wider mb-0.5">Date</p><p className="font-semibold text-foreground">{fmtDate(selected.date)}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider mb-0.5">Reference Type</p><p className="font-semibold text-foreground">{selected.referenceType}</p></div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-0.5">Status</p>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary">{selected.status}</span>
                </div>
              </div>

              {loadingLines ? <p className="text-center text-xs text-muted-foreground py-6">Loading lines...</p> : (
                <div className="rounded-lg border overflow-hidden">
                  <Table className="w-full text-sm min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left px-4 py-2.5">Account Code &amp; Title</TableHead>
                        <TableHead className="text-right px-4 py-2.5">Debit ($)</TableHead>
                        <TableHead className="text-right px-4 py-2.5">Credit ($)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineDetails.map((line: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="px-4 py-2.5">
                            <p className="font-semibold text-foreground">{line.accountId?.accountName || '—'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{line.accountId?.accountCode} • {line.accountId?.type}</p>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{line.debit > 0 ? fmtNum(line.debit) : '—'}</TableCell>
                          <TableCell className="px-4 py-2.5 text-right font-mono font-medium text-foreground">{line.credit > 0 ? fmtNum(line.credit) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell className="px-4 py-2.5 text-xs text-foreground">TOTAL (BALANCED)</TableCell>
                        <TableCell className="px-4 py-2.5 text-right font-mono text-xs text-primary font-bold">
                          ${fmtNum(lineDetails.reduce((s: number, l: any) => s + (l.debit || 0), 0))}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-right font-mono text-xs text-primary font-bold">
                          ${fmtNum(lineDetails.reduce((s: number, l: any) => s + (l.credit || 0), 0))}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer size={14} /> Print Voucher
              </Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Expenses & Payables Panel
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesPanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    categoryAccountId: '',
    paymentAccountId: '',
    supplierId: '',
    amount: '',
    paymentMethod: 'Cash',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const [supplierForm, setSupplierForm] = useState({
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, supRes, acctRes] = await Promise.all([
        financeApi.getExpenses(),
        financeApi.getSuppliers(),
        financeApi.getChartOfAccounts(),
      ]);
      setExpenses(expRes.data);
      setTotalAmount(expRes.totalAmount);
      setSuppliers(supRes);
      setAccounts(acctRes);
    } catch { setMsg('Failed to load expenses data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const expenseAccounts = accounts.Funnel(a => a.type === 'Expense');
  const paymentAccounts = accounts.Funnel(a => a.type === 'Asset' || a.type === 'Liability');

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createExpense({
        title: form.title,
        categoryAccountId: form.categoryAccountId,
        paymentAccountId: form.paymentAccountId,
        supplierId: form.supplierId || undefined,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        description: form.description,
        expenseDate: form.expenseDate,
      });
      setShowExpenseModal(false);
      setForm({ title: '', categoryAccountId: '', paymentAccountId: '', supplierId: '', amount: '', paymentMethod: 'Cash', description: '', expenseDate: new Date().toISOString().split('T')[0] });
      setMsg('Expense recorded and journal entry posted successfully.');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to record expense.'); }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createSupplier(supplierForm);
      setShowSupplierModal(false);
      setSupplierForm({ supplierName: '', contactPerson: '', phone: '', email: '', address: '' });
      setMsg('Supplier created successfully.');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to create supplier.'); }
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      {msg && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
          {msg}<Button variant="plain" onClick={() => setMsg('')}><X size={14} /></Button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">Total Disbursements: ${fmtNum(totalAmount)}</p>
          <p className="text-xs text-gray-400">{expenses.length} expenses logged</p>
        </div>
        <div className="flex gap-2">
          <Button variant="plain" onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg">
            <Users size={14} /> Manage Suppliers
          </Button>
          <Button variant="plain" onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg">
            <Plus size={14} /> Record Expense
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? <p className="text-center py-8 text-sm text-gray-400">Loading expenses...</p> : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm min-w-[700px]">
              <TableHeader>
                <TableRow className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400">
                  <TableHead className="px-5 py-3">Expense #</TableHead>
                  <TableHead className="px-5 py-3">Date</TableHead>
                  <TableHead className="px-5 py-3">Title &amp; Category</TableHead>
                  <TableHead className="px-5 py-3">Supplier</TableHead>
                  <TableHead className="px-5 py-3">Payment Method</TableHead>
                  <TableHead className="px-5 py-3 text-right">Amount ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">No expenses recorded yet. Click &quot;Record Expense&quot; above.</TableCell></TableRow>
                ) : expenses.map(exp => (
                  <TableRow key={exp._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <TableCell className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{exp.expenseNumber}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-600">{fmtDate(exp.expenseDate)}</TableCell>
                    <TableCell className="px-5 py-3">
                      <p className="font-semibold text-gray-800">{exp.title}</p>
                      <p className="text-xs text-orange-600 font-medium">{exp.categoryAccountId?.accountName || 'Expense'}</p>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-600">{exp.supplierId?.supplierName || '—'}</TableCell>
                    <TableCell className="px-5 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">{exp.paymentMethod}</span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right font-mono font-bold text-gray-900">${fmtNum(exp.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Operational Expense</DialogTitle>
            <DialogDescription>
              Record an operational cost and post the debit/credit journal entries.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div>
              <Label className="mb-1 block">Expense Title *</Label>
              <Input required placeholder="e.g. Science Lab Reagents / Office Stationery" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Expense Account (Debit) *</Label>
                <NativeSelect required value={form.categoryAccountId} onChange={e => setForm(f => ({ ...f, categoryAccountId: e.target.value }))} className={`${inp} bg-background`}>
                  <option value="" disabled>Select Expense Account</option>
                  {expenseAccounts.map(a => <option key={a._id} value={a._id}>{a.accountCode} - {a.accountName}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label className="mb-1 block">Paid From (Credit) *</Label>
                <NativeSelect required value={form.paymentAccountId} onChange={e => setForm(f => ({ ...f, paymentAccountId: e.target.value }))} className={`${inp} bg-background`}>
                  <option value="" disabled>Select Asset/Payable Account</option>
                  {paymentAccounts.map(a => <option key={a._id} value={a._id}>{a.accountCode} - {a.accountName}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Amount ($) *</Label>
                <Input required type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inp} />
              </div>
              <div>
                <Label className="mb-1 block">Payment Method</Label>
                <NativeSelect value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className={`${inp} bg-background`}>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Credit/AP</option>
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Supplier / Payee</Label>
                <NativeSelect value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className={`${inp} bg-background`}>
                  <option value="">None / Direct</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.supplierName}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label className="mb-1 block">Date</Label>
                <Input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} className={inp} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Description / Memo</Label>
              <Input placeholder="Optional details or receipt reference" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} />
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
              <Button type="submit">Post Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier / Vendor</DialogTitle>
            <DialogDescription>
              Register vendor details for expense categorization and purchasing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-3">
            <div>
              <Label className="mb-1 block">Supplier Name *</Label>
              <Input required placeholder="Supplier Name (e.g. National Book Supplies)" value={supplierForm.supplierName}
                onChange={e => setSupplierForm(f => ({ ...f, supplierName: e.target.value }))} className={inp} />
            </div>
            <div>
              <Label className="mb-1 block">Contact Person</Label>
              <Input placeholder="Contact Person" value={supplierForm.contactPerson}
                onChange={e => setSupplierForm(f => ({ ...f, contactPerson: e.target.value }))} className={inp} />
            </div>
            <div>
              <Label className="mb-1 block">Phone Number</Label>
              <Input placeholder="Phone Number" value={supplierForm.phone}
                onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
            </div>
            <div>
              <Label className="mb-1 block">Email Address</Label>
              <Input placeholder="Email Address" type="email" value={supplierForm.email}
                onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} className={inp} />
            </div>
            <div>
              <Label className="mb-1 block">Address</Label>
              <Input placeholder="Address" value={supplierForm.address}
                onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} className={inp} />
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setShowSupplierModal(false)}>Cancel</Button>
              <Button type="submit">Save Supplier</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Fixed Assets Panel
// ─────────────────────────────────────────────────────────────────────────────
function FixedAssetsPanel() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [summary, setSummary] = useState({ totalCost: 0, totalAccumulatedDepr: 0, totalBookValue: 0 });
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    assetName: '',
    category: 'Furniture & Fixtures' as FixedAsset['category'],
    purchaseCost: '',
    salvageValue: '0',
    usefulLifeMonths: '60',
    location: '',
    serialNumber: '',
    paymentAccountId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [astRes, acctRes] = await Promise.all([financeApi.getFixedAssets(), financeApi.getChartOfAccounts()]);
      setAssets(astRes.data);
      setSummary(astRes.summary);
      setAccounts(acctRes);
    } catch { setMsg('Failed to load fixed assets.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createFixedAsset({
        assetName: form.assetName,
        category: form.category,
        purchaseCost: Number(form.purchaseCost),
        salvageValue: Number(form.salvageValue),
        usefulLifeMonths: Number(form.usefulLifeMonths),
        location: form.location,
        serialNumber: form.serialNumber,
        paymentAccountId: form.paymentAccountId || undefined,
        purchaseDate: form.purchaseDate,
      });
      setShowAssetModal(false);
      setForm({ assetName: '', category: 'Furniture & Fixtures', purchaseCost: '', salvageValue: '0', usefulLifeMonths: '60', location: '', serialNumber: '', paymentAccountId: '', purchaseDate: new Date().toISOString().split('T')[0] });
      setMsg('Fixed asset registered successfully.');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Failed to register asset.'); }
  }

  async function handleDepreciate(assetId: string) {
    if (!confirm('Run and post monthly depreciation for this asset?')) return;
    try {
      const res = await financeApi.runDepreciation(assetId);
      setMsg(res.data?.message || 'Monthly depreciation posted.');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.message || 'Depreciation run failed.'); }
  }

  const paymentAccounts = accounts.Funnel(a => a.type === 'Asset');
  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      {msg && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
          {msg}<Button variant="plain" onClick={() => setMsg('')}><X size={14} /></Button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-medium">Historical Purchase Cost</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${fmtNum(summary.totalCost)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-medium">Accumulated Depreciation</p>
          <p className="text-xl font-bold text-orange-600 mt-1">-${fmtNum(summary.totalAccumulatedDepr)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-medium">Net Current Book Value</p>
          <p className="text-xl font-bold text-green-700 mt-1">${fmtNum(summary.totalBookValue)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-gray-500">{assets.length} fixed assets in registry</p>
        <Button variant="plain" onClick={() => setShowAssetModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg">
          <Plus size={14} /> Register Fixed Asset
        </Button>
      </div>

      {loading ? <p className="text-center py-8 text-sm text-gray-400">Loading assets...</p> : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm min-w-[750px]">
              <TableHeader>
                <TableRow className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400">
                  <TableHead className="px-5 py-3">Asset Code</TableHead>
                  <TableHead className="px-5 py-3">Asset Name &amp; Category</TableHead>
                  <TableHead className="px-5 py-3">Purchase Date</TableHead>
                  <TableHead className="px-5 py-3 text-right">Cost ($)</TableHead>
                  <TableHead className="px-5 py-3 text-right">Accum. Depr. ($)</TableHead>
                  <TableHead className="px-5 py-3 text-right">Book Value ($)</TableHead>
                  <TableHead className="px-5 py-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">No fixed assets registered yet.</TableCell></TableRow>
                ) : assets.map(ast => (
                  <TableRow key={ast._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <TableCell className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{ast.assetCode}</TableCell>
                    <TableCell className="px-5 py-3">
                      <p className="font-semibold text-gray-800">{ast.assetName}</p>
                      <p className="text-xs text-gray-400">{ast.category} • {ast.location || 'Campus'}</p>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-600">{fmtDate(ast.purchaseDate)}</TableCell>
                    <TableCell className="px-5 py-3 text-right font-mono font-medium">${fmtNum(ast.purchaseCost)}</TableCell>
                    <TableCell className="px-5 py-3 text-right font-mono text-orange-600">${fmtNum(ast.accumulatedDepreciation)}</TableCell>
                    <TableCell className="px-5 py-3 text-right font-mono font-bold text-green-700">${fmtNum(ast.currentBookValue)}</TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <Button variant="plain" onClick={() => handleDepreciate(ast._id)}
                        disabled={ast.currentBookValue <= ast.salvageValue}
                        className="text-xs text-blue-600 hover:underline font-semibold disabled:opacity-30">
                        Post Depr.
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Asset Modal */}
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Fixed Asset</DialogTitle>
            <DialogDescription>
              Add a capitalized asset to the balance sheet with depreciation parameters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAsset} className="space-y-3">
            <div>
              <Label className="mb-1 block">Asset Name *</Label>
              <Input required placeholder="e.g. Buildings Bus #1 / Lab Computer Batch A" value={form.assetName}
                onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Category</Label>
                <NativeSelect value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className={`${inp} bg-background`}>
                  {['Buildings', 'Vehicles', 'Computers & IT', 'Furniture & Fixtures', 'Lab Equipment', 'Other'].map(c => <option key={c}>{c}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label className="mb-1 block">Purchase Date</Label>
                <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block">Cost ($) *</Label>
                <Input required type="number" step="0.01" min="1" placeholder="0.00" value={form.purchaseCost}
                  onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} className={inp} />
              </div>
              <div>
                <Label className="mb-1 block">Salvage Value ($)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.salvageValue}
                  onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} className={inp} />
              </div>
              <div>
                <Label className="mb-1 block">Useful Life (Mos)</Label>
                <Input type="number" min="1" placeholder="60" value={form.usefulLifeMonths}
                  onChange={e => setForm(f => ({ ...f, usefulLifeMonths: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Paid From (Asset Acquisition)</Label>
                <NativeSelect value={form.paymentAccountId} onChange={e => setForm(f => ({ ...f, paymentAccountId: e.target.value }))} className={`${inp} bg-background`}>
                  <option value="">No Journal Entry (Already Paid)</option>
                  {paymentAccounts.map(a => <option key={a._id} value={a._id}>{a.accountCode} - {a.accountName}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label className="mb-1 block">Location / Serial No.</Label>
                <Input placeholder="Room 102 / S/N 83921" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inp} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setShowAssetModal(false)}>Cancel</Button>
              <Button type="submit">Register Asset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Comprehensive Financial Statements & Reports Panel
// ─────────────────────────────────────────────────────────────────────────────
function FinancialStatementsPanel() {
  const [statementType, setStatementType] = useState<'income' | 'balance' | 'cashflow' | 'ar_aging' | 'trial'>('income');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [incomeData, setIncomeData] = useState<IncomeStatementData | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSheetData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [arAgingData, setArAgingData] = useState<ArAgingData | null>(null);
  const [trialRows, setTrialRows] = useState<TrialBalanceRow[]>([]);
  const [trialTotals, setTrialTotals] = useState({ totalDebitBalance: 0, totalCreditBalance: 0 });
  const [trialBalanced, setTrialBalanced] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      if (statementType === 'income') {
        setIncomeData(await financeApi.getIncomeStatement({ startDate: startDate || undefined, endDate: endDate || undefined }));
      } else if (statementType === 'balance') {
        setBalanceData(await financeApi.getBalanceSheet({ asOfDate: endDate || undefined }));
      } else if (statementType === 'cashflow') {
        setCashFlowData(await financeApi.getCashFlowStatement({ startDate: startDate || undefined, endDate: endDate || undefined }));
      } else if (statementType === 'ar_aging') {
        setArAgingData(await financeApi.getArAgingReport());
      } else if (statementType === 'trial') {
        const res = await financeApi.getTrialBalance({ startDate: startDate || undefined, endDate: endDate || undefined });
        setTrialRows(res.data);
        setTrialTotals(res.totals);
        setTrialBalanced(res.balanced);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statementType, startDate, endDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  function handleExportCsv() {
    if (statementType === 'income' && incomeData) {
      const rows = [
        ...incomeData.revenues.map(r => ['Revenue', r.accountCode, r.accountName, r.balance]),
        ['Total Revenue', '', '', incomeData.totalRevenue],
        ...incomeData.expenses.map(e => ['Expense', e.accountCode, e.accountName, e.balance]),
        ['Total Expenses', '', '', incomeData.totalExpenses],
        ['Net Income', '', '', incomeData.netIncome],
      ];
      downloadCsv('income_statement', ['Type', 'Account Code', 'Account Name', 'Amount ($)'], rows);
    } else if (statementType === 'balance' && balanceData) {
      const rows = [
        ...balanceData.assets.map(a => ['Asset', a.accountCode, a.accountName, a.balance]),
        ['Total Assets', '', '', balanceData.totalAssets],
        ...balanceData.liabilities.map(l => ['Liability', l.accountCode, l.accountName, l.balance]),
        ['Total Liabilities', '', '', balanceData.totalLiabilities],
        ...balanceData.equity.map(eq => ['Equity', eq.accountCode, eq.accountName, eq.balance]),
        ['Current Period Earnings', '', '', balanceData.currentPeriodEarnings],
        ['Total Equity', '', '', balanceData.totalEquity],
        ['Total Liabilities & Equity', '', '', balanceData.totalLiabilitiesAndEquity],
      ];
      downloadCsv('balance_sheet', ['Category', 'Account Code', 'Account Name', 'Amount ($)'], rows);
    } else if (statementType === 'trial') {
      const rows = trialRows.map(r => [r.accountCode, r.accountName, r.type, r.debitBalance, r.creditBalance]);
      downloadCsv('trial_balance', ['Account Code', 'Account Name', 'Type', 'Debit Balance ($)', 'Credit Balance ($)'], rows);
    }
  }

  const inp = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm';

  return (
    <div className="space-y-5">
      {/* Report Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'income',   label: 'Income Statement (P&L)' },
            { id: 'balance',  label: 'Balance Sheet' },
            { id: 'cashflow', label: 'Cash Flow' },
            { id: 'trial',    label: 'Trial Balance' },
            { id: 'ar_aging', label: 'AR Aging Report' },
          ].map(tab => (
            <Button variant="plain" key={tab.id} onClick={() => setStatementType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statementType === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {statementType !== 'ar_aging' && (
            <>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} placeholder="From" />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} placeholder="To" />
              <Button variant="plain" onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Reset</Button>
            </>
          )}
          <Button variant="plain" onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            <DownloadSimple size={13} /> Export CSV
          </Button>
          <Button variant="plain" onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800">
            <Printer size={13} /> Print Statement
          </Button>
        </div>
      </div>

      {loading ? <p className="text-center py-12 text-sm text-gray-400">Computing financial statements from ledger...</p> : (
        <>
          {/* INCOME STATEMENT */}
          {statementType === 'income' && incomeData && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">Statement of Income &amp; Expenses (P&amp;L)</h2>
                <p className="text-xs text-gray-400 mt-1">Period: {incomeData.period.startDate} to {incomeData.period.endDate}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">Operating Revenues</h4>
                  <Table className="w-full text-sm">
                    <TableBody>
                      {incomeData.revenues.map((r, i) => (
                        <TableRow key={i} className="border-b border-gray-50">
                          <TableCell className="py-2 text-gray-700">{r.accountName} <span className="text-xs font-mono text-gray-400">({r.accountCode})</span></TableCell>
                          <TableCell className="py-2 text-right font-mono font-medium">${fmtNum(r.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t border-gray-200">
                        <TableCell className="py-2 text-gray-900">TOTAL REVENUE</TableCell>
                        <TableCell className="py-2 text-right font-mono text-green-700">${fmtNum(incomeData.totalRevenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-2">Operating Expenses</h4>
                  <Table className="w-full text-sm">
                    <TableBody>
                      {incomeData.expenses.map((e, i) => (
                        <TableRow key={i} className="border-b border-gray-50">
                          <TableCell className="py-2 text-gray-700">{e.accountName} <span className="text-xs font-mono text-gray-400">({e.accountCode})</span></TableCell>
                          <TableCell className="py-2 text-right font-mono font-medium">${fmtNum(e.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t border-gray-200">
                        <TableCell className="py-2 text-gray-900">TOTAL EXPENSES</TableCell>
                        <TableCell className="py-2 text-right font-mono text-orange-700">${fmtNum(incomeData.totalExpenses)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${incomeData.isProfitable ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'}`}>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">NET SURPLUS / (DEFICIT)</h3>
                    <p className="text-xs text-gray-500">Revenue minus all Buildings operating expenses &amp; discounts</p>
                  </div>
                  <p className={`text-2xl font-black font-mono ${incomeData.isProfitable ? 'text-green-800' : 'text-red-700'}`}>
                    ${fmtNum(incomeData.netIncome)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BALANCE SHEET */}
          {statementType === 'balance' && balanceData && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">Balance Sheet (Statement of Financial Position)</h2>
                <p className="text-xs text-gray-400 mt-1">As of: {balanceData.asOfDate}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Assets */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider">Assets</h3>
                  <Table className="w-full text-sm">
                    <TableBody>
                      {balanceData.assets.map((a, i) => (
                        <TableRow key={i} className="border-b border-gray-50">
                          <TableCell className="py-2 text-gray-700">{a.accountName} <span className="text-xs font-mono text-gray-400">({a.accountCode})</span></TableCell>
                          <TableCell className="py-2 text-right font-mono font-medium">${fmtNum(a.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2 border-blue-200">
                        <TableCell className="py-3 text-blue-900">TOTAL ASSETS</TableCell>
                        <TableCell className="py-3 text-right font-mono text-blue-900 text-base">${fmtNum(balanceData.totalAssets)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Right: Liabilities & Equity */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2">Liabilities</h3>
                    <Table className="w-full text-sm">
                      <TableBody>
                        {balanceData.liabilities.length === 0 ? (
                          <TableRow><TableCell colSpan={2} className="py-2 text-xs text-gray-400">No liabilities recorded.</TableCell></TableRow>
                        ) : balanceData.liabilities.map((l, i) => (
                          <TableRow key={i} className="border-b border-gray-50">
                            <TableCell className="py-2 text-gray-700">{l.accountName} <span className="text-xs font-mono text-gray-400">({l.accountCode})</span></TableCell>
                            <TableCell className="py-2 text-right font-mono font-medium">${fmtNum(l.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t border-gray-200">
                          <TableCell className="py-2 text-gray-900">Total Liabilities</TableCell>
                          <TableCell className="py-2 text-right font-mono text-red-700">${fmtNum(balanceData.totalLiabilities)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-2">Equity &amp; Surplus</h3>
                    <Table className="w-full text-sm">
                      <TableBody>
                        {balanceData.equity.map((eq, i) => (
                          <TableRow key={i} className="border-b border-gray-50">
                            <TableCell className="py-2 text-gray-700">{eq.accountName} <span className="text-xs font-mono text-gray-400">({eq.accountCode})</span></TableCell>
                            <TableCell className="py-2 text-right font-mono font-medium">${fmtNum(eq.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-b border-gray-50">
                          <TableCell className="py-2 text-gray-700">Current Period Net Surplus</TableCell>
                          <TableCell className="py-2 text-right font-mono font-medium">${fmtNum(balanceData.currentPeriodEarnings)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold border-t border-gray-200">
                          <TableCell className="py-2 text-gray-900">Total Equity</TableCell>
                          <TableCell className="py-2 text-right font-mono text-purple-700">${fmtNum(balanceData.totalEquity)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="pt-2 border-t-2 border-gray-900 flex justify-between font-bold text-base">
                    <span>TOTAL LIABILITIES &amp; EQUITY</span>
                    <span className="font-mono">${fmtNum(balanceData.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-semibold ${balanceData.isBalanced ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {balanceData.isBalanced ? <CheckCircle size={14} /> : <WarningCircle size={14} />}
                {balanceData.isBalanced ? 'Accounting equation holds: Total Assets = Total Liabilities + Total Equity' : 'Warning: Out of balance.'}
              </div>
            </div>
          )}

          {/* CASH FLOW STATEMENT */}
          {statementType === 'cashflow' && cashFlowData && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">Statement of Cash Flows</h2>
                <p className="text-xs text-gray-400 mt-1">Period: {cashFlowData.period.startDate} to {cashFlowData.period.endDate}</p>
              </div>

              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400">
                    <TableHead className="py-3">Cash Activity Stream</TableHead>
                    <TableHead className="py-3 text-right">Inflow ($)</TableHead>
                    <TableHead className="py-3 text-right">Outflow ($)</TableHead>
                    <TableHead className="py-3 text-right">Net Flow ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashFlowData.operatingActivities.map((act, i) => (
                    <TableRow key={i} className="border-b border-gray-50">
                      <TableCell className="py-3 font-semibold text-gray-800 flex items-center gap-2">
                        {act.netCashFlow >= 0 ? <ArrowDownLeft size={14} className="text-green-600" /> : <ArrowUpRight size={14} className="text-orange-600" />}
                        {act.activityType}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-green-700">${fmtNum(act.inflow)}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-orange-600">${fmtNum(act.outflow)}</TableCell>
                      <TableCell className={`py-3 text-right font-mono font-bold ${act.netCashFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        ${fmtNum(act.netCashFlow)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="border-t-2 font-bold text-base bg-slate-50">
                    <TableCell className="py-4 px-3 text-gray-900">NET CHANGE IN CASH &amp; BANK</TableCell>
                    <TableCell className="py-4 text-right font-mono text-green-700">${fmtNum(cashFlowData.totalInflow)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-orange-600">${fmtNum(cashFlowData.totalOutflow)}</TableCell>
                    <TableCell className={`py-4 px-3 text-right font-mono ${cashFlowData.netChangeInCash >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                      ${fmtNum(cashFlowData.netChangeInCash)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          {/* TRIAL BALANCE */}
          {statementType === 'trial' && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">General Ledger Trial Balance</h2>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${trialBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {trialBalanced ? <CheckCircle size={13} /> : <WarningCircle size={13} />}
                  {trialBalanced ? 'Trial Balance is Balanced (Debits = Credits)' : 'Warning: Unbalanced Trial Balance'}
                </div>
              </div>

              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    <TableHead className="text-left px-4 py-3">Code</TableHead>
                    <TableHead className="text-left px-4 py-3">Account Title</TableHead>
                    <TableHead className="text-left px-4 py-3">Type</TableHead>
                    <TableHead className="text-right px-4 py-3">Debit Balance ($)</TableHead>
                    <TableHead className="text-right px-4 py-3">Credit Balance ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialRows.map((r, i) => (
                    <TableRow key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <TableCell className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-500">{r.accountCode}</TableCell>
                      <TableCell className="px-4 py-2.5 font-semibold text-gray-800">{r.accountName}</TableCell>
                      <TableCell className="px-4 py-2.5"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${TYPE_COLORS[r.type]}`}>{r.type}</span></TableCell>
                      <TableCell className="px-4 py-2.5 text-right font-mono">{r.debitBalance > 0 ? `$${fmtNum(r.debitBalance)}` : '—'}</TableCell>
                      <TableCell className="px-4 py-2.5 text-right font-mono">{r.creditBalance > 0 ? `$${fmtNum(r.creditBalance)}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-slate-50 border-t-2 font-bold text-sm">
                    <TableCell colSpan={3} className="px-4 py-3 text-gray-900">TOTAL</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-green-800">${fmtNum(trialTotals.totalDebitBalance)}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-green-800">${fmtNum(trialTotals.totalCreditBalance)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          {/* AR AGING REPORT */}
          {statementType === 'ar_aging' && arAgingData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(arAgingData.buckets).map(([key, bucket]) => (
                  <div key={key} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 font-medium truncate">{bucket.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">${fmtNum(bucket.amount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{bucket.count} invoices</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-bold text-sm text-gray-900">Delinquent &amp; Outstanding Invoices Detail</h3>
                  <p className="text-xs text-red-600 font-semibold">Total Outstanding: ${fmtNum(arAgingData.totalReceivable)}</p>
                </div>

                <div className="overflow-x-auto">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow className="border-b text-xs font-semibold text-gray-400 text-left">
                        <TableHead className="py-2.5 px-3">Invoice #</TableHead>
                        <TableHead className="py-2.5 px-3">Student Name</TableHead>
                        <TableHead className="py-2.5 px-3">Due Date</TableHead>
                        <TableHead className="py-2.5 px-3">Days Overdue</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Balance Due ($)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(arAgingData.buckets).flatMap(b => b.invoices).map(inv => (
                        <TableRow key={inv._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <TableCell className="py-2.5 px-3 font-mono text-xs font-semibold text-gray-700">{inv.invoiceNo}</TableCell>
                          <TableCell className="py-2.5 px-3">
                            <p className="font-semibold text-gray-800">{inv.studentName}</p>
                            <p className="text-xs text-gray-400 font-mono">{inv.admissionNumber}</p>
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-gray-600">{fmtDate(inv.dueDate || '')}</TableCell>
                          <TableCell className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${inv.daysOverdue > 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {inv.daysOverdue} days
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-red-600">${fmtNum(inv.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AccountingTab Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AccountingTab() {
  const [activeSection, setActiveSection] = useState<string>('coa');

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border overflow-x-auto">
        {ACCOUNTING_TABS.map(t => (
          <Button
            variant={activeSection === t.key ? 'secondary' : 'ghost'}
            size="sm"
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === t.key
                ? 'bg-background text-foreground shadow-sm hover:bg-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}
      </div>

      {activeSection === 'coa'      && <ChartOfAccountsPanel />}
      {activeSection === 'fiscal'   && <FiscalYearsPanel />}
      {activeSection === 'journal'  && <JournalEntriesPanel />}
      {activeSection === 'expenses' && <ExpensesPanel />}
      {activeSection === 'assets'   && <FixedAssetsPanel />}
      {activeSection === 'reports'  && <FinancialStatementsPanel />}
    </div>
  );
}
