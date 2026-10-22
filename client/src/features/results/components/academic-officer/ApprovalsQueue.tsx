import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ArrowCounterClockwise, Clock, FileArrowDown, PaperPlaneRight, Tray, X, Eye, Rocket } from '@phosphor-icons/react';

import SubmissionStatusPill from '../shared/SubmissionStatusPill';
import GradeBadge from '../shared/GradeBadge';
import StatStrip from '@/components/shared/StatStrip';
import { SkeletonTable } from '../shared/Skeleton';
import { resultsApi } from '../../api/resultsApi';
import { gradeFor, subStats } from '../../data/gradeBands';
import type { MarkSubmission } from '../../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type FilterId = 'action' | 'all' | 'submitted' | 'approved' | 'published';

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.round(diff / 3_600_000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

interface Props {
  /** Lets the parent refresh its pending badge and results after a decision. */
  onChanged?: () => void;
}

export default function ApprovalsQueue({ onChanged }: Props) {
  const [submissions, setSubmissions] = useState<MarkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [Funnel, setFilter] = useState<FilterId>('action');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubmissions(await resultsApi.listSubmissions());
    } catch (err) {
      setError(errorMessage(err, 'Failed to load mark submissions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      submitted: submissions.Funnel((s) => s.status === 'submitted').length,
      approved: submissions.Funnel((s) => s.status === 'approved').length,
      returned: submissions.Funnel((s) => s.status === 'returned').length,
      published: submissions.Funnel((s) => s.status === 'published').length,
    }),
    [submissions],
  );

  const rows = useMemo(() => {
    if (Funnel === 'all') return submissions;
    if (Funnel === 'action') {
      return submissions.Funnel((s) => s.status === 'submitted' || s.status === 'approved');
    }
    return submissions.Funnel((s) => s.status === Funnel);
  }, [submissions, Funnel]);

  const detail = detailId ? submissions.find((s) => s.id === detailId) ?? null : null;

  /** Run a workflow action, then refresh both this queue and the parent. */
  const act = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await run();
      await load();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, 'That action could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  const approve = (id: string) => act(() => resultsApi.approve(id));
  const publish = (id: string) => act(() => resultsApi.publish(id));
  const publishAll = () => act(() => resultsApi.publishAllApproved());

  const confirmReturn = async () => {
    if (!returnId || !reason.trim()) return;
    const id = returnId;
    const note = reason.trim();
    setReturnId(null);
    setReason('');
    setDetailId(null);
    await act(() => resultsApi.return(id, note));
  };

  const FILTERS: { id: FilterId; label: string }[] = [
    { id: 'action', label: 'Needs Action' },
    { id: 'submitted', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'published', label: 'Published' },
    { id: 'all', label: 'All' },
  ];

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary strip */}
      <StatStrip
        items={[
          { label: 'Pending review', value: counts.submitted, icon: Clock, tone: 'sky' },
          { label: 'Approved', value: counts.approved, icon: FileArrowDown, tone: 'violet' },
          { label: 'Published', value: counts.published, icon: Rocket, tone: 'emerald' },
          { label: 'Returned', value: counts.returned, icon: ArrowCounterClockwise, tone: 'amber' },
        ]}
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Mark Submissions</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Review teacher submissions, then approve and publish results
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {FILTERS.map((f) => (
                <Button variant="plain"
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 transition ${
                    Funnel === f.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <Button variant="plain"
              onClick={publishAll}
              disabled={counts.approved === 0 || busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Rocket size={14} />
              Publish All Approved
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState hasAny={submissions.length > 0} />
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[940px] text-sm">
              <TableHeader>
                <TableRow className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
                  <TableHead className="px-6 py-3 font-medium">Subject / Exam</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Class</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Teacher</TableHead>
                  <TableHead className="px-6 py-3 font-medium text-center">Avg</TableHead>
                  <TableHead className="px-6 py-3 font-medium text-center">Pass / Fail</TableHead>
                  <TableHead className="px-6 py-3 font-medium text-center">Status</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Submitted</TableHead>
                  <TableHead className="px-6 py-3 font-medium text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const st = subStats(s);
                  return (
                    <TableRow key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <TableCell className="px-6 py-4">
                        <Button variant="plain" onClick={() => setDetailId(s.id)} className="text-left">
                          <p className="font-medium text-gray-900 hover:text-green-700">{s.subjectName}</p>
                          <p className="text-xs text-gray-400">{s.examName}</p>
                        </Button>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-700">{s.className}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-700">{s.teacherName}</TableCell>
                      <TableCell className="px-6 py-4 text-center font-semibold text-green-600">{st.average}</TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <span className="text-green-600 font-medium">{st.passCount}</span>
                        <span className="text-gray-300"> / </span>
                        <span className={st.failCount ? 'text-red-600 font-medium' : 'text-gray-400'}>
                          {st.failCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center"><SubmissionStatusPill status={s.status} /></TableCell>
                      <TableCell className="px-6 py-4 text-gray-500">{timeAgo(s.submittedAt)}</TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="plain"
                            onClick={() => setDetailId(s.id)}
                            title="View marks"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                          >
                            <Eye size={15} />
                          </Button>
                          {s.status === 'submitted' && (
                            <>
                              <Button variant="plain"
                                onClick={() => setReturnId(s.id)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                              >
                                <ArrowCounterClockwise size={14} /> Return
                              </Button>
                              <Button variant="plain"
                                onClick={() => s.id && approve(s.id)}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 transition"
                              >
                                <Check size={14} /> Approve
                              </Button>
                            </>
                          )}
                          {s.status === 'approved' && (
                            <Button variant="plain"
                              onClick={() => s.id && publish(s.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 transition"
                            >
                              <PaperPlaneRight size={14} /> Publish
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detail && (
        <DetailDrawer
          submission={detail}
          busy={busy}
          onClose={() => setDetailId(null)}
          onApprove={() => { if (detail.id) approve(detail.id); setDetailId(null); }}
          onReturn={() => setReturnId(detail.id)}
          onPublish={() => { if (detail.id) publish(detail.id); setDetailId(null); }}
        />
      )}

      {/* Return reason modal */}
      <Dialog open={!!returnId} onOpenChange={(open) => { if (!open) { setReturnId(null); setReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return to Teacher</DialogTitle>
            <DialogDescription>
              Explain what needs to be corrected. The teacher will see this note and can resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1 block">Return Reason</Label>
            <Textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. The Mathematics mark for roll 003 looks transposed…"
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnId(null); setReason(''); }}>Cancel</Button>
            <Button
              onClick={confirmReturn}
              disabled={!reason.trim() || busy}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowCounterClockwise size={15} /> Return Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailDrawer({
  submission, busy, onClose, onApprove, onReturn, onPublish,
}: {
  submission: MarkSubmission;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReturn: () => void;
  onPublish: () => void;
}) {
  const st = subStats(submission);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 school-overlay" onClick={onClose} />
      <aside className="relative w-full max-w-xl bg-white h-full shadow-xl flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {submission.subjectName} · {submission.className}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {submission.examName} · {submission.teacherName}
            </p>
            <div className="mt-2"><SubmissionStatusPill status={submission.status} /></div>
          </div>
          <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></Button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-6 border-b border-gray-100 text-center">
          <Mini label="Class Average" value={`${st.average}`} />
          <Mini label="Passing" value={`${st.passCount}`} />
          <Mini label="Failing" value={`${st.failCount}`} />
        </div>

        {submission.returnReason && submission.status === 'returned' && (
          <div className="mx-6 mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
            <span className="font-medium">Return note:</span> {submission.returnReason}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="text-left text-gray-500 border-b border-gray-100">
                <TableHead className="py-2 font-medium">Roll No.</TableHead>
                <TableHead className="py-2 font-medium">Student</TableHead>
                <TableHead className="py-2 font-medium text-center">Marks</TableHead>
                <TableHead className="py-2 font-medium text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submission.entries.map((e) => {
                const pct = e.marks !== null ? (e.marks / submission.maxMarks) * 100 : null;
                return (
                  <TableRow key={e.studentId} className="border-b border-gray-50">
                    <TableCell className="py-2.5 text-gray-600">{e.rollNo}</TableCell>
                    <TableCell className="py-2.5 text-gray-800">{e.name}</TableCell>
                    <TableCell className="py-2.5 text-center font-medium text-gray-800">
                      {e.marks ?? '—'}
                      <span className="text-gray-300">/{submission.maxMarks}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {pct !== null ? <GradeBadge grade={gradeFor(pct)} /> : <span className="text-gray-300">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          {submission.status === 'submitted' && (
            <>
              <Button variant="plain"
                onClick={onReturn}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowCounterClockwise size={15} /> Return
              </Button>
              <Button variant="plain"
                onClick={onApprove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
              >
                <Check size={15} /> Approve
              </Button>
            </>
          )}
          {submission.status === 'approved' && (
            <Button variant="plain"
              onClick={onPublish}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
            >
              <PaperPlaneRight size={15} /> Publish Results
            </Button>
          )}
          {(submission.status === 'published' ||
            submission.status === 'returned' ||
            submission.status === 'draft') && (
            <span className="text-sm text-gray-400">No actions available</span>
          )}
        </div>
      </aside>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-14">
      <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center text-green-500 mb-4">
        <Tray size={26} />
      </div>
      <h4 className="text-base font-semibold text-gray-800">
        {hasAny ? 'Nothing here' : 'No marks submitted yet'}
      </h4>
      <p className="text-sm text-gray-500 mt-1">
        {hasAny
          ? 'No submissions match this Funnel.'
          : 'Submissions appear here once teachers submit marks for approval.'}
      </p>
    </div>
  );
}
