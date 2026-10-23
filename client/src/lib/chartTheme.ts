import type { CSSProperties } from 'react';

// Recharts takes plain colour strings, so charts read the theme's CSS
// variables directly — that way they follow light/dark mode like the rest of
// the UI instead of hard-coding hex colours.

export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
  grid: 'hsl(var(--border))',
} as const;

/** Categorical series, in order, for pies and multi-series charts. */
export const CHART_SERIES = [
  CHART_COLORS.primary,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  'hsl(262 60% 58%)',
  'hsl(330 65% 58%)',
  CHART_COLORS.success,
];

export const CHART_TICK = { fontSize: 11, fill: CHART_COLORS.muted };

export const CHART_TOOLTIP: CSSProperties = {
  backgroundColor: 'hsl(var(--popover))',
  borderColor: 'hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
};
