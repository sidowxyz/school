import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PencilSimple, Calendar, Clock, BookOpen, GraduationCap, ClipboardText, BookBookmark, User } from '@phosphor-icons/react';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/teaching-log/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { teachingLogService } from '@/services/teachingLog.service';
import { TeachingLog } from '@/types/teachingLog.types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';


export default function TeachingLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get('readonly') === '1';
  const [log, setLog] = useState<TeachingLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLog() {
      if (!id) return;
      try {
        const data = await teachingLogService.getLogById(id);
        setLog(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to retrieve teaching log details');
      } finally {
        setLoading(false);
      }
    }
    loadLog();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !log) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-6 text-center max-w-xl mx-auto my-12">
        <h3 className="font-bold text-base mb-2">Error Loading Details</h3>
        <p className="text-sm mb-4">{error || 'Teaching log entry not found'}</p>
        <Button variant="outline" size="sm"
          onClick={() => navigate('/teaching-log')}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const labelCls = 'text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1';
  const valCls = 'text-sm font-semibold text-foreground';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Teaching Log"
        subtitle="What was taught in this lesson and how it went."
        action={
          <div className="flex gap-3">
            <Button variant="outline"
              onClick={() => readOnly ? navigate(-1) : navigate('/teaching-log')}
            >
              <ArrowLeft size={14} /> Back
            </Button>
            {!readOnly && (
              <Button asChild>
                <Link to={`/teaching-log/${log._id}/edit`}><PencilSimple size={14} /> Edit Log</Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Main Grid Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Academic & Teacher Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Status Panel */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className={labelCls}>Log Status</span>
              <div className="mt-1">
                <StatusBadge status={log.status} />
              </div>
            </div>
            <div className="text-right">
              <span className={labelCls}>Date Logged</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5 justify-end mt-1">
                <Calendar size={14} className="text-muted-foreground" />
                {formatDate(log.date)}
              </span>
            </div>
          </div>

          {/* Academic Info Card */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
              <GraduationCap size={16} className="text-primary" />
              Academic Info
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={labelCls}>Subject</span>
                <span className={valCls}>{log.subject}</span>
              </div>
              <div>
                <span className={labelCls}>Class & Section</span>
                <span className={`${valCls} bg-muted/50 px-2.5 py-0.5 rounded border border-border inline-block`}>
                  {log.classId} ({log.section})
                </span>
              </div>
              <div className="col-span-2">
                <span className={labelCls}>Period & Time</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Clock size={14} className="text-muted-foreground" />
                  {log.period}
                </span>
              </div>
            </div>
          </div>

          {/* Created By Card */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
              <User size={16} className="text-primary" />
              Author Details
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold border flex items-center justify-center text-sm shrink-0">
                {log.createdBy.name[0]?.toUpperCase() ?? 'T'}
              </div>
              <div>
                <span className="font-bold text-sm text-foreground block leading-tight">{log.createdBy.name}</span>
                <span className="text-xs text-muted-foreground block mt-0.5">{log.createdBy.email}</span>
              </div>
            </div>

            <div className="pt-2 border-t text-[10px] text-muted-foreground space-y-1">
              <div>Created: {new Date(log.createdAt).toLocaleString()}</div>
              <div>Last Updated: {new Date(log.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Lesson outcomes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Lesson Content Card */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-foreground border-b pb-3 flex items-center gap-2 uppercase tracking-wide">
              <BookOpen size={16} className="text-primary" />
              Lesson Details
            </h3>

            <div>
              <span className={labelCls}>Topic Taught</span>
              <p className="text-base font-bold text-foreground mt-0.5">{log.topicTaught}</p>
            </div>

            <div>
              <span className={labelCls}>Lesson Objective</span>
              <p className="text-sm text-foreground/80 italic mt-0.5 bg-muted/50 border border-border p-3 rounded-xl">
                &ldquo;{log.lessonObjective}&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <span className={labelCls}>Instructional Summary</span>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line mt-1">
                  {log.teachingSummary}
                </p>
              </div>
              <div>
                <span className={labelCls}>Key Learning Outcomes</span>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line mt-1">
                  {log.learningOutcomes}
                </p>
              </div>
            </div>
          </div>

          {/* Student Progress Card */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-foreground border-b pb-3 flex items-center gap-2 uppercase tracking-wide">
              <ClipboardText size={16} className="text-primary" />
              Student Engagement & Observations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className={labelCls}>Participation Details</span>
                <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                  {log.studentParticipation || <span className="text-muted-foreground italic">None logged.</span>}
                </p>
              </div>

              <div>
                <span className={labelCls}>Challenges Encountered</span>
                <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                  {log.challengesFaced || <span className="text-muted-foreground italic">None logged.</span>}
                </p>
              </div>

              <div>
                <span className={labelCls}>Additional Notes</span>
                <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                  {log.extraNotes || <span className="text-muted-foreground italic">None logged.</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Homework Card */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-foreground border-b pb-3 flex items-center gap-2 uppercase tracking-wide">
              <BookBookmark size={16} className="text-primary" />
              Homework Task
            </h3>

            {log.homeworkGiven ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <span className={labelCls}>Homework Instructions</span>
                  <p className="text-sm text-foreground/80 leading-relaxed mt-1">{log.homeworkGiven}</p>
                </div>
                <div>
                  <span className={labelCls}>Submission Deadline</span>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-muted-foreground" />
                    {log.submissionDeadline ? formatDate(log.submissionDeadline) : 'None'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic py-2">No homework was assigned for this lesson.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
