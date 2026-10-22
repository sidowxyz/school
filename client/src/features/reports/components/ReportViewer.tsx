import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, CaretDown, DownloadSimple, Table as TableIcon, FileText, SpinnerGap, Printer, MagnifyingGlass, Tray } from '@phosphor-icons/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { downloadCSV } from '../utils/csv';
import { reportsApi } from '../api/reportsApi';
import type { ReportCell, ReportResult } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface Props {
  report: ReportResult;
  /**
   * Filters as sent to `run` — needed so PDF/Excel export re-runs the same
   * scoped report the user is looking at, not the unfiltered default.
   */
  filters?: Record<string, string | number>;
}

const BAR_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#a855f7', '#ef4444'];

const formatCell = (value: ReportCell, type?: string): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'date') return new Date(String(value)).toLocaleDateString();
  // Amounts are stored as plain numbers; group them and always show cents so
  // finance columns line up when read down.
  if (type === 'money') {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
};

/** Renders any report — the shape is uniform, so the table is too. */
export default function ReportViewer({ report, filters }: Props) {
  const [search, setSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpen]);

  const rows = useMemo(() => {
    if (!search.trim()) return report.rows;
    const needle = search.toLowerCase();
    return report.rows.Funnel((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(needle)),
    );
  }, [report.rows, MagnifyingGlass]);

  const exportCsv = () => {
    downloadCSV(
      report.id,
      rows.map((row) =>
        Object.fromEntries(
          report.columns.map((column) => [column.label, formatCell(row[column.key], column.type)]),
        ),
      ),
    );
    setExportOpen(false);
  };

  const exportFile = async (format: 'pdf' | 'xlsx') => {
    setExportError(null);
    setExporting(format);
    try {
      // Ask the server to re-run the report with the same filters and stream
      // it back as the chosen format. Turning the blob into an <a download>
      // click is the standard way to trigger a browser DownloadSimple from an XHR.
      const blob = await reportsApi.export(report.id, format, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (err) {
      setExportError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not export this report.',
      );
    } finally {
      setExporting(null);
    }
  };

  const chartData = useMemo(() => {
    if (!report.chart) return [];
    return rows.map((row) => ({
      name: String(row[report.chart!.x] ?? ''),
      ...Object.fromEntries(report.chart!.series.map((key) => [key, Number(row[key] ?? 0)])),
    }));
  }, [rows, report.chart]);

  // A report with no columns is one that needs filters chosen first — its
  // single column carries the instruction.
  const needsFilters = report.columns.length === 1 && !report.columns[0].key;

  return (
    <div className="space-y-5">
      {/* Header — a coloured accent bar on top so the report card reads as
          a distinct document, not just another panel on the page. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
        <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                <CheckCircle size={12} /> Live data
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{report.description}</p>
            <p className="text-xs text-gray-400 mt-2">
              {report.group} · generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="plain"
              onClick={() => window.print()}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition print:hidden"
            >
              <Printer size={15} /> Print
            </Button>
            <div className="relative print:hidden" ref={exportMenuRef}>
              <Button variant="plain"
                onClick={() => setExportOpen((v) => !v)}
                disabled={rows.length === 0 || exporting !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition"
              >
                {exporting ? (
                  <SpinnerGap size={15} className="animate-spin" />
                ) : (
                  <DownloadSimple size={15} />
                )}
                Export
                <CaretDown size={14} className="opacity-80" />
              </Button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                  <Button variant="plain"
                    onClick={exportCsv}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"
                  >
                    <FileText size={14} className="text-gray-500" /> CSV
                    <span className="ml-auto text-[11px] text-gray-400">visible rows</span>
                  </Button>
                  <Button variant="plain"
                    onClick={() => exportFile('xlsx')}
                    disabled={exporting !== null}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <TableIcon size={14} className="text-green-600" /> Excel (.xlsx)
                    <span className="ml-auto text-[11px] text-gray-400">full report</span>
                  </Button>
                  <Button variant="plain"
                    onClick={() => exportFile('pdf')}
                    disabled={exporting !== null}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText size={14} className="text-red-500" /> PDF
                    <span className="ml-auto text-[11px] text-gray-400">full report</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {exportError && (
          <p className="mt-3 text-xs text-red-600">{exportError}</p>
        )}

        {report.summary.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mt-5 pt-5 border-t border-gray-100">
            {report.summary.map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 p-3 hover:border-green-200 hover:shadow-sm transition"
              >
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {needsFilters ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <h3 className="text-base font-semibold text-gray-800">More detail needed</h3>
          <p className="text-sm text-gray-500 mt-1">{report.columns[0].label}</p>
        </div>
      ) : (
        <>
          {report.chart && chartData.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Legend />
                  {report.chart.series.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={BAR_COLORS[i % BAR_COLORS.length]}
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
              <p className="text-sm text-gray-500">
                {rows.length} row{rows.length === 1 ? '' : 's'}
                {MagnifyingGlass && report.rows.length !== rows.length && ` of ${report.rows.length}`}
              </p>
              <div className="relative print:hidden">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={MagnifyingGlass}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search this report…"
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center text-center py-16">
                <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center text-green-500 mb-4">
                  <Tray size={26} />
                </div>
                <h4 className="text-base font-semibold text-gray-800">
                  {MagnifyingGlass ? 'Nothing matches that search' : 'No data for this report'}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {MagnifyingGlass
                    ? 'Try a different term, or clear the search.'
                    : 'Adjust the filters above, or check the underlying records exist.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <Table className="w-full text-sm">
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="text-left text-gray-600 border-b border-gray-200 bg-gray-50 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
                      {report.columns.map((column) => (
                        <TableHead
                          key={column.key}
                          className={`px-5 py-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap ${
                            column.type === 'number' || column.type === 'money' ? 'text-right' : ''
                          }`}
                        >
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow
                        key={index}
                        className={`border-b border-gray-50 last:border-0 transition-colors hover:bg-green-50/40 ${
                          index % 2 === 1 ? 'bg-gray-50/40' : ''
                        }`}
                      >
                        {report.columns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={`px-5 py-3 whitespace-nowrap ${
                              column.type === 'number' || column.type === 'money'
                                ? 'text-right tabular-nums text-gray-900 font-medium'
                                : 'text-gray-700'
                            }`}
                          >
                            {formatCell(row[column.key], column.type)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
