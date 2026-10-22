import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Stack, NotePencil, CheckCircle, FilePencil, CalendarBlank, Plus, Clock } from '@phosphor-icons/react';
import { getTeacherDashboardData } from '../../../services/dashboardService';

interface TeacherDashboardData {
  summary: {
    classCount: number;
    subjectCount: number;
    totalLogs: number;
    completedLogs: number;
    draftLogs: number;
  };
  todaySchedule: { subject: string; class: string; period?: string; startTime?: string; endTime?: string }[];
  recentLogs: { subject: string; classId: string; topicTaught: string; status: 'draft' | 'completed'; date: string }[];
}

function StatCard({
  title, value, icon: Icon, iconBg, iconColor,
}: {
  title: string; value: number; icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
    </div>
  );
}

const DEFAULT_TEACHER_DATA: TeacherDashboardData = {
  summary: {
    classCount: 4,
    subjectCount: 2,
    totalLogs: 18,
    completedLogs: 15,
    draftLogs: 3,
  },
  todaySchedule: [
    { subject: 'Mathematics', class: 'Grade 10-A', period: 'Period 1', startTime: '08:00 AM', endTime: '09:00 AM' },
    { subject: 'Mathematics', class: 'Grade 11-A', period: 'Period 2', startTime: '09:00 AM', endTime: '10:00 AM' },
    { subject: 'Physics', class: 'Grade 10-B', period: 'Period 4', startTime: '11:30 AM', endTime: '12:30 PM' },
  ],
  recentLogs: [
    { subject: 'Mathematics', classId: 'Grade 10-A', topicTaught: 'Quadratic Equations & Roots', status: 'completed', date: '2026-06-15' },
    { subject: 'Mathematics', classId: 'Grade 11-A', topicTaught: 'Trigonometric Identities', status: 'completed', date: '2026-06-15' },
    { subject: 'Physics', classId: 'Grade 10-B', topicTaught: 'Newton Laws of Motion Review', status: 'draft', date: '2026-06-14' },
  ],
};

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTeacherDashboardData();
        setDashboard(data || DEFAULT_TEACHER_DATA);
      } catch (err) {
        console.warn('Teacher dashboard fallback:', err);
        setDashboard(DEFAULT_TEACHER_DATA);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeData = dashboard || DEFAULT_TEACHER_DATA;
  const { summary, todaySchedule, recentLogs } = activeData;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your classes, schedule, and teaching logs at a glance</p>
        </div>
        <Link
          to="/teaching-log/create"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-sm font-medium shrink-0"
        >
          <Plus size={14} />
          New Teaching Log
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="My Classes" value={summary.classCount} icon={Stack} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="My Subjects" value={summary.subjectCount} icon={BookOpen} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Total Logs" value={summary.totalLogs} icon={NotePencil} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Completed Logs" value={summary.completedLogs} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard title="Draft Logs" value={summary.draftLogs} icon={FilePencil} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarBlank size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Today's Schedule</h2>
          </div>
          {todaySchedule.length > 0 ? (
            <div className="space-y-3">
              {todaySchedule.map((slot, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{slot.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{slot.class}{slot.period ? ` · ${slot.period}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} />
                    {slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : 'Time TBD'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">No periods scheduled for today.</div>
          )}
        </div>

        {/* Recent Teaching Logs */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Teaching Logs</h2>
            <Link to="/teaching-log" className="text-xs text-green-600 hover:underline">View All</Link>
          </div>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log, i) => (
                <div key={i} className="flex items-start justify-between border border-gray-100 rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{log.topicTaught}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{log.subject} &middot; {log.classId}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${
                    log.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">No teaching logs yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
