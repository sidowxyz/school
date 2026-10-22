import mongoose from 'mongoose';

import ExamMarkSubmission from '../models/ExamMarkSubmission.js';
import Exam from '../models/Exam.js';
import Student from '../models/Student.js';
import { notifySubmitted, notifyReviewed } from './examWorkflowNotifications.js';
import {
  GRADE_BANDS,
  gradeForPercentage,
  percentageOf,
  round1,
  assignRanks
} from '../utils/examGrading.js';

const SUBMISSION_POPULATE = [
  { path: 'exam_id', select: 'ex_name ex_no exam_date total_marks pass_marks start_time end_time' },
  { path: 'class_id', select: 'cl_name cl_no' },
  { path: 'subject_id', select: 'sub_name sub_no' },
  { path: 'section_id', select: 'name' },
  { path: 'teacher', select: 'username firstName lastName' },
  { path: 'entries.student', select: 'firstName lastName admissionNumber classId sectionId' }
];

/** Marks are only counted as results once a submission reaches this state. */
const PUBLISHED = 'published';

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

export class WorkflowError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const studentName = (student) =>
  student ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() : 'Unknown student';

/** Active roster for a class (and section, when the exam is section-specific). */
const getRoster = async (classId, sectionId = null) => {
  const filter = { classId, isDeleted: { $ne: true } };
  if (sectionId) filter.sectionId = sectionId;
  return Student.find(filter)
    .select('firstName lastName admissionNumber classId sectionId')
    .sort({ admissionNumber: 1 });
};

const toEntryView = (entry) => ({
  studentId: String(entry.student?._id ?? entry.student),
  rollNo: entry.student?.admissionNumber ?? '',
  name: studentName(entry.student),
  marks: entry.marks ?? null,
  remarks: entry.remarks ?? ''
});

const toSubmissionView = (submission) => ({
  id: String(submission._id),
  examId: String(submission.exam_id?._id ?? submission.exam_id),
  examName: submission.exam_id?.ex_name ?? '',
  examDate: submission.exam_id?.exam_date ?? null,
  classId: String(submission.class_id?._id ?? submission.class_id),
  className: submission.class_id?.cl_name ?? '',
  subjectId: String(submission.subject_id?._id ?? submission.subject_id),
  subjectName: submission.subject_id?.sub_name ?? '',
  sectionId: submission.section_id ? String(submission.section_id._id ?? submission.section_id) : undefined,
  sectionName: submission.section_id?.name,
  teacherId: submission.teacher ? String(submission.teacher._id ?? submission.teacher) : null,
  teacherName: submission.teacher
    ? `${submission.teacher.firstName ?? ''} ${submission.teacher.lastName ?? ''}`.trim() ||
      submission.teacher.username
    : 'Unassigned',
  maxMarks: submission.max_marks,
  passMarks: submission.pass_marks ?? null,
  entries: (submission.entries ?? []).map(toEntryView),
  status: submission.status,
  submittedAt: submission.submittedAt?.toISOString(),
  reviewedAt: submission.reviewedAt?.toISOString(),
  publishedAt: submission.publishedAt?.toISOString(),
  returnReason: submission.returnReason
});

/**
 * The submission for an exam/class/subject, or a blank one built from the
 * live class roster when the teacher hasn't started marking yet. The blank
 * form is not persisted — it only becomes a record once marks are saved.
 */
export const getSubmissionFor = async ({ exam_id, class_id, subject_id, section_id = null }) => {
  const exam = await Exam.findById(exam_id);
  if (!exam) throw new NotFoundError('Exam not found');

  const existing = await ExamMarkSubmission.findOne({
    exam_id,
    class_id,
    subject_id,
    section_id: section_id ?? null
  }).populate(SUBMISSION_POPULATE);

  if (existing) return toSubmissionView(existing);

  const roster = await getRoster(class_id, section_id);
  const populated = await Exam.findById(exam_id)
    .populate([
      { path: 'class_id', select: 'cl_name cl_no' },
      { path: 'subject_id', select: 'sub_name sub_no' }
    ]);

  return {
    id: null, // not saved yet
    examId: String(exam._id),
    examName: exam.ex_name,
    examDate: exam.exam_date,
    classId: String(class_id),
    className: populated?.class_id?.cl_name ?? '',
    subjectId: String(subject_id),
    subjectName: populated?.subject_id?.sub_name ?? '',
    sectionId: section_id ? String(section_id) : undefined,
    teacherName: 'Unassigned',
    maxMarks: exam.total_marks,
    passMarks: exam.pass_marks ?? null,
    entries: roster.map((student) => ({
      studentId: String(student._id),
      rollNo: student.admissionNumber,
      name: studentName(student),
      marks: null,
      remarks: ''
    })),
    status: 'draft'
  };
};

