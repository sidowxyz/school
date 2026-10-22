import { useEffect, useMemo, useState } from 'react';
import { SpinnerGap, ClipboardText, Trophy, CurrencyDollar, ArrowRight, Receipt, BookOpen } from '@phosphor-icons/react';
import { SectionCard, StatusBadge, EmptyState } from '../shared';
import { useParentPortal } from '../../context/ParentContext';
import { parentPortalApi } from '../../api/parentPortalApi';
import { fullName } from '../../../student-portal/utils/portalStudent';
import type { PortalResult, PortalInvoicesResponse } from '../../../student-portal/api/portalApi';
import type { MyAttendanceResponse } from '../../../student-portal/api/attendanceApi';
import type { TabId } from '../../types';
import { Button } from '@/components/ui/button';
import StatStrip from '@/components/shared/StatStrip';
import { Badge } from '@/components/ui/badge';

interface Props {
  onNavigate: (tab: TabId) => void;
}

const formatUSD = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const resultPct = (r: PortalResult): number | null => {
  const total = r.ex_r_no?.total_marks;
  if (typeof r.marks === 'number' && typeof total === 'number' && total > 0) return Math.round((r.marks / total) * 100);
  return null;
};

export default function DashboardTab({ onNavigate }: Props) {
  const { child, childId, guardianId } = useParentPortal();
  const [attendance, setAttendance] = useState<MyAttendanceResponse | null>(null);
  const [results, setResults] = useState<PortalResult[]>([]);
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
        const [att, res, inv] = await Promise.all([
          parentPortalApi.getChildAttendance(childId, guardianId),
          parentPortalApi.getChildResults(childId, guardianId),
          parentPortalApi.getChildInvoices(childId, guardianId),
        ]);
        if (cancelled) return;
        setAttendance(att);
        setResults(res);
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
    const present = attendance?.summary?.Present ?? 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [attendance]);

  const averagePct = useMemo(() => {
    const pcts = results.map(resultPct).Funnel((v): v is number => v !== null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  }, [results]);

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

  const recentResults = results.slice(0, 5);
  const balance = invoices?.totals?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Student Overview Header */}
      {child && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Academic overview for <span className="font-semibold text-foreground">{fullName(child)}</span>
          </p>
          <Badge variant="outline" className="text-[11px]">
            Term Progress Active
          </Badge>
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
            hint: 'Term attendance present rate',
          },
          {
            label: 'Average Score',
            value: averagePct !== null ? `${averagePct}%` : '—',
            tone: 'violet',
            icon: Trophy,
            hint: 'Cumulative performance rate',
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
        {/* Recent Results */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Academic Results"
            subtitle="Latest examination and assessment scores"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('results')}
                className="text-xs font-semibold text-primary hover:text-primary gap-1 h-7 px-2"
              >
                View all <ArrowRight size={13} />
              </Button>
            }
          >
            {recentResults.length === 0 ? (
              <EmptyState
                text="No examination results have been published for this student yet."
                icon={BookOpen}
              />
            ) : (
              <div className="divide-y divide-border/60">
                {recentResults.map((r) => {
                  const p = resultPct(r);
                  return (
                    <div
                      key={r._id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/20 rounded px-1 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {r.cc_no?.sub_no?.sub_name ?? 'Course'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.ex_r_no?.ex_no?.ex_name || 'Assessment'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {p !== null ? `${p}%` : typeof r.marks === 'number' ? r.marks : '—'}
                        </span>
                        {r.grade && <StatusBadge status={r.grade} />}
                      </div>
                    </div>
                  );
                })}
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
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {formatUSD(invoices?.totals?.paid ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Balance</span>
              <span
                className={`font-mono font-bold text-sm ${
                  balance > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
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
