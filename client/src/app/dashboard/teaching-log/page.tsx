import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, FileText, ChartPie, Trash, X, CalendarBlank, Users, BookOpen, NotePencil, ClipboardText, Stack } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import TeachingLogTable from '@/components/teaching-log/TeachingLogTable';
import TeachingLogFilters from '@/components/teaching-log/TeachingLogFilters';
import LoadingSkeleton from '@/components/teaching-log/LoadingSkeleton';
import EmptyState from '@/components/teaching-log/EmptyState';
import { useTeachingLogs } from '@/hooks/useTeachingLogs';
import { useAuth } from '@/hooks/useAuth';
import { teachersApi } from '@/features/teachers/api/teachersApi';
import type { TeacherAssignment } from '@/features/teachers/types';

import { StatCard } from '@/components/teaching-log/portal/portalData';
import TimetableTab from '@/components/teaching-log/portal/TimetableTab';
import ClassesTab from '@/components/teaching-log/portal/ClassesTab';
import AttendanceTab from '@/components/teaching-log/portal/AttendanceTab';
import LessonsTab from '@/components/teaching-log/portal/LessonsTab';
import { Button } from '@/components/ui/button';

type TabId = 'logs' | 'timetable' | 'classes' | 'attendance' | 'lessons';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'logs',       label: 'Teaching Logs',  icon: NotePencil },
  { id: 'timetable',  label: 'My Timetable',   icon: CalendarBlank },
  { id: 'classes',    label: 'My Classes',     icon: Users },
  { id: 'attendance', label: 'Mark Attendance', icon: ClipboardText },
  { id: 'lessons',    label: 'Register Lesson', icon: FileText },
];