export const listSubmissions = async (query = {}) => {
  const { status, exam_id, class_id, subject_id, teacher } = query;
  const filter = {};
  if (status) filter.status = { $in: String(status).split(',') };
  if (exam_id) filter.exam_id = exam_id;
  if (class_id) filter.class_id = class_id;
  if (subject_id) filter.subject_id = subject_id;
  if (teacher) filter.teacher = teacher;

  const submissions = await ExamMarkSubmission.find(filter)
    .populate(SUBMISSION_POPULATE)
    .sort({ updatedAt: -1 });

  return submissions.map(toSubmissionView);
};

/**
 * Create or update the marks for an exam/class/subject.
 *
 * `status` moves the submission along the workflow; anything already
 * approved or published is locked so a late edit can't silently change
 * results people have already seen.
 */
export const saveSubmission = async (payload, user) => {
  const { exam_id, class_id, subject_id, section_id = null, entries = [], status = 'draft' } = payload;

  const exam = await Exam.findById(exam_id);
  if (!exam) throw new NotFoundError('Exam not found');

  if (!['draft', 'submitted'].includes(status)) {
    throw new WorkflowError('Marks can only be saved as a draft or submitted for approval');
  }

  const existing = await ExamMarkSubmission.findOne({
    exam_id,
    class_id,
    subject_id,
    section_id: section_id ?? null
  });

  if (existing && ['approved', 'published'].includes(existing.status)) {
    throw new WorkflowError(
      `These marks are already ${existing.status} and can no longer be edited. Ask an academic officer to return them first.`
    );
  }

  const maxMarks = existing?.max_marks ?? exam.total_marks;

  // Only students actually on the roster may be marked, and no score may
  // exceed the exam's total.
  const roster = await getRoster(class_id, section_id);
  const rosterIds = new Set(roster.map((s) => String(s._id)));

  const cleanEntries = [];
  for (const entry of entries) {
    const studentId = String(entry.studentId ?? entry.student ?? '');
    if (!rosterIds.has(studentId)) {
      throw new WorkflowError('One or more students are not enrolled in this class');
    }
    const raw = entry.marks;
    const marks = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > maxMarks)) {
      throw new WorkflowError(`Marks must be between 0 and ${maxMarks}`);
    }
    cleanEntries.push({ student: studentId, marks, remarks: entry.remarks ?? '' });
  }

  if (status === 'submitted' && cleanEntries.some((e) => e.marks === null)) {
    throw new WorkflowError('Enter a mark for every student before submitting for approval');
  }

  const update = {
    exam_id,
    class_id,
    subject_id,
    section_id: section_id ?? null,
    max_marks: maxMarks,
    pass_marks: exam.pass_marks,
    entries: cleanEntries,
    status,
    teacher: existing?.teacher ?? user?._id,
    returnReason: status === 'submitted' ? undefined : existing?.returnReason,
    ...(status === 'submitted' ? { submittedAt: new Date() } : {})
  };

  const saved = await ExamMarkSubmission.findOneAndUpdate(
    { exam_id, class_id, subject_id, section_id: section_id ?? null },
    update,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate(SUBMISSION_POPULATE);

  const view = toSubmissionView(saved);
  if (status === 'submitted') {
    // Fire-and-forget so a notification hiccup can't roll back a saved
    // submission the teacher just spent an hour marking.
    notifySubmitted(view, user);
  }
  return view;
};

