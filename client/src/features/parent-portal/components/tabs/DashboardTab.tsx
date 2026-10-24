import { useEffect, useMemo, useState } from 'react';
import { SpinnerGap, ClipboardText, CurrencyDollar, ArrowRight, Receipt, CalendarCheck } from '@phosphor-icons/react';
import { SectionCard, EmptyState } from '../shared';
import { useParentPortal } from '../../context/ParentContext';
import { parentPortalApi } from '../../api/parentPortalApi';
import { fullName } from '../../../student-portal/utils/portalStudent';
import type { PortalInvoicesResponse } from '../../../student-portal/api/portalApi';
import type { MyAttendanceResponse } from '../../../student-portal/api/attendanceApi';
import type { TabId } from '../../types';
import { Button } from '@/components/ui/button';
import StatStrip from '@/components/shared/StatStrip';

interface Props {
  onNavigate: (tab: TabId) => void;
}

const formatUSD = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function DashboardTab({ onNavigate }: Props) {
  const { child, childId, guardianId } = useParentPortal();
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

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <SpinnerGap size={32} className="animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading student progress...</span>
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm font-medium">{error}</div>;
  }

  const balance = invoices?.totals?.balance ?? 0;
  const attendanceTotal = attendance?.total ?? 0;
  const attendanceRows: { label: string; value: number }[] = [
    { label: 'Present', value: attendance?.summary?.Present ?? 0 },
    { label: 'Absent', value: attendance?.summary?.Absent ?? 0 },
    { label: 'Late', value: attendance?.summary?.Late ?? 0 },
    { label: 'Excused', value: attendance?.summary?.Excused ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Student Overview Header */}
      {child && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Overview for <span className="font-semibold text-foreground">{fullName(child)}</span>
          </p>

        </div>
      )}

      {/* KPI Stats Strip */}
      <StatStrip
        items={[
          {
            label: 'Attendance',
            value: `${attendanceRate}%`,
            tone: 'emerald',
            icon: ClipboardText,
            hint: 'Present or late, all recorded lessons',
          },
          {
            label: 'Outstanding Fees',
            value: formatUSD(balance),
            tone: balance > 0 ? 'rose' : 'emerald',
            icon: CurrencyDollar,
            hint: balance > 0 ? 'Payment due' : 'All accounts settled',
          },
        ]}
      />

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Attendance Summary"
            subtitle="Recorded sessions by status"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('attendance')}
                className="text-xs font-semibold text-primary hover:text-primary gap-1 h-7 px-2"
              >
                View all <ArrowRight size={13} />
              </Button>
            }
          >
            {attendanceTotal === 0 ? (
              <EmptyState
                text="No attendance has been recorded for this student yet."
                icon={CalendarCheck}
              />
            ) : (
              <div className="divide-y divide-border/60">
                {attendanceRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 px-1"
                  >
                    <span className="text-xs font-semibold text-foreground">{row.label}</span>
                    <span className="font-mono text-xs font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 last:pb-0 px-1">
                  <span className="text-xs text-muted-foreground">Total sessions</span>
                  <span className="font-mono text-xs font-semibold text-foreground">{attendanceTotal}</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Fee Summary */}
        <SectionCard
          title="Fee Summary"
          subtitle="Account balances and billing status"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('fees')}
              className="text-xs font-semibold text-primary hover:text-primary gap-1 h-7 px-2"
            >
              Details <ArrowRight size={13} />
            </Button>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Invoiced</span>
              <span className="font-mono font-medium text-foreground">
                {formatUSD(invoices?.totals?.invoiced ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-mono font-semibold text-success">
                {formatUSD(invoices?.totals?.paid ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Balance</span>
              <span
                className={`font-mono font-bold text-sm ${
                  balance > 0 ? 'text-destructive' : 'text-success'
                }`}
              >
                {formatUSD(balance)}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('fees')}
            className="w-full mt-4 text-xs h-8 font-medium gap-1.5 shadow-2xs"
          >
            <Receipt size={13} />
            View Complete Fee Statement
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
