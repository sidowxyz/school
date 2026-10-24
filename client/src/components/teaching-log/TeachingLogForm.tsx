import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FloppyDisk, CheckCircle, ArrowLeft, WarningCircle } from '@phosphor-icons/react';
import { TeachingLog, TeachingLogStatus } from '../../types/teachingLog.types';
import { teachersApi } from '@/features/teachers/api/teachersApi';
import type { TeacherAssignment } from '@/features/teachers/types';
import { periodLabel, weekdayForDate } from './portal/portalData';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface TeachingLogFormProps {
  initialData?: TeachingLog;
  onSubmit: (data: Omit<TeachingLog, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'>, status: TeachingLogStatus) => Promise<any>;
  isLoading?: boolean;
}

export default function TeachingLogForm({
  initialData,
  onSubmit,
  isLoading = false,
}: TeachingLogFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Academic Info States
  const [date, setDate] = useState(
    initialData?.date?.slice(0, 10) || searchParams.get('date') || new Date().toISOString().split('T')[0],
  );
  const [subjectId, setSubjectId] = useState('');
  const [assignmentId, setAssignmentId] = useState(initialData?.assignmentId || searchParams.get('assignment') || '');
  const [periodId, setPeriodId] = useState(initialData?.periodId || searchParams.get('period') || '');
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  // Lesson Info States
  const [topicTaught, setTopicTaught] = useState(initialData?.topicTaught ?? searchParams.get('topic') ?? '');
  const [lessonObjective, setLessonObjective] = useState(initialData?.lessonObjective ?? '');
  const [teachingSummary, setTeachingSummary] = useState(initialData?.teachingSummary ?? '');
  const [learningOutcomes, setLearningOutcomes] = useState(initialData?.learningOutcomes ?? '');

  // Student Progress States
  const [studentParticipation, setStudentParticipation] = useState(initialData?.studentParticipation ?? '');
  const [challengesFaced, setChallengesFaced] = useState(initialData?.challengesFaced ?? '');
  const [extraNotes, setExtraNotes] = useState(initialData?.extraNotes ?? '');

  // Homework States
  const [homeworkGiven, setHomeworkGiven] = useState(initialData?.homeworkGiven ?? '');
  const [submissionDeadline, setSubmissionDeadline] = useState(initialData?.submissionDeadline ?? '');

  // Errors & Form validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAssignmentsLoading(true);
    teachersApi.getTimetable('me')
      .then((data) => {
        if (cancelled) return;
        setAssignments(data);
        setAssignmentsError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setAssignments([]);
        setAssignmentsError(error?.response?.data?.message || 'Unable to load your assigned subjects and timetable.');
      })
      .finally(() => { if (!cancelled) setAssignmentsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const subjects = useMemo(() => [
    ...new Map(assignments
      .filter((assignment) => assignment.subjectId?._id)
      .map((assignment) => [assignment.subjectId._id, assignment.subjectId])).values(),
  ], [assignments]);

  const assignmentsForSubject = useMemo(
    () => assignments.filter((assignment) => assignment.subjectId?._id === subjectId),
    [assignments, subjectId],
  );
  const selectedAssignment = assignments.find((assignment) => assignment._id === assignmentId);
  const lessonDay = weekdayForDate(date);
  const availableSlots = useMemo(() => {
    if (!selectedAssignment) return [];
    return [
      ...new Map(selectedAssignment.timetableSlots
        .filter((slot) => slot.day === lessonDay && slot.periodId?._id)
        .map((slot) => [slot.periodId._id, slot])).values(),
    ].sort((a, b) => a.periodId.time_in.localeCompare(b.periodId.time_in));
  }, [lessonDay, selectedAssignment]);

  // Resolve edit data and quick-register query parameters against the current
  // teacher's assignments. Values that no longer belong to the teacher are not
  // silently retained as selectable options.
  useEffect(() => {
    if (assignments.length === 0) return;
    const requestedAssignmentId = initialData?.assignmentId || searchParams.get('assignment');
    const requested = requestedAssignmentId
      ? assignments.find((assignment) => assignment._id === requestedAssignmentId)
      : undefined;
    const matchingExisting = initialData
      ? assignments.find((assignment) =>
          assignment.subjectId?.sub_name === initialData.subject
          && assignment.classId?.cl_name === initialData.classId
          && assignment.sectionId?.name === initialData.section)
      : undefined;
    const resolved = requested || matchingExisting;
    if (resolved) {
      setSubjectId(resolved.subjectId._id);
      setAssignmentId(resolved._id);
    }
  }, [assignments, initialData, searchParams]);

  useEffect(() => {
    if (!selectedAssignment) {
      setPeriodId('');
      return;
    }
    if (availableSlots.some((slot) => slot.periodId._id === periodId)) return;

    const requestedPeriodId = initialData?.periodId || searchParams.get('period');
    const requested = availableSlots.find((slot) => slot.periodId._id === requestedPeriodId);
    const matchingExisting = initialData
      ? availableSlots.find((slot) => periodLabel(slot) === initialData.period)
      : undefined;
    setPeriodId((requested || matchingExisting)?.periodId._id || '');
  }, [availableSlots, initialData, periodId, searchParams, selectedAssignment]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!date) errors.date = 'Date is required';
    if (!subjectId) errors.subject = 'Subject is required';
    if (!selectedAssignment) errors.classId = 'An assigned class is required';
    if (!selectedAssignment?.sectionId?._id) errors.section = 'An assigned section is required';
    if (!periodId || !availableSlots.some((slot) => slot.periodId._id === periodId)) {
      errors.period = `Select one of your scheduled periods for ${lessonDay || 'this date'}`;
    }
    if (!topicTaught.trim()) errors.topicTaught = 'Topic taught is required';
    if (!lessonObjective.trim()) errors.lessonObjective = 'Lesson objective is required';
    if (!teachingSummary.trim()) errors.teachingSummary = 'Teaching summary is required';
    if (!learningOutcomes.trim()) errors.learningOutcomes = 'Learning outcomes are required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (status: TeachingLogStatus) => {
    setFormError(null);

    if (!validateForm()) {
      setFormError('Please fill in all required fields marked with an asterisk (*)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      if (!selectedAssignment) throw new Error('Select one of your assigned classes.');
      const selectedSlot = availableSlots.find((slot) => slot.periodId._id === periodId);
      if (!selectedSlot) throw new Error(`Select one of your scheduled periods for ${lessonDay}.`);
      const payload = {
        date,
        assignmentId: selectedAssignment._id,
        periodId: selectedSlot.periodId._id,
        subject: selectedAssignment.subjectId.sub_name,
        classId: selectedAssignment.classId.cl_name,
        section: selectedAssignment.sectionId.name,
        period: periodLabel(selectedSlot),
        topicTaught,
        lessonObjective,
        teachingSummary,
        learningOutcomes,
        studentParticipation,
        challengesFaced,
        extraNotes,
        homeworkGiven,
        submissionDeadline: homeworkGiven ? submissionDeadline : undefined,
        status,
      };
      await onSubmit(payload, status);
      navigate('/teaching-log');
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Something went wrong while saving the teaching log.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const inputCls = (field: string) => `w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
    validationErrors[field] ? 'border-destructive bg-destructive/10' : 'border-border'
  }`;

  const selectCls = (field: string) => `${inputCls(field)} bg-card appearance-none cursor-pointer`;
  const labelCls = 'block text-sm font-semibold text-foreground/80 mb-1.5 flex items-center gap-1';

  return (
    <div className="space-y-6">
      {/* Top message banner for errors */}
      {formError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <WarningCircle className="text-destructive shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-destructive">Form Submission Failed</h4>
            <p className="text-xs text-destructive mt-1">{formError}</p>
          </div>
        </div>
      )}

      {assignmentsError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <WarningCircle className="text-destructive shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-destructive">Assigned timetable unavailable</h4>
            <p className="text-xs text-destructive mt-1">{assignmentsError}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* SECTION 1: ACADEMIC INFORMATION */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3 mb-5">
            Academic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Date */}
            <div>
              <label className={labelCls}>
                Date <span className="text-destructive">*</span>
              </label>
              <DatePicker
                value={date}
                onChange={setDate}
                max={new Date().toLocaleDateString('en-CA')}
                invalid={!!validationErrors.date}
                aria-label="Lesson date"
              />
              {validationErrors.date && <p className="text-[11px] text-destructive mt-1">{validationErrors.date}</p>}
            </div>

            {/* Subject */}
            <div>
              <label className={labelCls}>
                Subject <span className="text-destructive">*</span>
              </label>
              <NativeSelect
                className={selectCls('subject')}
                value={subjectId}
                disabled={assignmentsLoading || subjects.length === 0}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setAssignmentId('');
                  setPeriodId('');
                }}
              >
                <option value="" disabled>
                  {assignmentsLoading ? 'Loading assigned subjects...' : 'Select assigned subject'}
                </option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>{subject.sub_name}</option>
                ))}
              </NativeSelect>
              {!assignmentsLoading && subjects.length === 0 && !assignmentsError && (
                <p className="text-[11px] text-warning mt-1">No subjects are currently assigned to you.</p>
              )}
              {validationErrors.subject && <p className="text-[11px] text-destructive mt-1">{validationErrors.subject}</p>}
            </div>

            {/* Class */}
            <div>
              <label className={labelCls}>
                Class <span className="text-destructive">*</span>
              </label>
              <NativeSelect
                className={selectCls('classId')}
                value={assignmentId}
                disabled={!subjectId || assignmentsForSubject.length === 0}
                onChange={(e) => {
                  setAssignmentId(e.target.value);
                  setPeriodId('');
                }}
              >
                <option value="" disabled>Select assigned class</option>
                {assignmentsForSubject.map((assignment) => (
                  <option key={assignment._id} value={assignment._id}>
                    {assignment.classId.cl_name} - {assignment.sectionId.name} · {assignment.termId?.name || 'Term'}
                  </option>
                ))}
              </NativeSelect>
              {validationErrors.classId && <p className="text-[11px] text-destructive mt-1">{validationErrors.classId}</p>}
            </div>

            {/* Section */}
            <div>
              <label className={labelCls}>
                Section <span className="text-destructive">*</span>
              </label>
              <NativeSelect
                className={selectCls('section')}
                value={selectedAssignment?.sectionId?._id || ''}
                disabled
              >
                <option value="" disabled>Assigned section</option>
                {selectedAssignment?.sectionId && (
                  <option value={selectedAssignment.sectionId._id}>{selectedAssignment.sectionId.name}</option>
                )}
              </NativeSelect>
              {validationErrors.section && <p className="text-[11px] text-destructive mt-1">{validationErrors.section}</p>}
            </div>

            {/* Period */}
            <div>
              <label className={labelCls}>
                Period <span className="text-destructive">*</span>
              </label>
              <NativeSelect
                className={selectCls('period')}
                value={periodId}
                disabled={!selectedAssignment || availableSlots.length === 0}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="" disabled>Select scheduled period</option>
                {availableSlots.map((slot) => (
                  <option key={slot.periodId._id} value={slot.periodId._id}>{periodLabel(slot)}</option>
                ))}
              </NativeSelect>
              {selectedAssignment && availableSlots.length === 0 && (
                <p className="text-[11px] text-warning mt-1">No period is scheduled for {lessonDay || 'this date'}.</p>
              )}
              {validationErrors.period && <p className="text-[11px] text-destructive mt-1">{validationErrors.period}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 2: LESSON INFORMATION */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3 mb-5">
            Lesson Information
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Topic Taught */}
              <div>
                <label className={labelCls}>
                  Topic Taught <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Quadratic Equations - Binomial Factoring"
                  className={inputCls('topicTaught')}
                  value={topicTaught}
                  onChange={(e) => setTopicTaught(e.target.value)}
                />
                {validationErrors.topicTaught && <p className="text-[11px] text-destructive mt-1">{validationErrors.topicTaught}</p>}
              </div>

              {/* Lesson Objective */}
              <div>
                <label className={labelCls}>
                  Lesson Objective <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Identify quadratic coefficients and solve by splitting variables"
                  className={inputCls('lessonObjective')}
                  value={lessonObjective}
                  onChange={(e) => setLessonObjective(e.target.value)}
                />
                {validationErrors.lessonObjective && <p className="text-[11px] text-destructive mt-1">{validationErrors.lessonObjective}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teaching Summary */}
              <div>
                <label className={labelCls}>
                  Teaching Summary <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="Describe key points explained, board exercises conducted, and instructional resources utilized..."
                  className={`${inputCls('teachingSummary')} min-h-[120px] resize-y`}
                  value={teachingSummary}
                  onChange={(e) => setTeachingSummary(e.target.value)}
                />
                {validationErrors.teachingSummary && <p className="text-[11px] text-destructive mt-1">{validationErrors.teachingSummary}</p>}
              </div>

              {/* Learning Outcomes */}
              <div>
                <label className={labelCls}>
                  Learning Outcomes <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="What knowledge or skills did the students successfully acquire or apply by the end of this lesson?"
                  className={`${inputCls('learningOutcomes')} min-h-[120px] resize-y`}
                  value={learningOutcomes}
                  onChange={(e) => setLearningOutcomes(e.target.value)}
                />
                {validationErrors.learningOutcomes && <p className="text-[11px] text-destructive mt-1">{validationErrors.learningOutcomes}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: STUDENT PROGRESS & NOTE DETAILS */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3 mb-5">
            Student Progress & Notes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Student Participation Notes */}
            <div>
              <label className={labelCls}>Student Participation Notes</label>
              <Textarea
                placeholder="Mention students who excelled, volunteer activity rates, and group participation feedback..."
                className={`${inputCls('studentParticipation')} min-h-[100px] resize-y`}
                value={studentParticipation}
                onChange={(e) => setStudentParticipation(e.target.value)}
              />
            </div>

            {/* Challenges Faced */}
            <div>
              <label className={labelCls}>Challenges Faced</label>
              <Textarea
                placeholder="Disruptions, common comprehension roadblocks, equipment issues, or time limit struggles..."
                className={`${inputCls('challengesFaced')} min-h-[100px] resize-y`}
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
              />
            </div>

            {/* Extra Notes */}
            <div>
              <label className={labelCls}>Extra Notes / Remedial Plans</label>
              <Textarea
                placeholder="Individual accommodations, make-up assignments, topics requiring review in future classes..."
                className={`${inputCls('extraNotes')} min-h-[100px] resize-y`}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: HOMEWORK ASSIGNED */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3 mb-5">
            Homework (Optional)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Homework Given */}
            <div>
              <label className={labelCls}>Homework Details</label>
              <Textarea
                placeholder="Clearly describe homework instructions, textbook page numbers, online components, etc..."
                className={`${inputCls('homeworkGiven')} min-h-[80px] resize-y`}
                value={homeworkGiven}
                onChange={(e) => setHomeworkGiven(e.target.value)}
              />
            </div>

            {/* Submission Deadline */}
            <div>
              <label className={labelCls}>Submission Deadline</label>
              <DatePicker
                disabled={!homeworkGiven.trim()}
                value={submissionDeadline}
                onChange={setSubmissionDeadline}
                min={date || undefined}
                invalid={!!validationErrors.submissionDeadline}
                clearable
                placeholder="No deadline"
                aria-label="Submission deadline"
              />
              {!homeworkGiven.trim() && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Type a homework description to enable setting a deadline date.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* FORM BUTTON CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3">
          <Button variant="ghost"
            type="button"
            onClick={() => navigate('/teaching-log')}
            className="w-full sm:w-auto"
          >
            <ArrowLeft size={16} /> Back to Logs
          </Button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Save as Draft */}
            <Button variant="outline"
              type="button"
              disabled={isLoading}
              onClick={() => handleFormSubmit('draft')}
              className="w-full sm:w-auto"
            >
              <FloppyDisk size={16} className="text-muted-foreground" />
              Save as Draft
            </Button>

            {/* Submit Log */}
            <Button variant="default"
              type="button"
              disabled={isLoading}
              onClick={() => handleFormSubmit('completed')}
              className="w-full sm:w-auto"
            >
              <CheckCircle size={16} />
              Submit Completed Log
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
