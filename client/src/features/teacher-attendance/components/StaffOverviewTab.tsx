import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, CheckCircle, SpinnerGap, UserMinus, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StatStrip from '@/components/shared/StatStrip';
import { CHART_TOOLTIP } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import { attendanceService, type StaffSummary } from '../../../services/attendance.service';
import { STATUS_STYLE, rateTone } from '../../attendance/statusStyles';

const RANGES = [7, 30, 90];

/** Today at a glance, the daily trend and who has missed the most days. */
export default function StaffOverviewTab({ onTakeAttendance }: { onTakeAttendance?: () => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<StaffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    attendanceService.getStaffSummary(days)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch(() => { if (!cancelled) setError('Could not load staff attendance.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  if (loading && !data) return <div className="flex justify-center py-20"><SpinnerGap size={28} className="animate-spin text-primary" /></div>;
  if (error && !data) return <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>;
  if (!data) return null;

  const t = data.today;
  const chart = data.daily.map((d) => ({ ...d, label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));

  return (
    <div className="space-y-5">
      <StatStrip items={[
        { label: 'At work today', value: t.total ? `${t.present + t.late}` : '—', icon: CheckCircle, tone: 'emerald', hint: t.total ? `${t.rate}% of those marked${t.late ? ` · ${t.late} late` : ''}` : 'Nothing marked yet today' },
        { label: 'Away today', value: t.absent + t.excused, icon: UserMinus, tone: 'rose', hint: t.excused ? `${t.excused} on leave` : 'No approved leave' },
        { label: 'Not marked', value: t.notMarked, icon: CalendarCheck, tone: 'sky', hint: `of ${data.staff} staff` },
        { label: `Last ${data.days} days`, value: data.period.total ? `${data.period.rate}%` : '—', icon: UsersThree, tone: 'violet', hint: 'At work, late included' },
      ]} />

      {data.staff > 0 && t.notMarked > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          <span>{t.notMarked} of {data.staff} staff have no attendance for today yet.</span>
          {onTakeAttendance && <Button size="sm" onClick={onTakeAttendance} className="h-8">Take attendance</Button>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="rounded-2xl border-border/70 shadow-none">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Attendance by day</CardTitle>
              <CardDescription className="text-xs">Share of staff at work (late included)</CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {RANGES.map((r) => (
                <Button key={r} variant="plain" type="button" onClick={() => setDays(r)}
                  className={cn('rounded-md px-3 py-1 text-xs font-medium', days === r ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                  {r} days
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chart.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No staff attendance in the last {data.days} days.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} minTickGap={12} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number | string) => [`${v}%`, 'At work']} />
                  <Bar dataKey="rate" radius={[6, 6, 6, 6]} maxBarSize={28} isAnimationActive={false}>
                    {chart.map((d) => <Cell key={d.date} fill={d.rate >= 90 ? 'hsl(var(--tile-green))' : d.rate >= 75 ? 'hsl(var(--tile-yellow))' : 'hsl(var(--tile-pink))'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Away or late today</CardTitle>
            <CardDescription className="text-xs">{data.awayToday.length ? 'Check classes are covered' : 'Everyone marked is in'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {data.awayToday.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nobody away or late.</p>
            ) : data.awayToday.map((s) => (
              <div key={s.teacherId} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.remarks || (s.time_in ? `Arrived ${s.time_in}` : 'No reason given')}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[s.status].pill)}>
                  {s.status === 'Excused' ? 'On leave' : s.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Most days missed</CardTitle>
          <CardDescription className="text-xs">Last {data.days} days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {data.mostAbsent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No absences recorded in this period.</p>
          ) : data.mostAbsent.map((s) => (
            <div key={s.teacherId} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted/60 sm:grid-cols-[1fr_140px_80px]">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.department || 'No department'}</p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">{s.absent} absent · {s.late} late</span>
              <span className={cn('text-right font-semibold tabular-nums', rateTone(s.rate))}>{s.rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
