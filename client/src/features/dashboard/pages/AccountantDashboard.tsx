import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartBar, Faders, HandCoins, Printer, Receipt, UsersThree, Wallet, WarningCircle } from '@phosphor-icons/react';
import { getFinanceDashboardData } from '../../../services/dashboardService';
import { monthlyFeesApi } from '../../finance/api/monthlyFeesApi';
import FeeReceiptDialog from '../../finance/components/FeeReceiptDialog';
import type { FeeReceipt } from '../../finance/monthlyTypes';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CHART_TOOLTIP } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import {
  DashboardError, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, Panel, PanelEmpty, PanelLink, QuickActions,
} from '../components/DashboardKit';
import { TILE_FILLS, TILE_HSL, initials, money } from '../components/dashboardUtils';

interface FinanceSummaryData {
  totals: { totalFees: number; paidFees: number; outstanding: number; collectionRate: number };
  statusDistribution: { name: string; value: number }[];
  monthlyCollection: { month: string; collected: number }[];
  todaysPayments?: { amount: number; count: number };
  outstandingStudentsCount?: number;
  topOutstanding?: { studentId: string; name: string; admissionNumber: string; className: string; balance: number; invoiceCount: number }[];
}

// Paid green, part paid yellow, unpaid pink.
const STATUSES = [
  { key: 'Paid', label: 'Paid', color: 'hsl(var(--tile-green))' },
  { key: 'Partially_Paid', label: 'Part paid', color: 'hsl(var(--tile-yellow))' },
  { key: 'Unpaid', label: 'Unpaid', color: 'hsl(var(--tile-pink))' },
];

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [finance, setFinance] = useState<FinanceSummaryData | null>(null);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [receipt, setReceipt] = useState<FeeReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([getFinanceDashboardData(), monthlyFeesApi.listReceipts({ limit: 6 })]).then(([fin, rec]) => {
      if (fin.status === 'fulfilled' && fin.value) setFinance(fin.value);
      else setError('Could not load finance figures from the server.');
      if (rec.status === 'fulfilled') setReceipts(rec.value);
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardLoading />;

  const totals = finance?.totals ?? { totalFees: 0, paidFees: 0, outstanding: 0, collectionRate: 0 };
  const today = finance?.todaysPayments ?? { amount: 0, count: 0 };
  const owingCount = finance?.outstandingStudentsCount ?? 0;
  const monthly = finance?.monthlyCollection ?? [];
  const topOwing = finance?.topOutstanding ?? [];
  const statusData = STATUSES.map((st) => ({
    name: st.label,
    color: st.color,
    value: finance?.statusDistribution.find((d) => d.name === st.key)?.value ?? 0,
  }));

  const openReceipt = async (id: string) => {
    try { setReceipt(await monthlyFeesApi.getReceipt(id)); } catch { /* the list stays as it is */ }
  };

  return (
    <div className="space-y-6">
      <DashboardError message={error} />

      <KpiRow columns={4}>
        <KpiTile label="Collected today" value={money(today.amount)} fill="bg-tile-pink" icon={HandCoins}
          note={today.count ? `${today.count} monthly bill${today.count === 1 ? '' : 's'} paid today` : 'No payments yet today'} to="/finance" />
        <KpiTile label="Collected in total" value={money(totals.paidFees)} fill="bg-tile-yellow" icon={Wallet}
          note={`of ${money(totals.totalFees)} billed`} to="/finance?tab=report" />
        <KpiTile label="Still owed" value={money(totals.outstanding)} fill="bg-tile-blue" icon={WarningCircle}
          note={owingCount ? `${owingCount} student${owingCount === 1 ? ' owes' : 's owe'} fees` : 'Nobody owes anything'} to="/finance?tab=classes" />
        <KpiTile label="Collection rate" value={`${Math.round(totals.collectionRate)}%`} fill="bg-tile-green" icon={ChartBar}
          note="Collected of everything billed" to="/finance?tab=report" />
      </KpiRow>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Collections by month" description="Fees received in the last six months" action={<PanelLink to="/finance?tab=report">Fee report</PanelLink>}>
          {monthly.every((m) => !m.collected) ? (
            <PanelEmpty text="No payments have been collected yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number | string) => (typeof v === 'number' ? money(v) : v)} />
                <Bar dataKey="collected" name="Collected" radius={[8, 8, 8, 8]} barSize={32}>
                  {monthly.map((_, i) => <Cell key={i} fill={TILE_HSL[i % TILE_HSL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Recent receipts" action={<PanelLink to="/finance?tab=report">All</PanelLink>}>
          {receipts.length === 0 ? (
            <PanelEmpty text="No payments taken yet." />
          ) : (
            <div className="-mt-2 space-y-1">
              {receipts.map((r, i) => (
                <Button key={r._id} variant="plain" type="button" onClick={() => openReceipt(r._id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/60">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>
                    <Receipt size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.payer_name || r.students.map((x) => x.firstName).join(', ')}</span>
                    <span className="block text-xs text-muted-foreground">{r.receipt_no} · {new Date(r.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{money(r.total)}</span>
                  <Printer size={14} className="text-muted-foreground" />
                </Button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutBreakdown title="Bills by status" description="Amount billed, by how much has been paid" data={statusData}
          centerLabel="Billed" emptyText="No bills yet." format={money} />
        <QuickActions title="Quick actions" description="The jobs you do most, one click away" actions={[
          { label: 'Collect Fees', icon: HandCoins, to: '/finance' },
          { label: 'Class Status', icon: UsersThree, to: '/finance?tab=classes' },
          { label: 'Fee Report', icon: ChartBar, to: '/finance?tab=report' },
          { label: 'Fee Setup', icon: Faders, to: '/finance?tab=setup' },
        ]} />
      </div>

      <Panel title="Students who owe the most" description={owingCount ? `${owingCount} students owe ${money(totals.outstanding)} in total` : undefined}
        flush action={<PanelLink to="/finance">Collect</PanelLink>}>
        {topOwing.length === 0 ? (
          <PanelEmpty text="Nobody owes any fees right now." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Unpaid bills</TableHead>
                  <TableHead className="text-right">Owed</TableHead>
                  <TableHead className="pr-6 text-right"><span className="sr-only">Collect</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topOwing.slice(0, 6).map((st, i) => (
                  <TableRow key={st.studentId}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>{initials(st.name)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{st.name}</p>
                          <p className="text-xs text-muted-foreground">{st.admissionNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="rounded-md bg-tile-blue px-2 py-0.5 text-xs font-medium text-tile-foreground">{st.className}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{st.invoiceCount}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-destructive">{money(st.balance)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button size="xs" variant="outline" onClick={() => navigate(`/finance?student=${st.studentId}`)}>Collect</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {receipt && <FeeReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
