import { useEffect, useState } from 'react';
import { ArrowRight, Clock, ClockCounterClockwise, SpinnerGap, ArrowsClockwise } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { auditLogsApi } from '../../audit-logs/api/auditLogsApi';
import type { AuditLog } from '../../audit-logs/types';
import { Button } from '@/components/ui/button';
import { SettingsHeading, SettingsSection } from './SettingsSection';

export default function RecentActivity() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setLogs((await auditLogsApi.list({ page: 1, limit: 8 })).logs);
    } catch {
      setError('Could not load the settings audit trail.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-5">
      <SettingsHeading title="Settings Audit" description="Recent live administrative actions recorded by the system." />
      <SettingsSection
        icon={ClockCounterClockwise}
        title="Recent Activity"
        description="Latest persisted audit records."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh activity" className="h-9 w-9 rounded-xl">
              <ArrowsClockwise size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="outline" type="button" onClick={() => navigate('/audit-logs')} className="h-9 gap-1.5 rounded-xl text-xs">
              View All Logs <ArrowRight size={14} />
            </Button>
          </div>
        }
        className="[&>div:last-child]:p-0"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <SpinnerGap size={18} className="animate-spin text-primary" />
            Loading audit records…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No audit activity has been recorded yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tile-blue text-tile-foreground">
                    <ClockCounterClockwise size={18} />
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-foreground">{log.action}</h4>
                    <p className="truncate text-xs text-muted-foreground">{log.user} · {log.module}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={14} />
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
