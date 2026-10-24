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

import StatStrip from '@/components/shared/StatStrip';
import TimetableTab from '@/components/teaching-log/portal/TimetableTab';
import ClassesTab from '@/components/teaching-log/portal/ClassesTab';
import AttendanceTab from '@/components/teaching-log/portal/AttendanceTab';
import LessonsTab from '@/components/teaching-log/portal/LessonsTab';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';

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
    const completedCount = logs.filter((log) => log.status === 'completed').length;
    const draftCount = logs.filter((log) => log.status === 'draft').length;
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
      (sum, a) => sum + a.timetableSlots.filter((s) => s.day === todayName).length, 0
    );
    const classCount = new Set(assignments.map((a) => a.classId?._id)).size;
    const subjectCount = new Set(assignments.map((a) => a.subjectId?._id)).size;
    return { todaysPeriods, classCount, subjectCount };
  }, [assignments]);

  const filterOptions = useMemo(() => ({
    classes: [...new Set(assignments.map((assignment) => assignment.classId?.cl_name).filter(Boolean))].sort(),
    subjects: [...new Set(assignments.map((assignment) => assignment.subjectId?.sub_name).filter(Boolean))].sort(),
  }), [assignments]);

  const hasActiveFilters = Object.entries(filters)
    .some(([key, val]) => key !== 'teacherId' && val !== undefined && val !== '');
  const displayName = teacherName || user?.name || 'Teacher';
  const initials = displayName
    .split(' ').filter(Boolean).map((p) => p[0]?.toUpperCase()).slice(0, 2).join('') || 'T';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={teacherName ? `${teacherName}'s Teaching Logs` : 'Teaching Logs'}
        subtitle={readOnly
          ? 'Their timetable, classes, lessons and daily logs.'
          : 'Your timetable, classes, lessons and daily logs.'}
        action={
        <>
          {!readOnly && <Button variant="default"
            onClick={() => navigate('/teaching-log/create')}
          >
            <Plus size={16} /> Add New Log
          </Button>}
          <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-info flex items-center justify-center text-info-foreground text-xs font-bold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground leading-tight capitalize">{readOnly ? 'Teacher portal' : (user?.role || 'teacher')}</p>
            </div>
          </div>
        </>
        }
      />

      {/* Overview stat cards */}
      <StatStrip items={[
        { label: "Today's periods", value: assignmentStats.todaysPeriods, icon: CalendarBlank, tone: 'sky', hint: 'Scheduled today' },
        { label: 'Classes', value: assignmentStats.classCount, icon: Users, tone: 'emerald', hint: 'Classes taught' },
        { label: 'Subjects', value: assignmentStats.subjectCount, icon: Stack, tone: 'violet', hint: 'Subjects taught' },
        { label: 'Total logs', value: logStats.totalLogs, icon: BookOpen, tone: 'amber', hint: 'All teaching logs' },
        { label: 'Drafts', value: logStats.draftLogs, icon: FileText, tone: 'muted', hint: 'Awaiting completion' },
        { label: 'Subjects logged', value: logStats.subjectsCount, icon: ChartPie, tone: 'sky', hint: 'Curriculum areas covered' },
      ]} />

      {/* Tab bar: same look as the shared Tabs, pastel blue for the open tab. */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 sm:grid-cols-3 lg:grid-cols-5">
        {visibleTabs.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <Button variant="plain"
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                active
                  ? 'bg-tile-blue font-semibold text-tile-foreground'
                  : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={15} />
              <span className="truncate">{t.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Tab content */}
      {assignmentsError && tab !== 'logs' && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
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
                  ? 'No teaching logs match your filter criteria. Try clearing filters or altering search terms.'
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
            className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-destructive">
                <Trash size={18} /> Delete Teaching Log
              </h3>
              <Button variant="ghost" size="icon-sm"
                onClick={() => setDeleteTargetId(null)}
              >
                <X size={18} />
              </Button>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              Are you sure you want to delete this teaching log entry? This action is permanent and cannot be undone once synchronized with the backend server database.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="outline"
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive"
                onClick={handleDeleteConfirm}
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