/** Move a submission through review: approve / return / publish. */
export const reviewSubmission = async (id, action, { reason, user } = {}) => {
  const submission = await ExamMarkSubmission.findById(id);
  if (!submission) throw new NotFoundError('Marks submission not found');

  const now = new Date();

  switch (action) {
    case 'approve':
      if (submission.status !== 'submitted') {
        throw new WorkflowError('Only submitted marks can be approved');
      }
      submission.status = 'approved';
      submission.reviewedAt = now;
      submission.returnReason = undefined;
      break;

    case 'return':
      if (!['submitted', 'approved'].includes(submission.status)) {
        throw new WorkflowError('Only submitted or approved marks can be returned to the teacher');
      }
      if (!reason || !reason.trim()) {
        throw new WorkflowError('Give the teacher a reason for returning these marks');
      }
      submission.status = 'returned';
      submission.reviewedAt = now;
      submission.returnReason = reason.trim();
      break;

    case 'publish':
      if (submission.status !== 'approved') {
        throw new WorkflowError('Marks must be approved before they can be published');
      }
      submission.status = PUBLISHED;
      submission.publishedAt = now;
      break;

    default:
      throw new WorkflowError(`Unknown review action: ${action}`);
  }

  if (user) submission.reviewedBy = user._id;
  await submission.save();
  await submission.populate(SUBMISSION_POPULATE);
  const view = toSubmissionView(submission);
  notifyReviewed(view, action, user);
  return view;
};

/** Publish every approved submission at once (optionally scoped to an exam). */
export const publishAllApproved = async ({ exam_id, class_id } = {}, user) => {
  const filter = { status: 'approved' };
  if (exam_id) filter.exam_id = exam_id;
  if (class_id) filter.class_id = class_id;

  const result = await ExamMarkSubmission.updateMany(filter, {
    $set: {
      status: PUBLISHED,
      publishedAt: new Date(),
      ...(user ? { reviewedBy: user._id } : {})
    }
  });

  return { published: result.modifiedCount ?? 0 };
};

/**
 * Published results for a class, aggregated across every subject examined in
 * the given sitting.
 *
 * A single Exam record covers one class and (usually) one subject, so a
 * report card spans several of them. Callers pick the scope:
 *   exam_period_id — every exam on that timetable (the usual case)
 *   batch_id       — one multi-grade creation
 *   exam_id        — a single exam record
 */
