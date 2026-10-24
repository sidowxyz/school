// Exams and marks.
// The academic office (or an admin) creates the term's exams; teachers enter
// marks for the classes, sections and subjects they teach; publishing an exam
// makes its marks visible to students and parents.
import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import Mark from '../models/Mark.js';
import Term from '../models/Term.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { escapeRegex } from '../utils/query.js';
import { buildClassResults, buildReportCard } from '../services/resultService.js';

const isId = (v) => mongoose.isValidObjectId(v);
const sameId = (a, b) => String(a ?? '') === String(b ?? '');

/** A teacher's lessons (class, section, subject) for a term, or null for staff who can mark anything. */
const teacherScope = async (req, termId) => {
  if (req.user?.role !== 'teacher') return null;
  const teacher = await Teacher.findOne({ userId: req.user.id }).select('_id').lean();
  if (!teacher) return [];
  const inTerm = termId ? await TeacherAssignment.find({ teacherId: teacher._id, termId }).lean() : [];
  // Schools that set the timetable up once keep using last term's assignments.
  return inTerm.length ? inTerm : TeacherAssignment.find({ teacherId: teacher._id }).lean();
};

const teaches = (scope, { classId, sectionId, subjectId }) => scope.some((a) =>
  sameId(a.classId, classId) && (!sectionId || sameId(a.sectionId, sectionId)) && (!subjectId || sameId(a.subjectId, subjectId)));


/** One exam per name per term ("Midterm" and "midterm" count as the same). */
const assertNameFree = async ({ name, termId }, exceptId = null) => {
  const taken = await Exam.exists({ termId, name: new RegExp(`^${escapeRegex(name)}$`, 'i'), ...(exceptId && { _id: { $ne: exceptId } }) });
  if (taken) throw new AppError('This term already has an exam with that name.', 409);
};

const examInput = async (body) => {
  const name = String(body.name ?? '').trim();
  if (name.length < 2) throw new AppError('Give the exam a name, e.g. "Midterm".', 400);
  if (!isId(body.termId)) throw new AppError('Choose the term this exam belongs to.', 400);
  const term = await Term.findById(body.termId).select('academicYearId').lean();
  if (!term) throw new AppError('Term not found', 404);
  const maxMarks = Number(body.maxMarks ?? 100);
  if (!Number.isFinite(maxMarks) || maxMarks < 1 || maxMarks > 1000) throw new AppError('Out of must be between 1 and 1000.', 400);
  const classIds = Array.isArray(body.classIds) ? body.classIds.filter(isId) : [];
  return { name, termId: body.termId, yearId: term.academicYearId, maxMarks, date: body.date ? new Date(body.date) : null, classIds };
};

// GET /api/exams?termId=&yearId=
export const listExams = async (req, res, next) => {
  try {
    const filter = {};
    if (isId(req.query.termId)) filter.termId = req.query.termId;
    if (isId(req.query.yearId)) filter.yearId = req.query.yearId;
    const exams = await Exam.find(filter)
      .populate({ path: 'termId', select: 'name academicYearId', populate: { path: 'academicYearId', select: 'y_name' } })
      .populate('classIds', 'cl_name')
      .sort({ date: -1, createdAt: -1 })
      .lean();
    const counts = await Mark.aggregate([
      { $match: { examId: { $in: exams.map((e) => e._id) }, $or: [{ score: { $ne: null } }, { absent: true }] } },
      { $group: { _id: '$examId', marks: { $sum: 1 }, students: { $addToSet: '$studentId' } } },
    ]);
    const byExam = new Map(counts.map((c) => [String(c._id), { marks: c.marks, students: c.students.length }]));
    res.status(200).json(new ApiResponse(200, exams.map((e) => ({
      ...e,
      term: e.termId ? { _id: e.termId._id, name: e.termId.name, year: e.termId.academicYearId?.y_name ?? null } : null,
      termId: e.termId?._id ?? null,
      classes: (e.classIds ?? []).map((c) => ({ _id: c._id, name: c.cl_name })),
      classIds: (e.classIds ?? []).map((c) => c._id),
      progress: byExam.get(String(e._id)) ?? { marks: 0, students: 0 },
    })), 'Exams retrieved'));
  } catch (error) {
    next(error);
  }
};

// POST /api/exams
export const createExam = async (req, res, next) => {
  try {
    const input = await examInput(req.body);
    await assertNameFree(input);
    const exam = await Exam.create({ ...input, createdBy: req.user?._id ?? null });
    res.status(201).json(new ApiResponse(201, exam, 'Exam created'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('This term already has an exam with that name.', 409));
    next(error);
  }
};

// PUT /api/exams/:id
export const updateExam = async (req, res, next) => {
  try {
    const input = await examInput(req.body);
    await assertNameFree(input, req.params.id);
    const highest = await Mark.findOne({ examId: req.params.id, score: { $gt: input.maxMarks } }).select('score').lean();
    if (highest) throw new AppError(`A mark of ${highest.score} is already entered, so "out of" can't be lower than that.`, 409);
    const exam = await Exam.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true });
    if (!exam) throw new AppError('Exam not found', 404);
    res.status(200).json(new ApiResponse(200, exam, 'Exam updated'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('This term already has an exam with that name.', 409));
    next(error);
  }
};

