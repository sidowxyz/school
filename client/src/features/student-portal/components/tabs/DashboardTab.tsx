import { useEffect, useMemo, useState } from 'react';
import { SpinnerGap, ClipboardText, Trophy, CurrencyDollar, BookOpen, ArrowRight, Clock, TrendUp } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { usePortal } from '../../context/PortalContext';
import { studentAttendanceApi, type MyAttendanceResponse } from '../../api/attendanceApi';
import {
  portalApi, type PortalResult, type PortalInvoicesResponse, type PortalTimetableSlot,
} from '../../api/portalApi';
import type { TabId } from '../../types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../shared';

interface Props {
  onNavigate: (tab: TabId) => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const formatUSD = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const resultPct = (r: PortalResult): number | null => {
  const total = r.ex_r_no?.total_marks;
  if (typeof r.marks === 'number' && typeof total === 'number' && total > 0) return Math.round((r.marks / total) * 100);
  return null;
};

export default function DashboardTab({ onNavigate }: Props) {
  const { studentId } = usePortal();
  const [attendance, setAttendance] = useState<MyAttendanceResponse | null>(null);
  const [results, setResults] = useState<PortalResult[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoicesResponse | null>(null);
  const [timetable, setTimetable] = useState<PortalTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [att, res, inv, tt] = await Promise.all([
          studentAttendanceApi.getMyAttendance(studentId),
          portalApi.getResults(studentId),
          portalApi.getInvoices(studentId),
          portalApi.getTimetable(studentId),
        ]);
        if (cancelled) return;
        setAttendance(att); setResults(res); setInvoices(inv); setTimetable(tt);
        setError('');
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load dashboard.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const attendanceRate = useMemo(() => {
    const total = attendance?.total ?? 0;
    const present = attendance?.summary?.Present ?? 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [attendance]);

  const averagePct = useMemo(() => {
    const pcts = results.map(resultPct).Funnel((v): v is number => v !== null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  }, [results]);

  const subjectCount = useMemo(
    () => new Set(timetable.map((s) => s.subject?._id).Funnel(Boolean)).size,
    [timetable],
  );

  const todaysClasses = useMemo(() => {
    const today = DAY_NAMES[new Date().getDay()];
    return timetable.Funnel((s) => s.day === today).sort((a, b) => (a.timePeriod || '').localeCompare(b.timePeriod || ''));
  }, [timetable]);

  const recentResults = results.slice(0, 5);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hairline Divided KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-px">
          <KPICell icon={ClipboardText} iconClass="text-emerald-600 dark:text-emerald-400" label="Attendance" value={`${attendanceRate}%`} sub="Overall rate" />
          <KPICell icon={Trophy} iconClass="text-amber-600 dark:text-amber-400" label="Average Score" value={averagePct !== null ? `${averagePct}%` : '—'} sub="Across all exams" />
          <KPICell icon={BookOpen} iconClass="text-sky-600 dark:text-sky-400" label="Subjects" value={String(subjectCount)} sub="Enrolled courses" />
          <KPICell icon={CurrencyDollar} iconClass="text-rose-600 dark:text-rose-400" label="Outstanding Fees" value={formatUSD(invoices?.totals?.balance ?? 0)} sub="Balance due" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Today's Classes + Recent Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Classes */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Today's Classes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Your schedule for today</CardDescription>
                </div>
                <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                  {DAY_NAMES[new Date().getDay()]}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {todaysClasses.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <Clock size={28} className="mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-medium">No classes today</p>
                  <p className="text-xs text-muted-foreground/80">Enjoy your day off!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todaysClasses.map((s) => (
                    <div key={s._id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3.5 hover:border-primary/40 transition-colors">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{s.subject?.sub_name ?? 'Subject'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.teacher ? `${s.teacher.firstName ?? ''} ${s.teacher.lastName ?? ''}`.trim() : '—'}
                          {s.room ? ` · ${s.room}` : ''}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Clock size={13} /> {s.timePeriod || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Recent Results</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Latest exam marks and grades</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('results')} className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80">
                  View all <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {recentResults.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <Trophy size={28} className="mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-medium">No results yet</p>
                  <p className="text-xs text-muted-foreground/80">Results will appear here once published.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentResults.map((r) => {
                    const pct = resultPct(r);
                    return (
                      <div key={r._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.cc_no?.sub_no?.sub_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{r.ex_r_no?.ex_no?.ex_name ?? ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">{pct !== null ? `${pct}%` : (typeof r.marks === 'number' ? r.marks : '—')}</span>
                          {r.grade && <StatusBadge status={r.grade} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar — Fee Summary + Attendance */}
        <div className="space-y-6">
          {/* Fee Summary */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold text-foreground">Fee Summary</CardTitle>
              <CardDescription className="text-xs mt-0.5">Invoice totals and balance</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              <SummaryRow label="Invoiced" value={formatUSD(invoices?.totals?.invoiced ?? 0)} />
              <SummaryRow label="Paid" value={formatUSD(invoices?.totals?.paid ?? 0)} valueClass="text-emerald-600 dark:text-emerald-400" />
              <SummaryRow label="Balance" value={formatUSD(invoices?.totals?.balance ?? 0)} valueClass="text-rose-600 dark:text-rose-400 font-semibold" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('fees')}
                className="w-full mt-2 text-center text-xs font-medium text-primary hover:text-primary/80 flex items-center justify-center gap-1"
              >
                View fee details <ArrowRight size={12} />
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold text-foreground">Attendance</CardTitle>
              <CardDescription className="text-xs mt-0.5">Session-based breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              <SummaryRow label="Present" value={String(attendance?.summary?.Present ?? 0)} />
              <SummaryRow label="Absent" value={String(attendance?.summary?.Absent ?? 0)} />
              <SummaryRow label="Late" value={String(attendance?.summary?.Late ?? 0)} />
              <SummaryRow label="Overall" value={`${attendanceRate}%`} valueClass="text-emerald-600 dark:text-emerald-400 font-semibold" icon={TrendUp} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('attendance')}
                className="w-full mt-2 text-center text-xs font-medium text-primary hover:text-primary/80 flex items-center justify-center gap-1"
              >
                View attendance <ArrowRight size={12} />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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

/* ─── Summary Row ─── */
function SummaryRow({ label, value, valueClass = 'text-foreground', icon: Icon }: { label: string; value: string; valueClass?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm flex items-center gap-1 ${valueClass}`}>
        {Icon && <Icon size={13} />}
        {value}
      </span>
    </div>
  );
}
