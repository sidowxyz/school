// Term results and report cards, built from the marks teachers enter.
//
// For each student and subject the marks of every exam in the term are added
// up and compared with what was possible (each exam's maxMarks), giving a
// percentage and a grade. The same is done across all subjects for the overall
// result, and students are ranked within their class (and section).
import Exam from '../models/Exam.js';
import Mark from '../models/Mark.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import Term from '../models/Term.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import '../models/Year.js';
import AppError from '../utils/AppError.js';
import { GRADE_SCALE, PASS_PERCENT, gradeFor, rankByPercent, round1 } from '../utils/grading.js';

const sameId = (a, b) => String(a ?? '') === String(b ?? '');
const fullName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ');

/** Exams of a term that this class sits (an exam with no classes listed is for everyone). */
export const examsForClass = async (termId, classId, { publishedOnly = false } = {}) => {
  const exams = await Exam.find({ termId, ...(publishedOnly && { published: true }) })
    .sort({ date: 1, createdAt: 1 })
    .lean();
  return exams.filter((e) => !e.classIds?.length || e.classIds.some((c) => sameId(c, classId)));
};

const percentOf = (earned, possible) => (possible > 0 ? round1((earned / possible) * 100) : null);

/** Adds up one student's marks (for one subject, or all of them). */
const tally = (marks, maxByExam) => {
  let earned = 0;
  let possible = 0;
  for (const m of marks) {
    if (m.score === null && !m.absent) continue; // not marked yet
    earned += m.absent ? 0 : m.score;
    possible += maxByExam.get(String(m.examId)) ?? 0;
  }
  const percent = percentOf(earned, possible);
  return { earned, possible, percent, grade: gradeFor(percent) };
};

/**
 * Results for one class (and section) in a term: every student, every subject,
 * totals, grades and positions. `sectionId` undefined = the whole class.
 */
export const buildClassResults = async ({ termId, classId, sectionId, publishedOnly = false }) => {
  const term = await Term.findById(termId).populate('academicYearId', 'y_name').lean();
  if (!term) throw new AppError('Term not found', 404);
  const exams = await examsForClass(termId, classId, { publishedOnly });
  const maxByExam = new Map(exams.map((e) => [String(e._id), e.maxMarks]));
  const sectionFilter = sectionId === undefined ? {} : { sectionId: sectionId || null };

  const marks = exams.length
    ? await Mark.find({ examId: { $in: exams.map((e) => e._id) }, classId, ...sectionFilter }).lean()
    : [];

  // Everyone who has marks here, plus today's class list so unmarked students show too.
  const current = await Student.find({ classId, isDeleted: false, status: 'Active', ...sectionFilter }).select('_id').lean();
  const studentIds = [...new Set([...marks.map((m) => String(m.studentId)), ...current.map((s) => String(s._id))])];
  const students = await Student.find({ _id: { $in: studentIds } })
    .select('firstName lastName admissionNumber sectionId gender')
    .populate('sectionId', 'name')
    .lean();

  const markedSubjects = new Set(marks.map((m) => String(m.subjectId)));
  const subjects = await Subject.find({ $or: [{ _id: { $in: [...markedSubjects] } }, { classId, status: 'active' }] })
    .select('sub_name subjectCode')
    .sort({ sub_name: 1 })
    .lean();

  const marksByStudent = new Map();
  for (const m of marks) {
    const key = String(m.studentId);
    if (!marksByStudent.has(key)) marksByStudent.set(key, []);
    marksByStudent.get(key).push(m);
  }

  const rows = students.map((s) => {
    const own = marksByStudent.get(String(s._id)) ?? [];
    const bySubject = {};
    for (const subject of subjects) {
      const subjectMarks = own.filter((m) => sameId(m.subjectId, subject._id));
      bySubject[subject._id] = {
        ...tally(subjectMarks, maxByExam),
        scores: Object.fromEntries(subjectMarks.map((m) => [String(m.examId), { score: m.score, absent: m.absent, remark: m.remark }])),
      };
    }
    return {
      key: String(s._id),
      student: { _id: s._id, name: fullName(s), admissionNumber: s.admissionNumber, section: s.sectionId?.name ?? null },
      subjects: bySubject,
      ...tally(own, maxByExam),
    };
  });

  const positions = rankByPercent(rows);
  const ranked = rows
    .map(({ key, ...row }) => ({ ...row, position: positions.get(key) ?? null }))
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.student.name.localeCompare(b.student.name));

  const subjectSummary = subjects.map((subject) => {
    const percents = rows.map((r) => r.subjects[subject._id].percent).filter((p) => p !== null);
    return {
      _id: subject._id,
      name: subject.sub_name,
      code: subject.subjectCode ?? null,
      average: percents.length ? round1(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
      passed: percents.filter((p) => p >= PASS_PERCENT).length,
      marked: percents.length,
    };
  });

  const overall = ranked.map((r) => r.percent).filter((p) => p !== null);
  return {
    term: { _id: term._id, name: term.name, year: term.academicYearId?.y_name ?? null },
    exams: exams.map((e) => ({ _id: e._id, name: e.name, maxMarks: e.maxMarks, published: e.published, date: e.date })),
    subjects: subjectSummary,
    students: ranked,
    summary: {
      students: ranked.length,
      marked: overall.length,
      average: overall.length ? round1(overall.reduce((a, b) => a + b, 0) / overall.length) : null,
      passed: overall.filter((p) => p >= PASS_PERCENT).length,
    },
    gradeScale: GRADE_SCALE,
    passPercent: PASS_PERCENT,
  };
};

