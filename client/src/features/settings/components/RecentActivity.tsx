import { useEffect, useState } from 'react';
import { ArrowRight, Clock, ClockCounterClockwise, SpinnerGap, ArrowsClockwise } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { auditLogsApi } from '../../audit-logs/api/auditLogsApi';
import type { AuditLog } from '../../audit-logs/types';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-8">
      <div><h2 className="text-2xl font-bold text-gray-900">Settings Audit</h2><p className="mt-1 text-sm text-gray-500">Recent live administrative actions recorded by the system.</p></div>
      <section className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div><h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3><p className="text-sm text-gray-500">Latest persisted audit records.</p></div>
          <div className="flex items-center gap-3"><Button variant="plain" type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh activity" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ArrowsClockwise size={16} className={loading ? 'animate-spin' : ''} /></Button><Button variant="plain" type="button" onClick={() => navigate('/audit-logs')} className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700">View All Logs<ArrowRight size={16} /></Button></div>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-500"><SpinnerGap size={18} className="animate-spin text-green-600" />Loading audit records…</div> : error ? <div className="p-8 text-center text-sm text-red-600">{error}</div> : logs.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">No audit activity has been recorded yet.</div> : <div className="divide-y">{logs.map((log) => <div key={log.id} className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50"><div className="flex min-w-0 items-center gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClockCounterClockwise size={20} /></div><div className="min-w-0"><h4 className="truncate font-semibold text-gray-900">{log.action}</h4><p className="truncate text-sm text-gray-500">{log.user} · {log.module}</p></div></div><div className="flex shrink-0 items-center gap-2 text-sm text-gray-500"><Clock size={15} />{new Date(log.timestamp).toLocaleString()}</div></div>)}</div>}
      </section>
    </div>
  );
}