export default function TeachingLogPage({
  teacherId,
  teacherName,
  readOnly = false,
}: {
  teacherId?: string;
  teacherName?: string;
  readOnly?: boolean;
} = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logScope = useMemo(() => (teacherId ? { teacherId } : {}), [teacherId]);
  const visibleTabs = useMemo(() => TABS.map((item) => {
    if (!readOnly) return item;
    if (item.id === 'attendance') return { ...item, label: 'Attendance' };
    if (item.id === 'lessons') return { ...item, label: 'Lessons' };
    return item;
  }), [readOnly]);

  // Active tab
  const [tab, setTab] = useState<TabId>('logs');

  // My assignments (real data: classes/subjects/timetable admin assigned)
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      setAssignments(await teachersApi.getTimetable(teacherId || 'me'));
    } catch (err: any) {
      setAssignments([]);
      setAssignmentsError(err?.response?.data?.message || 'Unable to load your assigned timetable.');
    } finally {
      setAssignmentsLoading(false);
    }
  }, [teacherId]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // Teaching logs state (existing CRUD)
  const {
    logs,
    total,
    page,
    limit,
    filters,
    loading,
    setPage,
    updateFilters,
    resetFilters,
    deleteLog,
  } = useTeachingLogs(logScope, 1, 10);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteLog(deleteTargetId);
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Deletion error:', err);
    }
  };

  // Log stats
  const logStats = useMemo(() => {
    const completedCount = logs.Funnel((log) => log.status === 'completed').length;
    const draftCount = logs.Funnel((log) => log.status === 'draft').length;
    const uniqueSubjects = new Set(logs.map((log) => log.subject)).size;
    return {
      totalLogs: total,
      completedLogs: completedCount,
      draftLogs: draftCount,
      subjectsCount: uniqueSubjects,
    };
  }, [logs, total]);

  // Assignment stats (real: what admin actually assigned this teacher)
  const assignmentStats = useMemo(() => {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaysPeriods = assignments.reduce(
      (sum, a) => sum + a.timetableSlots.Funnel((s) => s.day === todayName).length, 0
    );
    const classCount = new Set(assignments.map((a) => a.classId?._id)).size;
    const subjectCount = new Set(assignments.map((a) => a.subjectId?._id)).size;
    return { todaysPeriods, classCount, subjectCount };
  }, [assignments]);

  const filterOptions = useMemo(() => ({
    classes: [...new Set(assignments.map((assignment) => assignment.classId?.cl_name).Funnel(Boolean))].sort(),
    subjects: [...new Set(assignments.map((assignment) => assignment.subjectId?.sub_name).Funnel(Boolean))].sort(),
  }), [assignments]);

  const hasActiveFilters = Object.entries(filters)
    .some(([key, val]) => key !== 'teacherId' && val !== undefined && val !== '');
  const displayName = teacherName || user?.name || 'Teacher';
  const initials = displayName
    .split(' ').Funnel(Boolean).map((p) => p[0]?.toUpperCase()).slice(0, 2).join('') || 'T';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{teacherName ? `${teacherName}'s Teacher Portal` : 'Teaching Log'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {readOnly
              ? 'Review this teacher’s schedule, classes, attendance context, lessons, and daily logs'
              : 'Your complete teaching workspace — schedule, classes, attendance, lessons and daily logs'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!readOnly && <Button variant="plain"
            onClick={() => navigate('/teaching-log/create')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} /> Add New Log
          </Button>}
          <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
              <p className="text-xs text-gray-400 leading-tight capitalize">{readOnly ? 'Teacher portal' : (user?.role || 'teacher')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Today's Periods"  value={String(assignmentStats.todaysPeriods)} sub="Periods scheduled today" icon={CalendarBlank} accent="blue" />
        <StatCard title="Classes Teaching" value={String(assignmentStats.classCount)}    sub="Different classes"       icon={Users}        accent="green" />
        <StatCard title="Subjects Teaching" value={String(assignmentStats.subjectCount)} sub="Different subjects"      icon={Stack}       accent="purple" />
        <StatCard title="Total Logs"       value={String(logStats.totalLogs)}            sub="All teaching logs"       icon={BookOpen}     accent="orange" />
        <StatCard title="Draft Lessons"    value={String(logStats.draftLogs)}     sub="Awaiting completion"      icon={FileText} accent="slate" />
        <StatCard title="Subjects Logged"  value={String(logStats.subjectsCount)} sub="Different curriculum areas" icon={ChartPie} accent="indigo" />
      </div>

      {/* Tab bar */}
      <div className="bg-gray-100/80 border border-gray-100 rounded-xl p-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
        {visibleTabs.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <Button variant="plain"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
              }`}
            >
              <Icon size={15} className={active ? 'text-green-600' : 'text-gray-400'} />
              <span className="truncate">{t.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Tab content */}
      {assignmentsError && tab !== 'logs' && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>{assignmentsError}</span>
          <Button variant="plain" onClick={loadAssignments} className="font-semibold hover:underline">Try again</Button>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-6">
          {/* Filters */}
          <TeachingLogFilters
            filters={filters}
            onFilterChange={updateFilters}
            onReset={resetFilters}
            classOptions={filterOptions.classes}
            subjectOptions={filterOptions.subjects}
          />

          {/* Table / Loading / Empty */}
          {loading ? (
            <LoadingSkeleton />
          ) : logs.length === 0 ? (
            <EmptyState
              message={
                hasActiveFilters
                  ? 'No teaching logs match your Funnel criteria. Try clearing filters or altering MagnifyingGlass terms.'
                  : readOnly
                    ? 'This teacher has not recorded any daily lesson logs yet.'
                    : 'There are no daily lesson logs recorded yet. Click Add New Log to register your first lesson!'
              }
              hasFilters={hasActiveFilters}
              onClearFilters={resetFilters}
            />
          ) : (
            <TeachingLogTable
              logs={logs}
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onDeleteClick={(id) => setDeleteTargetId(id)}
              readOnly={readOnly}
            />
          )}
        </div>
      )}

      {tab === 'timetable'  && <TimetableTab assignments={assignments} loading={assignmentsLoading} />}
      {tab === 'classes'    && <ClassesTab assignments={assignments} loading={assignmentsLoading} />}
      {tab === 'attendance' && <AttendanceTab assignments={assignments} assignmentsLoading={assignmentsLoading} readOnly={readOnly} />}
      {tab === 'lessons'    && (
        <LessonsTab
          assignments={assignments}
          lessons={logs}
          assignmentsLoading={assignmentsLoading}
          lessonsLoading={loading}
          readOnly={readOnly}
        />
      )}

      {/* Delete confirmation modal */}
      {!readOnly && deleteTargetId && (
        <div
          className="fixed inset-0 school-overlay z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-red-700">
                <Trash size={18} /> Delete Teaching Log
              </h3>
              <Button variant="plain"
                onClick={() => setDeleteTargetId(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 p-1 cursor-pointer"
              >
                <X size={18} />
              </Button>
            </div>

            <p className="text-sm text-gray-650 leading-relaxed mb-6">
              Are you sure you want to delete this teaching log entry? This action is permanent and cannot be undone once synchronized with the backend server database.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="plain"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </Button>
              <Button variant="plain"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Delete Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