// DELETE /api/exams/:id — refused once marks are entered, so no results are lost by accident.
export const deleteExam = async (req, res, next) => {
  try {
    const marked = await Mark.countDocuments({ examId: req.params.id, $or: [{ score: { $ne: null } }, { absent: true }] });
    if (marked) throw new AppError(`${marked} mark${marked === 1 ? ' is' : 's are'} already entered for this exam. Clear them first if you really want to delete it.`, 409);
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) throw new AppError('Exam not found', 404);
    await Mark.deleteMany({ examId: exam._id });
    res.status(200).json(new ApiResponse(200, null, 'Exam deleted'));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/exams/:id/publish  { published: boolean }
export const setPublished = async (req, res, next) => {
  try {
    const published = req.body.published !== false;
    const exam = await Exam.findByIdAndUpdate(req.params.id, { published, publishedAt: published ? new Date() : null }, { new: true });
    if (!exam) throw new AppError('Exam not found', 404);
    res.status(200).json(new ApiResponse(200, exam, published ? 'Results published' : 'Results hidden from students and parents'));
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/:id/options — the classes, sections and subjects this user can mark.
export const markingOptions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) throw new AppError('Exam not found', 404);
    const scope = await teacherScope(req, exam.termId);
    const examClasses = exam.classIds?.length ? exam.classIds.map(String) : null;
    const inExam = (classId) => !examClasses || examClasses.includes(String(classId));

    let classes;
    let sections;
    let subjects;
    if (scope) {
      const own = scope.filter((a) => inExam(a.classId));
      [classes, sections, subjects] = await Promise.all([
        Class.find({ _id: { $in: own.map((a) => a.classId) } }).select('cl_name').sort({ cl_name: 1 }).lean(),
        Section.find({ _id: { $in: own.map((a) => a.sectionId) } }).select('name class').sort({ name: 1 }).lean(),
        Subject.find({ _id: { $in: own.map((a) => a.subjectId) } }).select('sub_name classId').sort({ sub_name: 1 }).lean(),
      ]);
      // Only the exact pairs the teacher teaches.
      const pairs = own.map((a) => ({ classId: String(a.classId), sectionId: String(a.sectionId), subjectId: String(a.subjectId) }));
      return res.status(200).json(new ApiResponse(200, {
        classes: classes.map((c) => ({ _id: c._id, name: c.cl_name })),
        sections: sections.map((s) => ({ _id: s._id, name: s.name, classId: s.class })),
        subjects: subjects.map((s) => ({ _id: s._id, name: s.sub_name, classId: s.classId ?? null })),
        pairs,
        locked: exam.published,
      }, 'Marking options'));
    }
    [classes, sections, subjects] = await Promise.all([
      Class.find(examClasses ? { _id: { $in: examClasses } } : {}).select('cl_name').sort({ cl_name: 1 }).lean(),
      Section.find(examClasses ? { class: { $in: examClasses } } : {}).select('name class').sort({ name: 1 }).lean(),
      Subject.find({ status: 'active' }).select('sub_name classId').sort({ sub_name: 1 }).lean(),
    ]);
    res.status(200).json(new ApiResponse(200, {
      classes: classes.map((c) => ({ _id: c._id, name: c.cl_name })),
      sections: sections.map((s) => ({ _id: s._id, name: s.name, classId: s.class })),
      subjects: subjects.map((s) => ({ _id: s._id, name: s.sub_name, classId: s.classId ?? null })),
      pairs: null,
      locked: false,
    }, 'Marking options'));
  } catch (error) {
    next(error);
  }
};

/** The students on a mark sheet: today's class list plus anyone already marked here. */
const sheetStudents = async (exam, { classId, sectionId, subjectId }) => {
  const sectionFilter = { sectionId: sectionId || null };
  const [current, marks] = await Promise.all([
    Student.find({ classId, isDeleted: false, status: 'Active', ...sectionFilter }).select('_id').lean(),
    Mark.find({ examId: exam._id, classId, subjectId, ...sectionFilter }).lean(),
  ]);
  const ids = [...new Set([...current.map((s) => String(s._id)), ...marks.map((m) => String(m.studentId))])];
  const students = await Student.find({ _id: { $in: ids } }).select('firstName lastName admissionNumber gender').sort({ firstName: 1, lastName: 1 }).lean();
  return { students, marks };
};

const readSheetParams = async (req) => {
  const { classId, subjectId } = req.method === 'GET' ? req.query : req.body;
  const sectionId = (req.method === 'GET' ? req.query.sectionId : req.body.sectionId) || null;
  if (!isId(classId) || !isId(subjectId) || (sectionId && !isId(sectionId))) throw new AppError('Choose a class and a subject.', 400);
  const exam = await Exam.findById(req.params.id).lean();
  if (!exam) throw new AppError('Exam not found', 404);
  if (exam.classIds?.length && !exam.classIds.some((c) => sameId(c, classId))) throw new AppError("This class doesn't sit this exam.", 400);
  const sectionCount = await Section.countDocuments({ class: classId });
  if (sectionCount && !sectionId) throw new AppError('Choose a section.', 400);
  const scope = await teacherScope(req, exam.termId);
  if (scope && !teaches(scope, { classId, sectionId, subjectId })) throw new AppError("You can only enter marks for the classes and subjects you teach.", 403);
  return { exam, classId, sectionId, subjectId, scope };
};

