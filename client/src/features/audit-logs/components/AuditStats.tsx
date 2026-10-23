import { FileText, CalendarBlank, Users, ShieldWarning } from '@phosphor-icons/react';
import StatStrip from '@/components/shared/StatStrip';
import type { AuditLog } from '../types';

export default function AuditStats({ logs }: { logs: AuditLog[] }) {
  const today = new Date().toDateString();
  const todayLogs = logs.filter((log) => new Date(log.timestamp).toDateString() === today).length;
  const activeUsers = new Set(logs.map((log) => log.user)).size;
  const failedActions = logs.filter((log) => log.status === 'Failed').length;

  return (
    <StatStrip items={[
      { label: 'Total logs', value: logs.length, icon: FileText, tone: 'sky', hint: 'Recorded actions' },
      { label: "Today's logs", value: todayLogs, icon: CalendarBlank, tone: 'emerald', hint: 'Since midnight' },
      { label: 'Active users', value: activeUsers, icon: Users, tone: 'violet', hint: 'Distinct people in these logs' },
      { label: 'Failed actions', value: failedActions, icon: ShieldWarning, tone: 'rose', hint: 'Denied or errored' },
    ]} />
  );
}