export const getClassResults = async ({
  exam_id,
  exam_ids,
  batch_id,
  exam_period_id,
  class_id,
  includeUnpublished = false
}) => {
  const examFilter = {};
  if (exam_period_id) examFilter.exam_period_id = exam_period_id;
  if (batch_id) examFilter.batch_id = batch_id;
  if (exam_ids?.length) examFilter._id = { $in: exam_ids };
  if (exam_id) examFilter._id = exam_id;
  if (class_id) examFilter.class_id = class_id;

  if (!exam_period_id && !batch_id && !exam_ids?.length && !exam_id) {
    throw new WorkflowError('Specify an examination or examination period to load results for');
  }

  const exams = await Exam.find(examFilter).select('_id ex_name class_id subject_id total_marks');
  if (!exams.length) {
    return { subjects: [], results: [], summary: emptySummary() };
  }

  const submissionFilter = {
    exam_id: { $in: exams.map((e) => e._id) },
    ...(class_id ? { class_id } : {}),
    ...(includeUnpublished ? {} : { status: PUBLISHED })
  };

  const submissions = await ExamMarkSubmission.find(submissionFilter).populate(SUBMISSION_POPULATE);

  if (!submissions.length) {
    return { subjects: [], results: [], summary: emptySummary() };
  }

  // Column set: one per subject that actually has published marks.
  const subjects = [];
  const seenSubjects = new Set();
  for (const submission of submissions) {
    const id = String(submission.subject_id?._id ?? submission.subject_id);
    if (seenSubjects.has(id)) continue;
    seenSubjects.add(id);
    subjects.push({
      subjectId: id,
      name: submission.subject_id?.sub_name ?? 'Subject',
      maxMarks: submission.max_marks
    });
  }
  subjects.sort((a, b) => a.name.localeCompare(b.name));

  // Row set: every student who has at least one mark in this sitting.
  const byStudent = new Map();
  for (const submission of submissions) {
    const subjectId = String(submission.subject_id?._id ?? submission.subject_id);
    for (const entry of submission.entries) {
      if (entry.marks === null || entry.marks === undefined) continue;
      const student = entry.student;
      if (!student) continue;
      const key = String(student._id ?? student);
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          student: {
            id: key,
            rollNo: student.admissionNumber ?? '',
            name: studentName(student),
            classId: String(submission.class_id?._id ?? submission.class_id),
            className: submission.class_id?.cl_name ?? ''
          },
          marksBySubject: new Map()
        });
      }
      byStudent.get(key).marksBySubject.set(subjectId, {
        marks: entry.marks,
        remarks: entry.remarks ?? ''
      });
    }
  }

  const rows = Array.from(byStudent.values()).map((row) => {
    const marks = subjects.map((subject) => {
      const scored = row.marksBySubject.get(subject.subjectId);
      return {
        subjectId: subject.subjectId,
        subjectName: subject.name,
        maxMarks: subject.maxMarks,
        marks: scored?.marks ?? null,
        remarks: scored?.remarks ?? ''
      };
    });

    // Only subjects the student actually sat count toward the total, so an
    // absentee isn't ranked as if they scored zero.
    const sat = marks.filter((m) => m.marks !== null);
    const totalObtained = sat.reduce((sum, m) => sum + m.marks, 0);
    const totalMax = sat.reduce((sum, m) => sum + m.maxMarks, 0);
    const percentage = percentageOf(totalObtained, totalMax);
    const grade = gradeForPercentage(percentage);

    return {
      student: row.student,
      marks,
      totalObtained,
      totalMax,
      percentage,
      grade,
      isPass: percentage >= 50,
      status: PUBLISHED
    };
  });

  rows.sort((a, b) => b.totalObtained - a.totalObtained || a.student.name.localeCompare(b.student.name));
  const results = assignRanks(rows);

  return { subjects, results, summary: summarise(results) };
};

const emptySummary = () => ({
  total: 0,
  passed: 0,
  failed: 0,
  passPercentage: 0,
  classAverage: 0,
  highest: 0,
  lowest: 0
});

const summarise = (results) => {
  if (!results.length) return emptySummary();
  const passed = results.filter((r) => r.isPass).length;
  const percentages = results.map((r) => r.percentage);
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passPercentage: round1((passed / results.length) * 100),
    classAverage: round1(percentages.reduce((a, b) => a + b, 0) / results.length),
    highest: Math.max(...percentages),
    lowest: Math.min(...percentages)
  };
};

/**
 * Charts for the academic officer dashboard, all computed from published
 * marks: grade distribution, per-subject averages and the pass/fail trend
 * across the class's recent examinations.
 */
export const getAnalytics = async ({ exam_id, exam_period_id, batch_id, class_id }) => {
  const { subjects, results, summary } = await getClassResults({
    exam_id,
    exam_period_id,
    batch_id,
    class_id
  });

  const gradeDistribution = GRADE_BANDS
    .map((band) => ({
      grade: band.grade,
      label: band.label,
      count: results.filter((r) => r.grade === band.grade).length
    }))
    .filter((d) => d.count > 0);

  const subjectAverages = subjects.map((subject) => {
    const scored = results
      .map((r) => r.marks.find((m) => m.subjectId === subject.subjectId))
      .filter((m) => m && m.marks !== null);
    const average = scored.length
      ? round1(scored.reduce((sum, m) => sum + m.marks, 0) / scored.length)
      : 0;
    return {
      subjectId: subject.subjectId,
      subject: subject.name,
      average,
      maxMarks: subject.maxMarks,
      averagePercentage: percentageOf(average, subject.maxMarks)
    };
  });

  const passFailTrend = await getPassFailTrend(class_id);

  return { summary, gradeDistribution, subjectAverages, passFailTrend };
};

/**
 * Pass/fail rate for each of the class's most recent examinations that has
 * published marks — the "is the class improving?" view.
 */
