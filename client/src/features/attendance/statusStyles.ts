import type { AttendanceStatusName } from '../../services/attendance.service';

/** One look per status, used by the roster buttons, pills and report. */
export const STATUS_STYLE: Record<AttendanceStatusName, { short: string; on: string; off: string; pill: string }> = {
  Present: { short: 'P', on: 'bg-success text-success-foreground border-success', off: 'text-success border-success/30 hover:bg-success/10', pill: 'bg-success/10 text-success' },
  Absent: { short: 'A', on: 'bg-destructive text-destructive-foreground border-destructive', off: 'text-destructive border-destructive/30 hover:bg-destructive/10', pill: 'bg-destructive/10 text-destructive' },
  Late: { short: 'L', on: 'bg-warning text-warning-foreground border-warning', off: 'text-warning border-warning/30 hover:bg-warning/10', pill: 'bg-warning/10 text-warning' },
  Excused: { short: 'E', on: 'bg-info text-info-foreground border-info', off: 'text-info border-info/30 hover:bg-info/10', pill: 'bg-info/10 text-info' },
};

/** Green at 90%+, amber at 75%+, red below. */
export const rateTone = (rate: number) =>
  rate >= 90 ? 'text-success' : rate >= 75 ? 'text-warning' : 'text-destructive';

export const rateBar = (rate: number) =>
  rate >= 90 ? 'bg-success' : rate >= 75 ? 'bg-warning' : 'bg-destructive';
