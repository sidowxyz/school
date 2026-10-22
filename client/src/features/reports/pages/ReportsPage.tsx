import { useCallback, useEffect, useMemo, useState } from 'react';
import { CaretRight, ChartBar, SquaresFour, SpinnerGap } from '@phosphor-icons/react';

import PageHeader from '../../../components/common/PageHeader';
import { useAuth } from '../../../hooks/useAuth';
import ReportFilters, { type FilterValues } from '../components/ReportFilters';
import ReportViewer from '../components/ReportViewer';
import ManagementDashboard from '../components/ManagementDashboard';
import { reportsApi } from '../api/reportsApi';
import type { ReportDepartment, ReportResult, ReportSummaryItem } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Synthetic client-side id for the Management Dashboard tab. Not a real
// server department — flags a code path that renders the tiles component
// instead of a report from the catalogue.
const DASHBOARD_ID = 'management-dashboard';

export default function ReportsPage() {
  const { role } = useAuth();
  const canSeeDashboard = role === 'admin' || role === 'principal';

  const [departments, setDepartments] = useState<ReportDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [selected, setSelected] = useState<ReportSummaryItem | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const [report, setReport] = useState<ReportResult | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The catalogue is already filtered to this role server-side, so whatever
  // arrives is what this user may run.
  useEffect(() => {
    reportsApi
      .getCatalog()
      .then((data) => {
        setDepartments(data);
        // Land on the Dashboard tab for admin / principal; otherwise open
        // the first real department they can see.
        setDepartmentId(canSeeDashboard ? DASHBOARD_ID : data[0]?.id ?? '');
      })
      .catch(() => setError('Failed to load the report catalogue.'))
      .finally(() => setLoadingCatalog(false));
  }, [canSeeDashboard]);

  const department = departments.find((d) => d.id === departmentId) ?? null;

  const runReport = useCallback(
    (definition: ReportSummaryItem, values: FilterValues) => {
      setRunning(true);
      setError(null);
      reportsApi
        .run(definition.id, values)
        .then(setReport)
        .catch((err) =>
          setError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Failed to run that report.',
          ),
        )
        .finally(() => setRunning(false));
    },
    [],
  );

  const openReport = useCallback((definition: ReportSummaryItem) => {
    // Seed any Funnel that declares a default so the first run is meaningful.
    const defaults: FilterValues = {};
    for (const Funnel of definition.filters) {
      if (Funnel.default !== undefined) defaults[Funnel.key] = Funnel.default;
    }
    setSelected(definition);
    setFilterValues(defaults);
    setReport(null);
    runReport(definition, defaults);
  }, [runReport]);

  const onFiltersChange = (values: FilterValues) => {
    setFilterValues(values);
    if (selected) runReport(selected, values);
  };

  // Drill-through from a Management Dashboard tile: find the report id
  // anywhere in the catalogue, switch to its department, and open it.
  const drillToReport = useCallback((reportId: string) => {
    for (const dept of departments) {
      for (const group of dept.groups) {
        const found = group.reports.find((r) => r.id === reportId);
        if (found) {
          setDepartmentId(dept.id);
          openReport(found);
          return;
        }
      }
    }
    // Not in the catalogue for this role — surface it clearly rather than
    // silently doing nothing.
    setError(
      `Cannot open that report — it is not in your reporting catalogue. ` +
        `The dashboard tile pointed at "${reportId}".`,
    );
  }, [departments, openReport]);

  const totalReports = useMemo(
    () => departments.reduce((sum, d) => sum + d.report_count, 0),
    [departments],
  );

  if (loadingCatalog) {
    return (
      <div className="py-24 flex items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canSeeDashboard && departments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" subtitle="Departmental reporting" />
        <Card className="p-16 text-center">
          <h3 className="text-base font-semibold text-foreground">No reports available for your role</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Reports are grouped by department. Your role does not currently have a reporting
            department assigned to it.
          </p>
        </Card>
      </div>
    );
  }

  const showingDashboard = departmentId === DASHBOARD_ID;
  const tabCount = departments.length + (canSeeDashboard ? 1 : 0);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Reports & Analytics"
        subtitle={
          canSeeDashboard
            ? `${totalReports} report${totalReports === 1 ? '' : 's'} across ${departments.length} department${departments.length === 1 ? '' : 's'} · plus the Management Dashboard`
            : `${totalReports} report${totalReports === 1 ? '' : 's'} across ${departments.length} department${departments.length === 1 ? '' : 's'}`
        }
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Tab switcher — Dashboard first for management roles, then real departments. */}
      {tabCount > 1 && (
        <div className="bg-muted/60 border border-border rounded-xl p-1.5 flex gap-1 print:hidden overflow-x-auto">
          {canSeeDashboard && (
            <Button
              variant={showingDashboard ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setDepartmentId(DASHBOARD_ID);
                setSelected(null);
                setReport(null);
                setError(null);
              }}
              className={`flex-1 min-w-[120px] py-2 text-xs font-semibold rounded-lg transition inline-flex items-center justify-center gap-2 ${
                showingDashboard ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SquaresFour className="h-4 w-4" />
              Dashboard
            </Button>
          )}
          {departments.map((d) => (
            <Button
              variant={departmentId === d.id ? 'secondary' : 'ghost'}
              size="sm"
              key={d.id}
              onClick={() => {
                setDepartmentId(d.id);
                setSelected(null);
                setReport(null);
                setError(null);
              }}
              className={`flex-1 min-w-[120px] py-2 text-xs font-semibold rounded-lg transition inline-flex items-center justify-center gap-1.5 ${
                departmentId === d.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{d.name}</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                {d.report_count}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {showingDashboard ? (
        <ManagementDashboard onDrillTo={drillToReport} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* Report index */}
          <Card className="overflow-hidden print:hidden lg:sticky lg:top-4">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <h2 className="text-sm font-semibold text-foreground">{department?.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{department?.description}</p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-2">
              {department?.groups.map((group) => (
                <div key={group.name} className="mb-2">
                  <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.name}
                  </p>
                  {group.reports.map((definition) => (
                    <Button
                      variant={selected?.id === definition.id ? 'secondary' : 'ghost'}
                      size="sm"
                      key={definition.id}
                      onClick={() => openReport(definition)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 rounded-md transition ${
                        selected?.id === definition.id
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="truncate">{definition.title}</span>
                      <CaretRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Report surface */}
          <div className="space-y-5 min-w-0">
            {!selected ? (
              <Card className="p-16 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <ChartBar className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Choose a report</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Pick a report from {department?.name} on the left. Each one reads live records and
                  can be filtered, searched and exported.
                </p>
              </Card>
            ) : (
              <>
                <ReportFilters
                  filters={selected.filters}
                  values={filterValues}
                  onChange={onFiltersChange}
                />

                {running ? (
                  <Card className="py-20 flex items-center justify-center">
                    <SpinnerGap className="h-7 w-7 animate-spin text-primary" />
                  </Card>
                ) : report ? (
                  <ReportViewer report={report} filters={filterValues} />
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