const getPassFailTrend = async (classId) => {
  if (!classId) return [];

  const published = await ExamMarkSubmission.find({
    class_id: classId,
    status: PUBLISHED
  })
    .populate({ path: 'exam_id', select: 'ex_name exam_date' });

  // Group submissions by the examination they belong to, then score each
  // student's subject marks against that submission's own pass mark.
  const byExam = new Map();
  for (const submission of published) {
    const exam = submission.exam_id;
    if (!exam) continue;
    const key = String(exam._id);
    if (!byExam.has(key)) {
      byExam.set(key, { exam: exam.ex_name, date: exam.exam_date, pass: 0, fail: 0 });
    }
    const bucket = byExam.get(key);
    const passMark = submission.pass_marks ?? submission.max_marks / 2;
    for (const entry of submission.entries) {
      if (entry.marks === null || entry.marks === undefined) continue;
      if (entry.marks >= passMark) bucket.pass += 1;
      else bucket.fail += 1;
    }
  }

  return Array.from(byExam.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-6)
    .map(({ exam, pass, fail }) => {
      const total = pass + fail || 1;
      return {
        exam,
        pass: round1((pass / total) * 100),
        fail: round1((fail / total) * 100)
      };
    });
};

/**
 * Every published result for one student, newest examination first —
 * backs the student and parent results views and their report cards.
 */
export const getStudentResults = async (studentId) => {
  const student = await Student.findById(studentId)
    .select('firstName lastName admissionNumber classId sectionId')
    .populate({ path: 'classId', select: 'cl_name' });
  if (!student) throw new NotFoundError('Student not found');

  const submissions = await ExamMarkSubmission.find({
    status: PUBLISHED,
    'entries.student': new mongoose.Types.ObjectId(studentId)
  }).populate(SUBMISSION_POPULATE);

  const byExam = new Map();
  for (const submission of submissions) {
    const exam = submission.exam_id;
    if (!exam) continue;
    const entry = submission.entries.find(
      (e) => String(e.student?._id ?? e.student) === String(studentId)
    );
    if (!entry || entry.marks === null || entry.marks === undefined) continue;

    const key = String(exam._id);
    if (!byExam.has(key)) {
      byExam.set(key, {
        examId: key,
        examName: exam.ex_name,
        examDate: exam.exam_date,
        className: submission.class_id?.cl_name ?? '',
        marks: []
      });
    }
    byExam.get(key).marks.push({
      subjectId: String(submission.subject_id?._id ?? submission.subject_id),
      subjectName: submission.subject_id?.sub_name ?? 'Subject',
      maxMarks: submission.max_marks,
      marks: entry.marks,
      remarks: entry.remarks ?? ''
    });
  }

  const exams = Array.from(byExam.values()).map((exam) => {
    const totalObtained = exam.marks.reduce((sum, m) => sum + m.marks, 0);
    const totalMax = exam.marks.reduce((sum, m) => sum + m.maxMarks, 0);
    const percentage = percentageOf(totalObtained, totalMax);
    return {
      ...exam,
      totalObtained,
      totalMax,
      percentage,
      grade: gradeForPercentage(percentage),
      isPass: percentage >= 50
    };
  });

  exams.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));

  // Rank within the class for the most recent examination, so the student
  // view can show "3rd of 28" instead of a bare percentage.
  let rank = null;
  let classSize = null;
  if (exams.length) {
    const latest = exams[0];
    const cohort = await getClassResults({
      exam_id: latest.examId,
      class_id: String(student.classId?._id ?? student.classId)
    });
    const mine = cohort.results.find((r) => r.student.id === String(studentId));
    if (mine) {
      rank = mine.rank;
      classSize = cohort.results.length;
    }
  }

  return {
    student: {
      id: String(student._id),
      name: studentName(student),
      rollNo: student.admissionNumber,
      className: student.classId?.cl_name ?? ''
    },
    exams,
    trend: exams
      .slice()
      .reverse()
      .map((e) => ({ exam: e.examName, percentage: e.percentage })),
    rank,
    classSize
  };
};
