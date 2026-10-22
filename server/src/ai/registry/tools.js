import { z } from 'zod';

import { defineTool, LEVEL, SCOPE } from './defineTool.js';
import { invokeController } from '../invokeController.js';
import AppError from '../../utils/AppError.js';

// Existing controllers — reused, never reimplemented.
import {
  getAdminDashboardKPIs,
  getAcademicPerformance,
  getTeacherDashboardKPIs,
  getFinanceDashboardKPIs,
} from '../../controllers/analyticsController.js';
import { getAttendance, getMonthlyReport } from '../../controllers/attendanceController.js';
import { getTimetable } from '../../controllers/teacherController.js';
import {
  getMyResults as portalMyResults,
  getMyAttendance as portalMyAttendance,
  getMyInvoices as portalMyInvoices,
  getMyLibrary as portalMyLibrary,
  getMyTimetable as portalMyTimetable,
} from '../../controllers/studentPortalController.js';
import {
  getMyChildren as portalMyChildren,
  getChildAttendance as portalChildAttendance,
  getChildInvoices as portalChildInvoices,
  getChildResults as portalChildResults,
} from '../../controllers/parentPortalController.js';

// Existing services — called directly where a service layer exists.
import { getAllStudentsService, getStudentByIdService } from '../../services/studentService.js';
import { getAllIssuesService } from '../../services/libraryService.js';
import {
  createNoticeService,
  publishNoticeService,
  getNoticeByIdService,
} from '../../services/communicationService.js';
import {
  getMissingTeachingLogsService,
  getTeacherWorkloadService,
  getPendingMarksService,
} from '../../services/aiInsightsService.js';
import {
  checkQuestionSimilarityService,
  addExamQuestionsService,
  reviewExamQualityService,
} from '../../services/examIntelligenceService.js';
import { generateExamService } from '../../services/examGenerationService.js';
import User from '../../models/User.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Phase 1 tool set — read-only.
 *
 * Every handler calls an existing controller or service. No handler builds its
 * own Mongoose query; that is what keeps business rules, validation and the
 * ad-hoc teacher scoping in `attendanceController` authoritative.
 *
 * `tier: 'none'` means the tool answers entirely from the database with no model
 * call. Ten of the twelve below are 'none' — that is the cost strategy working,
 * not an omission.
 */
