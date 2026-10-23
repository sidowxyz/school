import { z } from 'zod';

import { defineTool, LEVEL, SCOPE } from './defineTool.js';
import { invokeController } from '../invokeController.js';

// Existing controllers — reused, never reimplemented.
import {
  getAdminDashboardKPIs,
  getTeacherDashboardKPIs,
  getFinanceDashboardKPIs,
} from '../../controllers/analyticsController.js';
import { getAttendance, getMonthlyReport } from '../../controllers/attendanceController.js';
import { getTimetable } from '../../controllers/teacherController.js';
import {
  getMyAttendance as portalMyAttendance,
  getMyInvoices as portalMyInvoices,
  getMyTimetable as portalMyTimetable,
} from '../../controllers/studentPortalController.js';
import {
  getMyChildren as portalMyChildren,
  getChildAttendance as portalChildAttendance,
  getChildInvoices as portalChildInvoices,
} from '../../controllers/parentPortalController.js';

// Existing services — called directly where a service layer exists.
import { getAllStudentsService, getStudentByIdService } from '../../services/studentService.js';
import {
  getMissingTeachingLogsService,
  getTeacherWorkloadService,
} from '../../services/aiInsightsService.js';

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
      "Today's whole-school overview: student/teacher/class counts, attendance rate, fee collection totals and the school calendar.",
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
];

export default tools;
