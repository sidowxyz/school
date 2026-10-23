import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import StudentAttendance from '../models/StudentAttendance.js';
import StudentInvoice from '../models/StudentInvoice.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import Subject from '../models/Subject.js';
import { round1, percent } from './helpers.js';

/**
 * Management Reports dashboard (§14.15) — the summary front page for
 * principal (and admin). Distinct from a detailed report: this is a fixed
 * set of headline tiles with drill-down pointers into the detailed reports
 * that produced each number. The client renders it as tiles; clicking one
 * opens the underlying report in the existing viewer, honouring the same
 * role-based access.
 *
 * §14.20 "summary → drill-down" is the pattern here: the tile shows one
 * number; the drill-down report shows the rows behind it. Each metric
 * carries a `drillTo` report id, which the client maps to the same report
 * viewer used for everything else — no separate rendering path.
 */

/**
 * A student's admission is "new this academic year" when their record was
 * created in the last 60 days — a rough proxy since we don't store a
 * per-student enrolment year at the profile level (StudentClass carries
 * year enrolment; this is the profile-level heuristic used consistently by
 * the Student Enrolment Trend report).
 */
const RECENT_ADMISSION_DAYS = 60;

const dateNDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Build the dashboard payload. Every metric is computed against live data;
 * empty schools return zero, never fabricated placeholders.
 */
export const buildManagementSummary = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fire every independent query in parallel — the dashboard is intentionally
  // load-once so principals see one coherent snapshot.
  const [
    totalStudents,
    newAdmissions,
    withdrawn,
    totalTeachers,
    totalClasses,
    invoiceTotals,
    attendanceThisMonth,
    lowAttendance,
    unassignedSubjects
  ] = await Promise.all([
    Student.countDocuments({ isDeleted: { $ne: true }, status: 'Active' }),
    Student.countDocuments({
      isDeleted: { $ne: true },
      admissionType: 'Regular',
      createdAt: { $gte: dateNDaysAgo(RECENT_ADMISSION_DAYS) }
    }),
    Student.countDocuments({
      $or: [{ isDeleted: true }, { status: { $in: ['Inactive', 'Suspended'] } }]
    }),
    Teacher.countDocuments({ isDeleted: { $ne: true } }),
    Class.countDocuments(),
    // One aggregate for the finance headline row.
    StudentInvoice.aggregate([
      {
        $group: {
          _id: null,
          expected: { $sum: '$invoice_amount' },
          collected: { $sum: '$paid_amount' },
          outstanding: { $sum: '$balance' }
        }
      }
    ]),
    // Attendance rate for the current month — Present + Late count as
    // present; Excused is left out of the denominator (see teacherReports).
    StudentAttendance.aggregate([
      { $match: { att_date: { $gte: startOfMonth } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Students below the standard 75% attendance threshold this month.
    // Only counted when a student has ≥5 records so a student who was
    // absent once on a slow attendance day isn't flagged as "low".
    StudentAttendance.aggregate([
      { $match: { att_date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$studentId',
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] }
          }
        }
      },
      { $match: { total: { $gte: 5 } } },
      {
        $project: {
          rate: { $multiply: [{ $divide: ['$present', '$total'] }, 100] }
        }
      },
      { $match: { rate: { $lt: 75 } } },
      { $count: 'count' }
    ]),
    // Active subjects with no teacher assigned — captured here for the tile,
    // links out to the detailed report for the actual list.
    (async () => {
      const [assignments, activeSubjectIds] = await Promise.all([
        TeacherAssignment.distinct('subjectId'),
        Subject.distinct('_id', { status: 'active' })
      ]);
      const assigned = new Set(assignments.map(String));
      return activeSubjectIds.filter((id) => !assigned.has(String(id))).length;
    })()
  ]);

  const totals = invoiceTotals[0] ?? { expected: 0, collected: 0, outstanding: 0 };

  // Attendance rollup
  const attCounts = attendanceThisMonth.reduce(
    (acc, row) => ({ ...acc, [row._id]: row.count }),
    { Present: 0, Absent: 0, Late: 0, Excused: 0 }
  );
  const attended = attCounts.Present + attCounts.Late;
  const attTotal = attended + attCounts.Absent;
  const attendanceRate = percent(attended, attTotal);

  // Each tile carries a drillTo report id — the client maps this to the
  // same report viewer used for everything else.
  const tiles = [
    {
      group: 'Students',
      description: 'Enrolment posture',
      metrics: [
        {
          label: 'Total Enrolment',
          value: totalStudents,
          drillTo: 'students-total',
          format: 'count'
        },
        {
          label: 'New Admissions (last 60 days)',
          value: newAdmissions,
          drillTo: 'students-new-admissions',
          format: 'count'
        },
        {
          label: 'Withdrawn / Inactive',
          value: withdrawn,
          drillTo: 'students-withdrawn',
          format: 'count'
        },
        {
          label: 'By Class',
          value: totalClasses,
          hint: `${totalClasses} class${totalClasses === 1 ? '' : 'es'}`,
          drillTo: 'students-by-class',
          format: 'count'
        }
      ]
    },
    {
      group: 'Attendance',
      description: 'Current month',
      metrics: [
        {
          label: 'Overall Attendance',
          value: attendanceRate,
          hint: `${attended.toLocaleString()} of ${attTotal.toLocaleString()} marked`,
          drillTo: 'teaching-attendance',
          format: 'percent'
        },
        {
          label: 'Students Below 75%',
          value: lowAttendance[0]?.count ?? 0,
          drillTo: 'teaching-low-attendance',
          format: 'count'
        }
      ]
    },
    {
      group: 'Finance',
      description: 'Live billing ledger',
      metrics: [
        {
          label: 'Expected Revenue',
          value: totals.expected,
          drillTo: 'finance-dashboard',
          format: 'money'
        },
        {
          label: 'Collected Revenue',
          value: totals.collected,
          drillTo: 'finance-collection-summary',
          format: 'money'
        },
        {
          label: 'Outstanding Fees',
          value: totals.outstanding,
          drillTo: 'finance-outstanding-students',
          format: 'money'
        },
        {
          label: 'Collection Rate',
          value: percent(totals.collected, totals.expected),
          drillTo: 'finance-dashboard',
          format: 'percent'
        }
      ]
    },
    {
      group: 'Teachers',
      description: 'Staffing and coverage',
      metrics: [
        {
          label: 'Total Teachers',
          value: totalTeachers,
          drillTo: 'assignments-workload',
          format: 'count'
        },
        {
          label: 'Unassigned Subjects',
          value: unassignedSubjects,
          drillTo: 'assignments-unassigned-subjects',
          format: 'count'
        },
        {
          label: 'Teacher Workload',
          value: null,
          hint: 'Open report for periods per teacher',
          drillTo: 'assignments-workload',
          format: 'link'
        }
      ]
    }
  ];

  return {
    generatedAt: now.toISOString(),
    coverage: {
      // Kept alongside so the client can render "as of" hints on tiles the
      // user might otherwise interpret as year-to-date.
      currentMonthStart: startOfMonth.toISOString(),
      newAdmissionWindowDays: RECENT_ADMISSION_DAYS
    },
    tiles: tiles.map((tile) => ({
      ...tile,
      metrics: tile.metrics.map((metric) => ({
        ...metric,
        // Round percentages consistently for display; other formats untouched.
        value: metric.format === 'percent' && typeof metric.value === 'number'
          ? round1(metric.value)
          : metric.value
      }))
    }))
  };
};