export const tools = [
  /* ---------------------------------------------------------------- school */

  defineTool({
    name: 'getDailySchoolSummary',
    keywords:
      'summary overview briefing today daily snapshot dashboard whole school totals how many classes parents enrolment',
    description:
      "Today's whole-school overview: student/teacher/class counts, attendance rate, fee collection totals, upcoming exams.",
    input: z.object({}),
    roles: ['admin', 'principal'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Daily school summary', icon: 'LayoutDashboard', group: 'Overview' },
    handler: ({ req }) => invokeController(getAdminDashboardKPIs, req),
  }),

  /* -------------------------------------------------------------- students */

  defineTool({
    name: 'searchStudents',
    emptyMessage:
      'No students matched that search.',
    keywords:
      'student pupil learner find search lookup name admission number roll enrolled how many students list students',
    description:
      'Search students by name, admission number, email or phone, optionally filtered by class, section or status. Returns matches plus a total count.',
    input: z.object({
      search: z.string().trim().min(1).max(120).optional(),
      classId: z.string().trim().optional(),
      sectionId: z.string().trim().optional(),
      status: z.string().trim().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: {
      label: 'Find a student',
      icon: 'Search',
      group: 'Students',
      prompt: 'Find student ',
    },
    handler: async ({ args }) => {
      const result = await getAllStudentsService({ ...args, page: 1 });
      return {
        total: result?.pagination?.totalRecords ?? result?.students?.length ?? 0,
        pagination: result?.pagination,
        students: result?.students ?? [],
      };
    },
  }),

  defineTool({
    name: 'getStudentDetails',
    keywords:
      'student profile detail record information guardian parent contact',
    description: 'Full profile for one student by their database id, including class, section and guardians.',
    input: z.object({ studentId: z.string().trim().min(1) }),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    handler: ({ args }) => getStudentByIdService(args.studentId),
  }),

  defineTool({
    name: 'getStudentsWithoutClass',
    emptyMessage:
      'Every student is assigned to a class.',
    keywords:
      'unassigned unplaced without class no class missing placement not assigned',
    description:
      'Students who are enrolled but not yet assigned to a class, which usually means their placement is incomplete.',
    input: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Unassigned students', icon: 'UserX', group: 'Students' },
    handler: async ({ args }) => {
      const result = await getAllStudentsService({ unassigned: 'true', limit: args.limit, page: 1 });
      return {
        total: result?.pagination?.totalRecords ?? 0,
        students: result?.students ?? [],
      };
    },
  }),

  /* ------------------------------------------------------------ attendance */

  defineTool({
    name: 'getAttendanceForDate',
    emptyMessage:
      'No attendance has been recorded for that day yet, so there is nothing to report on absences.',
    keywords:
      'attendance absent present late today register who is absent absentees turnout',
    description:
      "Attendance records for a single date, optionally narrowed to a class or section. Defaults to today. Use for 'who is absent today'.",
    input: z.object({
      date: z.string().trim().optional(),
      classId: z.string().trim().optional(),
      sectionId: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
    roles: ['admin', 'principal', 'academic_officer', 'teacher'],
    level: LEVEL.READ,
    // attendanceController narrows teachers to their own TeacherAssignment
    // class/section pairs via getTeacherAssignments(req). Passing the real req
    // through invokeController preserves that.
    scope: SCOPE.ASSIGNMENT,
    tier: 'none',
    quickAction: { label: "Today's attendance", icon: 'ClipboardCheck', group: 'Attendance' },
    handler: ({ req, args }) =>
      invokeController(getAttendance, req, { query: { ...args, date: args.date || today() } }),
  }),

  defineTool({
    name: 'getMonthlyAttendanceReport',
    emptyMessage:
      'No attendance has been recorded for that month.',
    keywords:
      'attendance monthly month report rate percentage trend absenteeism',
    description:
      'Per-student attendance statistics for a month plus a school-wide summary: present/absent/late/excused counts and rates.',
    // Default to the current month so this is usable as a one-click action;
    // the underlying controller requires both, and a button cannot supply them.
    input: z.object({
      year: z.number().int().min(2000).max(2100).default(() => new Date().getFullYear()),
      month: z.number().int().min(1).max(12).default(() => new Date().getMonth() + 1),
      classId: z.string().trim().optional(),
      sectionId: z.string().trim().optional(),
    }),
    roles: ['admin', 'principal', 'academic_officer', 'teacher'],
    level: LEVEL.READ,
    scope: SCOPE.ASSIGNMENT,
    tier: 'none',
    quickAction: { label: 'Monthly attendance', icon: 'CalendarDays', group: 'Attendance' },
    handler: ({ req, args }) => invokeController(getMonthlyReport, req, { query: args }),
  }),

  /* --------------------------------------------------------------- finance */

  defineTool({
    name: 'getFinanceSummary',
    keywords:
      'fee fees payment invoice money owed owes outstanding unpaid balance arrears collection revenue paid income billing debt',
    description:
      'School fee position: total billed, collected, outstanding, collection rate, status breakdown and recent collection trend.',
    input: z.object({}),
    roles: ['admin', 'accountant'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Outstanding fees', icon: 'DollarSign', group: 'Finance' },
    handler: ({ req }) => invokeController(getFinanceDashboardKPIs, req),
  }),

  /* --------------------------------------------------------------- library */

  defineTool({
    name: 'getOverdueBooks',
    emptyMessage:
      'No library books are overdue.',
    keywords:
      'library book borrowed loan overdue late due returned not returned borrower',
    description: 'Library loans that are past their due date and not yet returned.',
    input: z.object({ limit: z.number().int().min(1).max(100).default(50) }),
    roles: ['admin', 'principal', 'librarian'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Overdue books', icon: 'BookMarked', group: 'Library' },
    handler: async ({ args }) => {
      // libraryService has no overdue filter; the shape it returns (dueDate +
      // status) is enough to derive one here without new database logic.
      const issues = await getAllIssuesService({ status: 'Active' });
      const rows = Array.isArray(issues) ? issues : (issues?.issues ?? []);
      const now = new Date();

      const overdue = rows
        .filter((i) => i.status !== 'Returned' && i.dueDate && new Date(i.dueDate) < now)
        .map((i) => ({
          ...i,
          daysOverdue: Math.floor((now - new Date(i.dueDate)) / 86400000),
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

      return { total: overdue.length, issues: overdue.slice(0, args.limit) };
    },
  }),

  /* -------------------------------------------------------------- academic */

  defineTool({
    name: 'getAcademicPerformance',
    keywords:
      'performance result grade score average pass rate marks best worst doing class subject academic achievement',
    description:
      'Average score by class and by subject, plus the overall pass rate, computed from result sheets.',
    input: z.object({}),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Class performance', icon: 'BarChart2', group: 'Academics' },
    handler: ({ req }) => invokeController(getAcademicPerformance, req),
  }),

  /* --------------------------------------------------------------- teacher */

  defineTool({
    name: 'getMyTeachingSummary',
    keywords:
      'my teaching workload classes subjects logs summary mine',
    description:
      "The signed-in teacher's own workload: class and subject counts, today's schedule, and teaching-log completion (total, completed, draft).",
    input: z.object({}),
    roles: ['teacher'],
    level: LEVEL.READ,
    // getTeacherDashboardKPIs resolves the Teacher record from req.user._id and
    // queries only that teacher's assignments and logs.
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My teaching summary', icon: 'NotebookPen', group: 'My work' },
    handler: ({ req }) => invokeController(getTeacherDashboardKPIs, req),
  }),

  defineTool({
    name: 'getMyTimetable',
    keywords:
      'my timetable schedule periods lessons today week mine',
    description: "The signed-in teacher's weekly timetable.",
    input: z.object({}),
    roles: ['teacher'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My timetable', icon: 'CalendarDays', group: 'My work' },
    handler: ({ req }) => invokeController(getTimetable, req, { params: { id: 'me' } }),
  }),

  /* ------------------------------------------------- phase 2: new insights */

  defineTool({
    name: 'getMissingTeachingLogs',
    emptyMessage:
      'Every active teacher has submitted a teaching log for that day.',
    keywords:
      'teaching log lesson record submitted missing pending diary journal teacher not submitted',
    description:
      "Which active teachers have not submitted a completed teaching log for a given day. Defaults to today. Use for 'who hasn't submitted today's log'.",
    input: z.object({ date: z.string().trim().optional() }),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Pending teaching logs', icon: 'NotebookPen', group: 'Teaching' },
    handler: ({ args }) => getMissingTeachingLogsService(args),
  }),

  defineTool({
    name: 'getTeacherWorkload',
    keywords:
      'teacher workload load period lesson busy teaches most assignment hours staff how many teachers',
    description:
      'Teaching load per teacher — number of assignments and timetable periods per week, with subject and class counts.',
    input: z.object({ termId: z.string().trim().optional() }),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Teacher workload', icon: 'Users', group: 'Teaching' },
    handler: ({ args }) => getTeacherWorkloadService(args),
  }),

  defineTool({
    name: 'getPendingMarks',
    emptyMessage:
      'All marks are entered for this term.',
    keywords:
      'marks pending missing outstanding not entered unentered result entry incomplete grading',
    description:
      'Class and subject combinations where marks are still outstanding for a term, with expected vs entered counts.',
    input: z.object({ termId: z.string().trim().optional() }),
    roles: ['admin', 'principal', 'academic_officer'],
    level: LEVEL.READ,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    quickAction: { label: 'Pending marks', icon: 'FileText', group: 'Academics' },
    handler: ({ args }) => getPendingMarksService(args),
  }),

  /* --------------------------------------- phase 3: exam intelligence */

  defineTool({
    name: 'checkExamSimilarity',
    keywords:
      'question exam similar duplicate repeat repeated originality asked before plagiarism copy',
    description:
      'Check whether an exam question repeats an earlier one. Detects both verbatim copies and the same question re-worded. Returns the closest previous questions.',
    input: z.object({
      text: z.string().trim().min(5).max(4000),
      subjectId: z.string().trim().optional(),
      classId: z.string().trim().optional(),
      topK: z.number().int().min(1).max(10).default(5),
    }),
    // Teachers need this for their own subjects. The bank holds question text
    // and paper metadata — no student data — so there is nothing to narrow per
    // teacher, and a teacher checking their draft against the archive is the
    // entire point of the feature.
    roles: ['admin', 'principal', 'academic_officer', 'teacher'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: {
      label: 'Check question originality',
      icon: 'Copy',
      group: 'Exams',
      prompt: 'Has this been asked before: ',
    },
    handler: ({ args }) => checkQuestionSimilarityService(args),
  }),

  defineTool({
    name: 'reviewExamQuality',
    keywords:
      'exam paper review quality check validate marks total structure',
    description:
      'Review a draft exam paper: mark totals, missing marks, questions repeated within the paper or from earlier papers, difficulty spread and topic coverage.',
    input: z.object({
      questions: z
        .array(
          z.object({
            text: z.string().trim().min(1).max(4000),
            marks: z.number().min(0).optional(),
            topic: z.string().trim().max(120).optional(),
            difficulty: z.enum(['easy', 'moderate', 'hard', 'unspecified']).optional(),
          })
        )
        .min(1)
        .max(100),
      expectedTotalMarks: z.number().min(0).optional(),
      subjectId: z.string().trim().optional(),
      classId: z.string().trim().optional(),
    }),
    roles: ['admin', 'principal', 'academic_officer', 'teacher'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    handler: ({ args }) => reviewExamQualityService(args),
  }),

  defineTool({
    name: 'addExamQuestions',
    keywords:
      'add bank store save question exam archive',
    description:
      'Add questions to the question bank so future papers can be checked against them. Questions already banked verbatim are skipped.',
    input: z.object({
      questions: z
        .array(
          z.object({
            text: z.string().trim().min(5).max(4000),
            marks: z.number().min(0).optional(),
            topic: z.string().trim().max(120).optional(),
            difficulty: z.enum(['easy', 'moderate', 'hard', 'unspecified']).optional(),
            questionType: z
              .enum(['short-answer', 'essay', 'multiple-choice', 'calculation', 'unspecified'])
              .optional(),
          })
        )
        .min(1)
        .max(100),
      meta: z
        .object({
          subjectId: z.string().trim().optional(),
          classId: z.string().trim().optional(),
          examId: z.string().trim().optional(),
          subjectName: z.string().trim().max(120).optional(),
          className: z.string().trim().max(120).optional(),
          academicYear: z.string().trim().max(40).optional(),
          term: z.string().trim().max(40).optional(),
          examType: z.string().trim().max(60).optional(),
        })
        .default({}),
    }),
    roles: ['admin', 'principal', 'academic_officer', 'teacher'],
    // DRAFT: writes to the bank, but banking a question has no effect on any
    // student, mark or paper. Nothing consequential happens.
    level: LEVEL.DRAFT,
    scope: SCOPE.SELF,
    tier: 'none',
    handler: ({ args, actor }) => addExamQuestionsService(args, actor.id),
  }),

  defineTool({
    name: 'generateExam',
    keywords:
      'generate create write make new exam paper test questions set draft compose',
    description:
      'Generate a draft examination paper for a subject and grade, covering given topics or those actually taught. Returns a draft with an automatic quality review — nothing is scheduled.',
    input: z.object({
      subject: z.string().trim().min(2).max(80),
      grade: z.string().trim().min(1).max(40),
      topics: z.array(z.string().trim().max(120)).max(20).default([]),
      questionCount: z.number().int().min(1).max(40).default(10),
      totalMarks: z.number().int().min(1).max(200).default(100),
      difficulty: z.enum(['easy', 'moderate', 'hard']).default('moderate'),
      classId: z.string().trim().optional(),
      subjectId: z.string().trim().optional(),
    }),
    roles: ['admin', 'principal', 'academic_officer', 'teacher'],
    // DRAFT: produces a paper for review. Nothing is written to the Exam
    // collection and no exam is scheduled — the teacher creates the real paper
    // through the Examinations module.
    level: LEVEL.DRAFT,
    scope: SCOPE.SELF,
    // The one genuinely model-shaped task in the assistant; composing new
    // questions cannot be done deterministically.
    tier: 'advanced',
    quickAction: {
      label: 'Generate an exam',
      icon: 'FileText',
      group: 'Exams',
      // Seeded as a complete, editable example rather than a fill-in-the-blank
      // skeleton — the user replaces the parts they want to change.
      prompt: 'Generate a Biology exam for Grade 8 covering ',
    },
    handler: ({ args, actor }) => generateExamService({ ...args, actor }),
  }),

  /* ------------------------------------------ phase 4: student and parent */

  /*
   * These call the portal controllers, which resolve the record from
   * req.user themselves — resolveStudent() falls back to
   * Student.findOne({ userId: req.user._id }), and the parent endpoints
   * enforce the guardian-to-child link. Passing the real req through
   * invokeController preserves both, so a student can only ever see their own
   * data and a parent only their own children's.
   */

  defineTool({
    name: 'getMyGrades',
    keywords: 'my result grade mark score report card performance did i pass exam',
    description: "The signed-in student's own exam results.",
    input: z.object({}),
    roles: ['student'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My results', icon: 'BarChart2', group: 'My record' },
    handler: ({ req }) => invokeController(portalMyResults, req),
  }),

  defineTool({
    name: 'getMyAttendanceRecord',
    keywords: 'my attendance absent present late days missed record',
    description: "The signed-in student's own attendance record and summary.",
    input: z.object({}),
    roles: ['student'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My attendance', icon: 'ClipboardCheck', group: 'My record' },
    handler: ({ req }) => invokeController(portalMyAttendance, req),
  }),

  defineTool({
    name: 'getMyFees',
    keywords: 'my fee fees invoice balance owe payment paid outstanding bill',
    description: "The signed-in student's own invoices and outstanding balance.",
    input: z.object({}),
    roles: ['student'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My fees', icon: 'DollarSign', group: 'My record' },
    handler: ({ req }) => invokeController(portalMyInvoices, req),
  }),

  defineTool({
    name: 'getMyLibraryLoans',
    keywords: 'my library book borrowed loan due return fine',
    description: "The signed-in student's own library loans and fines.",
    input: z.object({}),
    roles: ['student'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My library books', icon: 'BookMarked', group: 'My record' },
    handler: ({ req }) => invokeController(portalMyLibrary, req),
  }),

  defineTool({
    name: 'getMyClassSchedule',
    keywords: 'my timetable schedule class lesson period today week',
    description: "The signed-in student's own class timetable.",
    input: z.object({}),
    roles: ['student'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My timetable', icon: 'CalendarDays', group: 'My record' },
    handler: ({ req }) => invokeController(portalMyTimetable, req),
  }),

  defineTool({
    name: 'getMyChildren',
    keywords: 'my child children son daughter kid linked students',
    description: 'The children linked to the signed-in parent or guardian.',
    input: z.object({}),
    roles: ['parent'],
    level: LEVEL.READ,
    scope: SCOPE.SELF,
    tier: 'none',
    quickAction: { label: 'My children', icon: 'Users', group: 'My family' },
    handler: ({ req }) => invokeController(portalMyChildren, req),
  }),

  defineTool({
    name: 'getChildAttendance',
    keywords: 'child attendance absent present late my son daughter missed',
    description:
      "A linked child's attendance record. Use getMyChildren first to get the child's id.",
    input: z.object({ studentId: z.string().trim().min(1) }),
    roles: ['parent'],
    // getLinkedChild() rejects any student not linked to this guardian.
    scope: SCOPE.SELF,
    level: LEVEL.READ,
    tier: 'none',
    handler: ({ req, args }) =>
      invokeController(portalChildAttendance, req, { params: { studentId: args.studentId } }),
  }),

  defineTool({
    name: 'getChildFees',
    keywords: 'child fee fees invoice balance owe payment school bill my son daughter',
    description: "A linked child's invoices and balance. Use getMyChildren first for the id.",
    input: z.object({ studentId: z.string().trim().min(1) }),
    roles: ['parent'],
    scope: SCOPE.SELF,
    level: LEVEL.READ,
    tier: 'none',
    handler: ({ req, args }) =>
      invokeController(portalChildInvoices, req, { params: { studentId: args.studentId } }),
  }),

  defineTool({
    name: 'getChildResults',
    keywords: 'child result grade mark score report card my son daughter performance',
    description: "A linked child's exam results. Use getMyChildren first for the id.",
    input: z.object({ studentId: z.string().trim().min(1) }),
    roles: ['parent'],
    scope: SCOPE.SELF,
    level: LEVEL.READ,
    tier: 'none',
    handler: ({ req, args }) =>
      invokeController(portalChildResults, req, { params: { studentId: args.studentId } }),
  }),

  /* ------------------------------------------- phase 2: draft and confirm */

  defineTool({
    name: 'draftAnnouncement',
    keywords:
      'announcement notice draft compose write message parents circular',
    description:
      'Compose an announcement and save it as an unpublished draft. Nothing is sent to anyone until it is published separately.',
    input: z.object({
      title: z.string().trim().min(3).max(200),
      content: z.string().trim().min(10).max(5000),
      category: z.string().trim().max(60).default('General'),
      targetRole: z
        .enum(['admin', 'teacher', 'student', 'parent', 'staff', 'all'])
        .default('all'),
    }),
    roles: ['admin', 'principal'],
    // DRAFT: writes a record, but the record has no effect on anyone until a
    // separate CONFIRM-level publish runs. Nothing is delivered here.
    level: LEVEL.DRAFT,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',
    // Intentionally not a quick action. Composing announcement prose is the one
    // genuinely model-shaped task here, and with no provider key configured a
    // button for it would only ever lead to a validation error. It remains
    // reachable by typing once a key is set.
    handler: async ({ args, actor }) => {
      const notice = await createNoticeService(
        {
          title: args.title,
          content: args.content,
          category: args.category,
          target_role: args.targetRole,
          is_published: false,
        },
        actor.id
      );

      return {
        noticeId: notice._id.toString(),
        noticeNo: notice.notice_no,
        title: notice.title,
        category: notice.category,
        targetRole: notice.target_role,
        isPublished: notice.is_published,
        note: 'Saved as a draft. It has not been sent to anyone.',
      };
    },
  }),

  defineTool({
    name: 'publishAnnouncement',
    keywords:
      'publish announcement notice send release broadcast',
    description:
      'Publish an existing draft announcement, which notifies its target audience. Requires explicit confirmation.',
    input: z.object({ noticeId: z.string().trim().min(1) }),
    roles: ['admin', 'principal'],
    level: LEVEL.CONFIRM,
    scope: SCOPE.PRIVILEGED,
    tier: 'none',

    /**
     * Built server-side from live data so the user sees the real blast radius.
     *
     * This matters here specifically: publishNoticeService falls back to
     * notifying *every user* when a notice has no explicit targets, so the
     * recipient count is the single most important thing to state before
     * anyone clicks confirm.
     */
    buildPreview: async ({ args }) => {
      const notice = await getNoticeByIdService(args.noticeId);

      if (notice.is_published) {
        throw new AppError('That announcement has already been published.', 409);
      }

      const explicitTargets = (notice.target_users ?? []).length;
      const recipientCount = explicitTargets > 0 ? explicitTargets : await User.countDocuments({});

      return {
        title: `Publish "${notice.title}"`,
        summary:
          `This will publish announcement ${notice.notice_no} and create an in-app ` +
          `notification for each recipient. Publishing cannot be undone from here.`,
        details: {
          noticeNo: notice.notice_no,
          announcementTitle: notice.title,
          category: notice.category,
          targetRole: notice.target_role,
          recipients: recipientCount,
          targeting:
            explicitTargets > 0
              ? `${explicitTargets} specifically targeted user(s)`
              : 'No specific targets set — every user will be notified',
          emailDelivery: 'Not sent: the email gateway is a stub in this environment',
        },
        impact: `Notify ${recipientCount} ${recipientCount === 1 ? 'person' : 'people'}`,
      };
    },

    handler: async ({ args, actor }) => {
      const notice = await publishNoticeService(args.noticeId, actor.id);
      return {
        noticeId: notice._id.toString(),
        noticeNo: notice.notice_no,
        title: notice.title,
        isPublished: notice.is_published,
        publishedAt: notice.published_at,
      };
    },
  }),
];

export default tools;