// GET /api/exams/:id/marksheet?classId=&sectionId=&subjectId=
export const getMarksheet = async (req, res, next) => {
  try {
    const { exam, classId, sectionId, subjectId, scope } = await readSheetParams(req);
    const { students, marks } = await sheetStudents(exam, { classId, sectionId, subjectId });
    const byStudent = new Map(marks.map((m) => [String(m.studentId), m]));
    res.status(200).json(new ApiResponse(200, {
      exam: { _id: exam._id, name: exam.name, maxMarks: exam.maxMarks, published: exam.published },
      // Teachers can't change marks once results are published.
      locked: !!scope && exam.published,
      rows: students.map((s) => {
        const m = byStudent.get(String(s._id));
        return {
          studentId: s._id,
          name: [s.firstName, s.lastName].filter(Boolean).join(' '),
          admissionNumber: s.admissionNumber,
          score: m?.score ?? null,
          absent: m?.absent ?? false,
          remark: m?.remark ?? '',
        };
      }),
    }, 'Mark sheet'));
  } catch (error) {
    next(error);
  }
};

// PUT /api/exams/:id/marks  { classId, sectionId, subjectId, marks: [{ studentId, score, absent, remark }] }
export const saveMarks = async (req, res, next) => {
  try {
    const { exam, classId, sectionId, subjectId, scope } = await readSheetParams(req);
    if (scope && exam.published) throw new AppError('These results are published. Ask the academic office to unpublish them before changing marks.', 403);
    const entries = Array.isArray(req.body.marks) ? req.body.marks : [];
    if (!entries.length) throw new AppError('Nothing to save.', 400);

    const { students } = await sheetStudents(exam, { classId, sectionId, subjectId });
    const allowed = new Set(students.map((s) => String(s._id)));
    const ops = [];
    for (const entry of entries) {
      if (!allowed.has(String(entry.studentId))) throw new AppError('A student on this sheet is not in this class.', 400);
      const absent = entry.absent === true;
      let score = entry.score === '' || entry.score === undefined ? null : entry.score;
      if (absent) score = null;
      if (score !== null) {
        score = Number(score);
        if (!Number.isFinite(score) || score < 0 || score > exam.maxMarks) {
          throw new AppError(`Marks must be between 0 and ${exam.maxMarks}.`, 400);
        }
        score = Math.round(score * 100) / 100;
      }
      ops.push({
        updateOne: {
          filter: { examId: exam._id, studentId: entry.studentId, subjectId },
          update: {
            $set: { classId, sectionId, score, absent, remark: String(entry.remark ?? '').slice(0, 200), enteredBy: req.user?._id ?? null },
          },
          upsert: true,
        },
      });
    }
    await Mark.bulkWrite(ops);
    res.status(200).json(new ApiResponse(200, { saved: ops.length }, `${ops.length} mark${ops.length === 1 ? '' : 's'} saved`));
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/results?termId=&classId=&sectionId=
export const getClassResults = async (req, res, next) => {
  try {
    const { termId, classId } = req.query;
    const sectionId = req.query.sectionId || undefined;
    if (!isId(termId) || !isId(classId) || (sectionId && !isId(sectionId))) throw new AppError('Choose a term and a class.', 400);
    const scope = await teacherScope(req, termId);
    if (scope && !teaches(scope, { classId, sectionId })) throw new AppError('You can only see results for the classes you teach.', 403);
    // The whole class only for a teacher who teaches all of its sections.
    if (scope && !sectionId) {
      const sections = await Section.find({ class: classId }).select('_id').lean();
      if (sections.some((s) => !teaches(scope, { classId, sectionId: s._id }))) throw new AppError('Choose the section you teach.', 403);
    }
    res.status(200).json(new ApiResponse(200, await buildClassResults({ termId, classId, sectionId }), 'Class results'));
  } catch (error) {
    next(error);
  }
};

// GET /api/exams/report-card/:studentId?termId=
export const getReportCard = async (req, res, next) => {
  try {
    if (!isId(req.params.studentId)) throw new AppError('Student not found', 404);
    const termId = isId(req.query.termId) ? req.query.termId : undefined;
    if (req.user?.role === 'teacher') {
      const student = await Student.findById(req.params.studentId).select('classId sectionId').lean();
      const scope = await teacherScope(req, termId);
      if (!student || !teaches(scope, { classId: student.classId, sectionId: student.sectionId })) {
        throw new AppError("You can only see report cards for the classes you teach.", 403);
      }
    }
    res.status(200).json(new ApiResponse(200, await buildReportCard(req.params.studentId, termId), 'Report card'));
  } catch (error) {
    next(error);
  }
};
