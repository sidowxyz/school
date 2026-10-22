import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CaretRight, CurrencyDollar, GraduationCap, SpinnerGap, ArrowsClockwise, UserCheck, Users } from '@phosphor-icons/react';

import { reportsApi } from '../api/reportsApi';
import type { ManagementMetric, ManagementSummary, ManagementTile } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
  /**
   * Called when a metric's drill-down is triggered — the parent maps the
   * `reportId` to the detailed report and switches the page to it. Keeps the
   * dashboard oblivious to routing / report-viewer state.
   */
  onDrillTo: (reportId: string) => void;
}

const GROUP_ICONS: Record<string, typeof Users> = {
  Students: Users,
  'Academic Performance': GraduationCap,
  Attendance: UserCheck,
  Examinations: BookOpen,
  Finance: CurrencyDollar,
  Teachers: Users,
};

/**
 * Format one metric's value for display. `link` metrics show no value —
 * they exist only to open the underlying detailed report.
 */
function formatValue(metric: ManagementMetric): string {
  if (metric.format === 'link' || metric.value === null || metric.value === undefined) {
    return '—';
  }
  if (metric.format === 'money') {
    return `$${Number(metric.value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (metric.format === 'percent') {
    return `${metric.value}%`;
  }
  return String(metric.value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// A principal watching this page shouldn't stare at stale numbers. Auto-poll
// every 5 minutes; skip while the tab is hidden so a background window
// isn't hammering the aggregation endpoint. The manual Refresh button stays
// for when the user wants a fresh read without waiting.
const AUTO_REFRESH_MS = 5 * 60 * 1000;

export default function ManagementDashboard({ onDrillTo }: Props) {
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Refreshing means "poll fired while data was already showing" — don't
  // replace the tiles with a spinner; keep the last good numbers on-screen
  // and just quietly update when the response lands.
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    reportsApi
      .getManagementSummary()
      .then(setSummary)
      .catch((err) => {
        // Only surface a background-poll failure once the current data ages
        // out of usefulness — otherwise a flaky wifi second would replace a
        // perfectly-good tile grid with a red banner.
        if (background) return;
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load the dashboard.',
        );
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      // Browsers throttle timers on hidden tabs anyway, but skipping the
      // request outright avoids a spike when the tab is un-hidden.
      if (document.visibilityState === 'visible') load(true);
    };
    const interval = window.setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
        <span>{error ?? 'No dashboard data.'}</span>
        <Button variant="plain"
          onClick={() => load(false)}
          className="shrink-0 px-3 py-1.5 border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Management Dashboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generated {new Date(summary.generatedAt).toLocaleString()} · click a tile to open the full report
          </p>
        </div>
        <Button variant="plain"
          onClick={() => load(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition"
        >
          <ArrowsClockwise size={13} className={refreshing ? 'animate-spin' : undefined} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {summary.tiles.map((tile) => (
          <TileCard key={tile.group} tile={tile} onDrillTo={onDrillTo} />
        ))}
      </div>
    </div>
  );
}

function TileCard({ tile, onDrillTo }: { tile: ManagementTile; onDrillTo: (id: string) => void }) {
  const Icon = GROUP_ICONS[tile.group] ?? Users;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{tile.group}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{tile.description}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {tile.metrics.map((metric) => {
          const value = formatValue(metric);
          const isPureLink = metric.format === 'link' || metric.value === null || metric.value === undefined;
          return (
            <Button variant="plain"
              key={`${tile.group}-${metric.label}`}
              onClick={() => onDrillTo(metric.drillTo)}
              className="w-full text-left flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{metric.label}</p>
                {isPureLink ? (
                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {metric.hint ?? 'Open detailed report'}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
                )}
                {!isPureLink && metric.hint && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{metric.hint}</p>
                )}
              </div>
              <CaretRight
                size={16}
                className="shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors"
              />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
