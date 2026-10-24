import { useEffect, useMemo, useState } from 'react';
import { ClipboardText, CurrencyDollar, ArrowRight, Receipt, CalendarCheck } from '@phosphor-icons/react';
import { DashboardError, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, MiniStat, Panel, ProgressLine } from '../../../dashboard/components/DashboardKit';
import { useParentPortal } from '../../context/ParentContext';
import { parentPortalApi } from '../../api/parentPortalApi';
import type { PortalInvoicesResponse } from '../../../student-portal/api/portalApi';
import type { MyAttendanceResponse } from '../../../student-portal/api/attendanceApi';
import type { TabId } from '../../types';
import { Button } from '@/components/ui/button';

interface Props {
  onNavigate: (tab: TabId) => void;
}

const formatUSD = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function DashboardTab({ onNavigate }: Props) {
  const { childId, guardianId } = useParentPortal();
  const [attendance, setAttendance] = useState<MyAttendanceResponse | null>(null);
  const [invoices, setInvoices] = useState<PortalInvoicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [att, inv] = await Promise.all([
          parentPortalApi.getChildAttendance(childId, guardianId),
          parentPortalApi.getChildInvoices(childId, guardianId),
        ]);
        if (cancelled) return;
        setAttendance(att);
        setInvoices(inv);
        setError('');
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError('Failed to load child dashboard data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, guardianId]);

  const attendanceRate = useMemo(() => {
    const total = attendance?.total ?? 0;
    // Late counts as attended, as on the Attendance tab.
    const present = (attendance?.summary?.Present ?? 0) + (attendance?.summary?.Late ?? 0);
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [attendance]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  const att = attendance?.summary;
  const attendanceTotal = attendance?.total ?? 0;
  const invoiced = invoices?.totals?.invoiced ?? 0;
  const paid = invoices?.totals?.paid ?? 0;
  const balance = invoices?.totals?.balance ?? 0;
  const paidPct = invoiced > 0 ? Math.round((paid / invoiced) * 100) : 0;

  return (
    <div className="space-y-6">
      <KpiRow columns={4}>
        <KpiTile label="Attendance" value={`${attendanceRate}%`} fill="bg-tile-green" icon={ClipboardText}
          note="Present or late, all lessons" onClick={() => onNavigate('attendance')} />
        <KpiTile label="Lessons recorded" value={attendanceTotal} fill="bg-tile-blue" icon={CalendarCheck}
          note={`${att?.Absent ?? 0} absent · ${att?.Late ?? 0} late`} onClick={() => onNavigate('attendance')} />
        <KpiTile label="Fees paid" value={formatUSD(paid)} fill="bg-tile-pink" icon={Receipt}
          note={`of ${formatUSD(invoiced)} billed`} onClick={() => onNavigate('fees')} />
        <KpiTile label="Outstanding fees" value={formatUSD(balance)} fill="bg-tile-yellow" icon={CurrencyDollar}
          note={balance > 0 ? 'Payment due' : 'All paid up'} onClick={() => onNavigate('fees')} />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutBreakdown title="Attendance" description="Recorded lessons by status"
          data={[
            { name: 'Present', value: att?.Present ?? 0, color: 'hsl(var(--tile-green))' },
            { name: 'Late', value: att?.Late ?? 0, color: 'hsl(var(--tile-yellow))' },
            { name: 'Absent', value: att?.Absent ?? 0, color: 'hsl(var(--tile-pink))' },
            { name: 'Excused', value: att?.Excused ?? 0, color: 'hsl(var(--tile-blue))' },
          ]}
          centerLabel="Lessons" emptyText="No attendance has been recorded yet." />

        <Panel title="Fee summary" description="What has been billed and paid"
          action={<Button variant="ghost" size="xs" onClick={() => onNavigate('fees')}>Details <ArrowRight size={13} /></Button>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Billed" value={formatUSD(invoiced)} fill="bg-tile-blue" />
              <MiniStat label="Paid" value={formatUSD(paid)} fill="bg-tile-green" />
            </div>
            <ProgressLine label="Paid so far" percent={paidPct} />
            <div className="flex items-center justify-between rounded-xl bg-tile-yellow px-3.5 py-3 text-tile-foreground">
              <span className="text-sm font-medium">Balance due</span>
              <span className="text-lg font-semibold tabular-nums">{formatUSD(balance)}</span>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
