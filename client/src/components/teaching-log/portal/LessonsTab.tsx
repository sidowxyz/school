import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, SpinnerGap } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import type { TeacherAssignment } from '@/features/teachers/types';
import type { TeachingLog } from '@/types/teachingLog.types';
import {
  Select,
  teachingSessionLabel,
  teachingSessionsForDate,
  weekdayForDate,
} from './portalData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LessonsTab({
  assignments,
  lessons,
  assignmentsLoading = false,
  lessonsLoading = false,
  readOnly = false,
}: {
  assignments: TeacherAssignment[];
  lessons: TeachingLog[];
  assignmentsLoading?: boolean;
  lessonsLoading?: boolean;
  readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionKey, setSessionKey] = useState('');
  const [topic, setTopic] = useState('');

  const sessions = useMemo(() => teachingSessionsForDate(assignments, date), [assignments, date]);
  const selectedSession = sessions.find((session) => session.key === sessionKey);

  useEffect(() => {
    if (!sessions.some((session) => session.key === sessionKey)) setSessionKey('');
  }, [sessionKey, sessions]);

  const continueToLog = () => {
    if (!selectedSession || !topic.trim()) return;
    const query = new URLSearchParams({
      assignment: selectedSession.assignmentId,
      period: selectedSession.periodId,
      date,
      topic: topic.trim(),
    });
    navigate(`/teaching-log/create?${query.toString()}`);
  };

  return (
    <div className="space-y-5">
      {!readOnly && <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h2 className="font-semibold text-foreground">Register Lesson</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Start a teaching log from one of your real scheduled periods.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Lesson Date</label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full border border-border rounded-lg px-4 py-2.5 text-sm text-foreground/80 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <Select
            label="Scheduled Period"
            value={sessionKey}
            onChange={setSessionKey}
            placeholder={assignmentsLoading ? 'Loading your timetable...' : `Choose a ${weekdayForDate(date)} session`}
            disabled={assignmentsLoading || sessions.length === 0}
            options={sessions.map((session) => ({
              value: session.key,
              label: teachingSessionLabel(session),
            }))}
          />
        </div>

        {!assignmentsLoading && sessions.length === 0 && (
          <p className="mt-3 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
            No assigned teaching period is scheduled for {weekdayForDate(date) || 'this date'}.
          </p>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Topic Taught</label>
          <Input
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g., Quadratic Equations — Introduction"
            className="w-full border border-border rounded-lg px-4 py-2.5 text-sm text-foreground/80 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <Button variant="plain"
          onClick={continueToLog}
          disabled={!selectedSession || !topic.trim()}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg py-2.5 text-sm font-semibold transition-colors"
        >
          <FileText size={15} /> Continue to Lesson Details <ArrowRight size={15} />
        </Button>
      </div>}

      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h2 className="font-semibold text-foreground">Recent Lessons</h2>
        <p className="text-sm text-muted-foreground mb-4">Your latest saved teaching logs</p>

        {lessonsLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <SpinnerGap size={20} className="animate-spin text-primary" /> Loading saved lessons...
          </div>
        ) : lessons.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No lessons have been registered yet.</div>
        ) : (
          <div className="space-y-3">
            {lessons.slice(0, 8).map((lesson) => (
              <Button variant="plain"
                key={lesson._id}
                type="button"
                onClick={() => navigate(`/teaching-log/${lesson._id}${readOnly ? '?readonly=1' : ''}`)}
                className="w-full text-left bg-gradient-to-r from-info/10 to-primary/10 border border-border hover:border-primary/20 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-foreground">{lesson.topicTaught}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                    lesson.status === 'completed'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {lesson.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lesson.classId}{lesson.section ? ` - ${lesson.section}` : ''} · {lesson.period} · {lesson.subject}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(lesson.date).toLocaleDateString()}
                </p>
                {lesson.homeworkGiven && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">Homework: {lesson.homeworkGiven}</p>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
