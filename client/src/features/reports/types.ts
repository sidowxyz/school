// Reports domain types, mirroring /api/reports (server/src/reports/registry.js).
//
// Every report resolves to the same table shape, so one viewer renders any of
// them and one exporter serialises any of them.

export type FilterType =
  | 'class'
  | 'section'
  | 'subject'
  | 'exam-scope'
  | 'exam-period'
  | 'date'
  | 'number'
  | 'year'
  | 'fee-type'
  | 'payment-method'
  | 'book-category'
  // A generic dropdown with server-supplied options (see FILTERS.borrowStatus
  // and FILTERS.fineStatus in server/src/reports/helpers.js) — used when the
  // choices are a small fixed enum, not something fetched by id.
  | 'select';

export interface ReportFilter {
  key: string;
  label: string;
  type: FilterType;
  default?: string | number;
  /** Present when type === 'select'; ignored otherwise. */
  options?: { value: string; label: string }[];
}

export interface ReportSummaryItem {
  id: string;
  title: string;
  description: string;
  filters: ReportFilter[];
}

export interface ReportGroup {
  name: string;
  reports: ReportSummaryItem[];
}

export interface ReportDepartment {
  id: string;
  name: string;
  description: string;
  groups: ReportGroup[];
  report_count: number;
}

export interface ReportColumn {
  key: string;
  label: string;
  type?: 'number' | 'date' | 'money';
}

export type ReportCell = string | number | null;

export interface ReportChart {
  type: 'bar';
  x: string;
  series: string[];
}

export interface ReportResult {
  id: string;
  title: string;
  description: string;
  group: string;
  department: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, ReportCell>[];
  summary: { label: string; value: string | number }[];
  chart: ReportChart | null;
}

// Management Dashboard — summary tiles with drill-down references. Each
// metric's `drillTo` names a report id the client opens in the existing
// viewer, honouring the same role-based access as everything else.

export type ManagementMetricFormat = 'count' | 'money' | 'percent' | 'link';

export interface ManagementMetric {
  label: string;
  /** null when the tile is a pure drill-down (no summary number to show). */
  value: number | null;
  /** Optional secondary line under the value. */
  hint?: string;
  drillTo: string;
  format: ManagementMetricFormat;
}

export interface ManagementTile {
  group: string;
  description: string;
  metrics: ManagementMetric[];
}

export interface ManagementSummary {
  generatedAt: string;
  coverage: {
    currentMonthStart: string;
    newAdmissionWindowDays: number;
  };
  tiles: ManagementTile[];
}
