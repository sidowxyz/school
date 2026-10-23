import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'info' | 'warning' | 'destructive' | 'primary' | 'neutral';

// One vocabulary for every module: attendance, fees and workflow states
// all resolve to the same five colours.
const TONES: Record<string, StatusTone> = {
  active: 'success', present: 'success', 'on time': 'success', paid: 'success',
  returned: 'success', graded: 'success', published: 'success', completed: 'success',
  approved: 'success', verified: 'success', a: 'success', 'a+': 'success',

  submitted: 'info', excused: 'info', graduated: 'info', 'fine paid': 'info',
  scheduled: 'info', 'in progress': 'info', ongoing: 'info', b: 'info', 'b+': 'info',

  late: 'warning', pending: 'warning', due: 'warning', 'due soon': 'warning',
  partial: 'warning', 'partially paid': 'warning', retained: 'warning',
  suspended: 'warning', warning: 'warning', c: 'warning', d: 'warning',

  absent: 'destructive', overdue: 'destructive', unpaid: 'destructive', failed: 'destructive',
  rejected: 'destructive', cancelled: 'destructive', expelled: 'destructive', f: 'destructive',

  holiday: 'primary',
  transferred: 'neutral', draft: 'neutral', weekend: 'neutral', inactive: 'neutral',
};

const STYLES: Record<StatusTone, { pill: string; dot: string }> = {
  success:     { pill: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  info:        { pill: 'bg-info/10 text-info border-info/20', dot: 'bg-info' },
  warning:     { pill: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  destructive: { pill: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  primary:     { pill: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary' },
  neutral:     { pill: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground/60' },
};

export function statusTone(status: string): StatusTone {
  return TONES[(status || '').trim().toLowerCase().replace(/_/g, ' ')] ?? 'neutral';
}

interface Props {
  status: string;
  /** Overrides the colour picked from the status text. */
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ status, tone, className }: Props) {
  const style = STYLES[tone ?? statusTone(status)];
  const label = (status || 'Unknown').replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        label === label.toLowerCase() && 'capitalize',
        style.pill,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
      {label}
    </span>
  );
}

export default StatusBadge;