/** Terms in which a student has marks, newest first, for the report card's term picker. */
export const termsWithResults = async (studentId, { publishedOnly = false } = {}) => {
  const examIds = await Mark.distinct('examId', { studentId });
  const termIds = await Exam.distinct('termId', { _id: { $in: examIds }, ...(publishedOnly && { published: true }) });
  const terms = await Term.find({ _id: { $in: termIds } })
    .populate('academicYearId', 'y_name')
    .sort({ startDate: -1, createdAt: -1 })
    .lean();
  return terms.map((t) => ({ _id: t._id, name: t.name, year: t.academicYearId?.y_name ?? null }));
};

/**
 * One student's report card for a term. Without a termId it uses the newest
 * term that has results. Returns { terms, card } where card is null when the
 * student has no results yet.
 */
export const buildReportCard = async (studentId, termId, { publishedOnly = false } = {}) => {
  const student = await Student.findOne({ _id: studentId, isDeleted: false })
    .select('firstName lastName admissionNumber classId sectionId gender birthDate')
    .lean();
  if (!student) throw new AppError('Student not found', 404);

  const terms = await termsWithResults(studentId, { publishedOnly });
  const chosen = termId ? terms.find((t) => sameId(t._id, termId)) : terms[0];
  if (!chosen) return { terms, card: null };

  // The class the student was in when marked this term (they may have moved since).
  const exams = await Exam.find({ termId: chosen._id, ...(publishedOnly && { published: true }) }).select('_id').lean();
  const lastMark = await Mark.findOne({ studentId, examId: { $in: exams.map((e) => e._id) } }).sort({ updatedAt: -1 }).lean();
  const classId = lastMark?.classId ?? student.classId;
  const sectionId = lastMark ? lastMark.sectionId : student.sectionId;

  const results = await buildClassResults({ termId: chosen._id, classId, sectionId: sectionId ?? null, publishedOnly });
  const row = results.students.find((r) => sameId(r.student._id, studentId)) ?? null;
  const [cls, section] = await Promise.all([
    Class.findById(classId).select('cl_name').lean(),
    sectionId ? Section.findById(sectionId).select('name').lean() : null,
  ]);

  return {
    terms,
    card: {
      student: { _id: student._id, name: fullName(student), admissionNumber: student.admissionNumber, gender: student.gender },
      className: cls?.cl_name ?? null,
      sectionName: section?.name ?? null,
      term: results.term,
      exams: results.exams,
      // Only subjects with something marked for this student.
      subjects: results.subjects
        .filter((s) => row && Object.keys(row.subjects[s._id]?.scores ?? {}).length)
        .map((s) => ({ ...s, ...row.subjects[s._id] })),
      total: row ? { earned: row.earned, possible: row.possible, percent: row.percent, grade: row.grade } : null,
      position: row?.position ?? null,
      classSize: results.summary.marked,
      classAverage: results.summary.average,
      gradeScale: results.gradeScale,
      passPercent: results.passPercent,
    },
  };
};
