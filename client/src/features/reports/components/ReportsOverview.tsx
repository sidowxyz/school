import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CurrencyDollar, GraduationCap, UserCheck, Users } from '@phosphor-icons/react';

import StatStrip from '../../../components/shared/StatStrip';
import { Card } from '@/components/ui/card';
import { reportsApi, type AdminKpis } from '../api/reportsApi';

const COLORS = ['hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--violet))', 'hsl(var(--destructive))'];
const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function Donut({
  title,
  subtitle,
  data,
  format,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number }[];
  format?: (n: number) => string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <Card className="rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {total === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => (format ? format(Number(v)) : String(v))} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

/** Headline numbers and charts above the report list. Admin-only data: renders nothing when unavailable. */
export default function ReportsOverview() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);

  useEffect(() => {
    reportsApi.getAdminKpis().then(setKpis).catch(() => setKpis(null));
  }, []);

  if (!kpis) return null;
  const { summary, attendanceOverview, studentDistribution, feeCollectionSummary } = kpis;

  return (
    <div className="space-y-4 print:hidden">
      <StatStrip
        items={[
          { label: 'Students', value: summary.totalStudents, icon: Users, tone: 'sky', hint: `${summary.totalClasses} classes` },
          { label: 'Teachers', value: summary.totalTeachers, icon: GraduationCap, tone: 'violet', hint: 'Active staff' },
          { label: 'Attendance rate', value: `${attendanceOverview.attendanceRate}%`, icon: UserCheck, tone: 'emerald', hint: 'This week' },
          {
            label: 'Fees collected',
            value: money(feeCollectionSummary.totalCollected),
            icon: CurrencyDollar,
            tone: 'amber',
            hint: `${money(feeCollectionSummary.totalPending)} outstanding`,
          },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Donut title="Students by class" subtitle="Enrolment distribution" data={studentDistribution} />
        <Donut
          title="Fee collection"
          subtitle="Collected vs outstanding"
          format={money}
          data={[
            { name: 'Collected', value: feeCollectionSummary.totalCollected },
            { name: 'Outstanding', value: feeCollectionSummary.totalPending },
          ]}
        />
        <Card className="rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground">Weekly attendance</h3>
          <p className="text-xs text-muted-foreground">Present vs absent by day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceOverview.weeklyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" fill={COLORS[0]} radius={[6, 6, 0, 0]} barSize={14} />
              <Bar dataKey="absent" fill={COLORS[4]} radius={[6, 6, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
