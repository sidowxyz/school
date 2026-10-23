import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarBlank, CheckSquareOffset, Clock, NotePencil, Plus, Stack } from '@phosphor-icons/react';
import { getTeacherDashboardData } from '../../../services/dashboardService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  DashboardColumns, DashboardError, DashboardHeader, DashboardLoading, DonutBreakdown, DotPill, KpiRow, KpiTile, Panel, PanelEmpty, PanelLink, QuickActions,
} from '../components/DashboardKit';
import { TILE_FILLS } from '../components/dashboardUtils';

interface TeacherDashboardData {
  summary: { classCount: number; subjectCount: number; totalLogs: number; completedLogs: number; draftLogs: number };
  todaySchedule: { subject: string; class: string; period?: string; startTime?: string; endTime?: string }[];
  recentLogs: { _id?: string; subject: string; classId: string; topicTaught: string; status: 'draft' | 'completed'; date: string }[];
}

// What a teacher with no classes or logs yet sees — real zeros, never sample data.
const EMPTY: TeacherDashboardData = {
  summary: { classCount: 0, subjectCount: 0, totalLogs: 0, completedLogs: 0, draftLogs: 0 },
  todaySchedule: [],
  recentLogs: [],
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTeacherDashboardData()
      .then((d) => setData(d || EMPTY))
      .catch(() => setError('Could not load your dashboard from the server.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLoading />;

  const { summary, todaySchedule, recentLogs } = data;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardError message={error} />

      <DashboardColumns
        main={<>
          <KpiRow>
            <KpiTile label="My classes" value={summary.classCount} fill="bg-tile-pink" icon={Stack}
              note={todaySchedule.length ? `${todaySchedule.length} lesson${todaySchedule.length === 1 ? '' : 's'} today` : 'No lessons today'} to="/timetable" />
            <KpiTile label="My subjects" value={summary.subjectCount} fill="bg-tile-yellow" icon={BookOpen}
              note="Subjects you teach" to="/timetable" />
            <KpiTile label="Teaching logs" value={summary.totalLogs} fill="bg-tile-blue" icon={NotePencil}
              note={`${summary.completedLogs} completed · ${summary.draftLogs} draft${summary.draftLogs === 1 ? '' : 's'}`} to="/teaching-log" />
          </KpiRow>

          <Panel title="Today's lessons" description={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            action={<PanelLink to="/timetable">Timetable</PanelLink>}>
            {todaySchedule.length === 0 ? (
              <PanelEmpty text="No lessons are scheduled for you today." />
            ) : (
              <ol className="relative space-y-3 border-l-2 border-dashed border-border pl-5">
                {todaySchedule.map((slot, i) => (
                  <li key={i} className="relative">
                    <span className={cn('absolute -left-[27px] top-3 h-3 w-3 rounded-full ring-4 ring-card', TILE_FILLS[i % TILE_FILLS.length])} />
                    <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-xl p-3.5 text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>
                      <div>
                        <p className="font-semibold">{slot.subject}</p>
                        <p className="text-xs opacity-75">{slot.class}{slot.period ? ` · ${slot.period}` : ''}</p>
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium dark:bg-white/10">
                        <Clock size={12} />
                        {slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : 'Time not set'}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Recent teaching logs" flush action={<PanelLink to="/teaching-log">View all</PanelLink>}>
            {recentLogs.length === 0 ? (
              <PanelEmpty text="You have not written any teaching logs yet." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="pl-6">Topic</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log, i) => (
                      <TableRow key={log._id ?? i} className={log._id ? 'cursor-pointer' : undefined}
                        onClick={log._id ? () => navigate(`/teaching-log/${log._id}`) : undefined}>
                        <TableCell className="max-w-[260px] pl-6"><p className="truncate font-medium">{log.topicTaught}</p></TableCell>
                        <TableCell className="text-sm">{log.subject}</TableCell>
                        <TableCell><span className="rounded-md bg-tile-blue px-2 py-0.5 text-xs font-medium text-tile-foreground">{log.classId}</span></TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {log.date ? new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </TableCell>
                        <TableCell className="pr-6"><DotPill tone={log.status === 'completed' ? 'success' : 'warning'}>{log.status}</DotPill></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </>}
        side={<>
          <QuickActions actions={[
            { label: 'New Log', icon: Plus, to: '/teaching-log/create' },
            { label: 'Attendance', icon: CheckSquareOffset, to: '/attendance' },
            { label: 'My Logs', icon: NotePencil, to: '/teaching-log' },
            { label: 'Timetable', icon: CalendarBlank, to: '/timetable' },
          ]} />

          <DonutBreakdown title="My teaching logs" description="Completed and still in draft"
            data={[
              { name: 'Completed', value: summary.completedLogs, color: 'hsl(var(--tile-green))' },
              { name: 'Draft', value: summary.draftLogs, color: 'hsl(var(--tile-yellow))' },
            ]}
            centerLabel="Logs" emptyText="No teaching logs yet." />
        </>}
      />
    </div>
  );
}
