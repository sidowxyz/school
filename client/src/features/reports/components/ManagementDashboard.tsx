import { useCallback, useEffect, useState } from 'react';
import { CaretRight, CurrencyDollar, GraduationCap, SpinnerGap, ArrowsClockwise, UserCheck, Users } from '@phosphor-icons/react';

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
  Attendance: UserCheck,
  Finance: CurrencyDollar,
  Teachers: GraduationCap,
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
        <SpinnerGap size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
        <span>{error ?? 'No dashboard data.'}</span>
        <Button variant="plain"
          onClick={() => load(false)}
          className="shrink-0 px-3 py-1.5 border border-destructive/40 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/15 transition-colors"
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
          <h2 className="text-base font-semibold text-foreground">Management Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generated {new Date(summary.generatedAt).toLocaleString()} · click a tile to open the full report
          </p>
        </div>
        <Button variant="plain"
          onClick={() => load(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-60 transition"
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

const GROUP_TONES: Record<string, string> = {
  Students: 'bg-tile-blue',
  Attendance: 'bg-tile-green',
  Finance: 'bg-tile-yellow',
  Teachers: 'bg-tile-violet',
};

function TileCard({ tile, onDrillTo }: { tile: ManagementTile; onDrillTo: (id: string) => void }) {
  const Icon = GROUP_ICONS[tile.group] ?? Users;
  return (
    <div className={`rounded-2xl p-5 text-tile-foreground ${GROUP_TONES[tile.group] ?? 'bg-tile-pink'}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
          <Icon size={18} weight="bold" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{tile.group}</h3>
          <p className="mt-0.5 text-xs opacity-75">{tile.description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {tile.metrics.map((metric) => {
          const value = formatValue(metric);
          const isPureLink = metric.format === 'link' || metric.value === null || metric.value === undefined;
          return (
            <Button variant="plain"
              key={`${tile.group}-${metric.label}`}
              onClick={() => onDrillTo(metric.drillTo)}
              className="group flex w-full items-start justify-between gap-2 rounded-xl bg-white/60 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-sm dark:bg-white/10 dark:hover:bg-white/15"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium opacity-75">{metric.label}</p>
                {isPureLink ? (
                  <p className="mt-1 text-sm font-semibold">{metric.hint ?? 'Open detailed report'}</p>
                ) : (
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
                )}
                {!isPureLink && metric.hint && <p className="mt-0.5 text-[11px] opacity-70">{metric.hint}</p>}
              </div>
              <CaretRight size={14} weight="bold" className="mt-0.5 shrink-0 opacity-50 transition group-hover:opacity-100" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
