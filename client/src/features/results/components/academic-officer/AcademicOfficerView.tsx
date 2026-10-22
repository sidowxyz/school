import { useCallback, useEffect, useState } from 'react';
import { DownloadSimple, Table, SquaresFour, Trophy, CheckCircle } from '@phosphor-icons/react';

import FilterSelect from '@/components/shared/FilterSelect';
import AnalyticsDashboard from './AnalyticsDashboard';
import RankingsTab from './RankingsTab';
import ReportCardsTab from './ReportCardsTab';
import ApprovalsQueue from './ApprovalsQueue';
import { resultsApi } from '../../api/resultsApi';
import { scopeParams, useResultScope } from '../../hooks/useResultScope';
import type { ClassResults } from '../../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId = 'dashboard' | 'rankings' | 'report-cards' | 'approvals';

/** Ranked results as a CSV the officer can open in Excel. */
function downloadCsv(results: ClassResults, label: string) {
  const header = [
    'Rank',
    'Roll No',
    'Student',
    'Class',
    ...results.subjects.map((s) => `${s.name} (/${s.maxMarks})`),
    'Total',
    'Percentage',
    'Grade',
    'Result',
  ];

  const rows = results.results.map((r) => [
    r.rank,
    r.student.rollNo,
    r.student.name,
    r.student.className,
    ...results.subjects.map((s) => r.marks.find((m) => m.subjectId === s.subjectId)?.marks ?? ''),
    `${r.totalObtained}/${r.totalMax}`,
    `${r.percentage}%`,
    r.grade,
    r.isPass ? 'Pass' : 'Fail',
  ]);

  const escape = (value: unknown) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${label.replace(/[^\w-]+/g, '-')}-results.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AcademicOfficerView() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const scopeState = useResultScope();
  const { scope, setScope, scopeOptions, classId, setClassId, classOptions } = scopeState;

  const [results, setResults] = useState<ClassResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const canQuery = Boolean(scope && classId);

  const loadResults = useCallback(() => {
    if (!canQuery) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    resultsApi
      .getClassResults({ ...scopeParams(scope), class_id: classId })
      .then(setResults)
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false));
  }, [scope, classId, canQuery]);

  useEffect(loadResults, [loadResults]);

  // Drives the "Approvals (n)" badge — real submissions awaiting review.
  const refreshPending = useCallback(() => {
    resultsApi
      .listSubmissions({ status: 'submitted' })
      .then((list) => setPendingCount(list.length))
      .catch(() => setPendingCount(0));
  }, []);

  useEffect(refreshPending, [refreshPending]);

  const scopeLabel = scopeOptions.find((o) => o.value === scope)?.label ?? '';
  const className = classOptions.find((o) => o.value === classId)?.label ?? '';
  const hasResults = Boolean(results?.results.length);

  return (
    <div className="space-y-6">
      {/* Simplified Clean Header matching Dashboard */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Results & Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Examination metrics, academic rankings, and published student report cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => results && downloadCsv(results, `${scopeLabel}-${className}`)}
            disabled={!hasResults}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <DownloadSimple size={14} />
            Export Results
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setTab('report-cards')}
            disabled={!hasResults}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Table size={14} />
            Report Cards
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(val) => setTab(val as TabId)} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm sm:grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-2 rounded-lg py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary sm:text-sm">
            <SquaresFour className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="rankings" className="gap-2 rounded-lg py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary sm:text-sm">
            <Trophy className="h-4 w-4" />
            Rankings
          </TabsTrigger>
          <TabsTrigger value="report-cards" className="gap-2 rounded-lg py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary sm:text-sm">
            <Table className="h-4 w-4" />
            Report Cards
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2 rounded-lg py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary sm:text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Approvals</span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-500 px-1.5 py-0 text-[10px] font-bold text-white">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Card */}
      {tab !== 'approvals' && (
        <Card className="p-4 border-border/80 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-4">
            <FilterSelect
              label="Examination"
              value={scope}
              onChange={setScope}
              options={
                scopeOptions.length
                  ? scopeOptions
                  : [{ value: '', label: 'No examinations scheduled yet' }]
              }
              className="flex-1 sm:min-w-[260px]"
            />
            <FilterSelect
              label="Class"
              value={classId}
              onChange={setClassId}
              options={classOptions.length ? classOptions : [{ value: '', label: 'No classes yet' }]}
              className="flex-1 sm:min-w-[180px]"
            />
          </div>
        </Card>
      )}

      {(error || scopeState.error) && tab !== 'approvals' && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm font-medium text-destructive">
          {error ?? scopeState.error}
        </div>
      )}

      {tab === 'dashboard' && (
        <AnalyticsDashboard scope={scope} classId={classId} results={results} loading={loading} />
      )}
      {tab === 'rankings' && (
        <RankingsTab
          examName={scopeLabel}
          className={className}
          results={results}
          loading={loading}
        />
      )}
      {tab === 'report-cards' && (
        <ReportCardsTab
          examName={scopeLabel}
          results={results}
          loading={loading}
        />
      )}
      {tab === 'approvals' && <ApprovalsQueue onChanged={refreshPending} />}
    </div>
  );
}
