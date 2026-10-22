import { useEffect, useState } from 'react';
import {
  ChartPie, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, Target, ChartBar, Trophy } from '@phosphor-icons/react';

import StatStrip from '@/components/shared/StatStrip';
import { SkeletonTable } from '../shared/Skeleton';
import { resultsApi } from '../../api/resultsApi';
import { scopeParams } from '../../hooks/useResultScope';
import { gradeColor } from '../../data/gradeBands';
import type { ClassResults, ResultAnalytics } from '../../types';
import { Card } from '@/components/ui/card';

interface Props {
  scope: string;
  classId: string;
  /** Already-loaded class results, used to decide whether to show empty state. */
  results: ClassResults | null;
  loading: boolean;
}

export default function AnalyticsDashboard({ scope, classId, results, loading }: Props) {
  const [analytics, setAnalytics] = useState<ResultAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!scope || !classId) {
      setAnalytics(null);
      return;
    }

    let cancelled = false;
    setFetching(true);
    setError(null);

    resultsApi
      .getAnalytics({ ...scopeParams(scope), class_id: classId })
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load analytics.');
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, classId]);

  if (loading || fetching) return <SkeletonTable rows={6} />;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm font-medium text-destructive">
        {error}
      </div>
    );
  }

  // Nothing is invented when no marks have been published
  if (!analytics || !results?.results.length) {
    return (
      <Card className="border-border/80 shadow-xs p-12 sm:p-16 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5 ring-1 ring-border/60">
          <ChartBar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No published results yet</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
          Analytics appear once teachers have entered marks for this examination and an academic officer has published them.
        </p>
      </Card>
    );
  }

  const { summary, gradeDistribution, subjectAverages, passFailTrend } = analytics;
  const dist = gradeDistribution.map((d) => ({
    name: d.grade,
    value: d.count,
    color: gradeColor(d.grade),
  }));
  const totalGraded = dist.reduce((a, d) => a + d.value, 0) || 1;

  return (
    <div className="space-y-6">
      {/* 4 Soft Stat cards */}
      <StatStrip
        items={[
          { label: 'Total students', value: `${summary.total}`, icon: Users, tone: 'sky' },
          { label: 'Pass percentage', value: `${summary.passPercentage}%`, icon: Target, tone: 'emerald' },
          { label: 'Class average', value: `${summary.classAverage}%`, icon: ChartBar, tone: 'violet' },
          { label: 'Highest score', value: `${summary.highest}%`, icon: Trophy, tone: 'amber' },
        ]}
      />

      {/* Distribution + subject averages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border/80 shadow-xs p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Grade Distribution</h3>
          {dist.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">No graded results yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <ChartPie>
                  <Pie
                    data={dist}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) =>
                      `${name} (${Math.round(((value as number) / totalGraded) * 100)}%)`
                    }
                    labelLine={false}
                  >
                    {dist.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v} students`, 'Count']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                </ChartPie>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border/60">
                {dist.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="border-border/80 shadow-xs p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Subject-wise Average Performance</h3>
          {subjectAverages.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">No subject marks published yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectAverages} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.7)" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Average']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar
                  dataKey="averagePercentage"
                  name="Average %"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Pass/Fail trend */}
      <Card className="border-border/80 shadow-xs p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Pass / Fail Trend Analysis</h3>
        {passFailTrend.length < 2 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            A trend appears once this class has published results for more than one examination.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={passFailTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.7)" />
              <XAxis dataKey="exam" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                formatter={(v: number, n: string) => [`${v}%`, n === 'pass' ? 'Pass' : 'Fail']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: '8px' }} />
              <Area type="monotone" dataKey="pass" name="Pass %" stroke="#10b981" strokeWidth={2} fill="url(#passGrad)" />
              <Area type="monotone" dataKey="fail" name="Fail %" stroke="#ef4444" strokeWidth={2} fill="url(#failGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
