import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import StudentAttendance from '../models/StudentAttendance.js';
import StudentInvoice from '../models/StudentInvoice.js';
import Exam from '../models/Exam.js';
import ExamMarkSubmission from '../models/ExamMarkSubmission.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import PromotionRecord from '../models/PromotionRecord.js';
import { getClassResults } from '../services/examResultService.js';
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
 * Most recently published examination sitting across the whole school, or
 * null if nothing has been published yet. Used to seed the Academic
 * Performance tiles with real headline numbers instead of link-only tiles.
 *
 * We pick the exam behind the most recent `publishedAt` submission — an
 * examination is "published" once its first ExamMarkSubmission is published,
 * which is the earliest point real results are visible to anyone.
 */
const findMostRecentPublishedExam = async () => {
  const latest = await ExamMarkSubmission.findOne({ status: 'published' })
    .sort({ publishedAt: -1 })
    .select('exam_id')
    .populate({ path: 'exam_id', select: 'ex_name class_id exam_period_id batch_id' });
  return latest?.exam_id ?? null;
};

/**
 * Aggregate performance headline for one examination across every class
 * that took it — the number that goes on the "Class Performance" tile.
 * Returns `null` when nothing measurable is published for that exam yet.
 */
const summarisePublishedExam = async (exam) => {
  if (!exam) return null;

  // Prefer the batch_id when available — the exam might have been fanned
  // out across grades, and we want every grade's students in one number.
  const scope = exam.batch_id ? { batch_id: exam.batch_id } : { exam_id: String(exam._id) };
  const data = await getClassResults(scope);
  if (!data.results.length) return null;

  return {
    examId: String(exam._id),
    examName: exam.ex_name,
    students: data.summary.total,
    passRate: data.summary.passPercentage,
    classAverage: data.summary.classAverage
  };
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
    upcomingExams,
    completedExamsThisMonth,
    submissions,
    unassignedSubjects,
    thisMonthPromotions,
    // Real headline numbers for the Academic Performance tiles: the school's
    // most recently published examination. `null` if nothing is published,
    // which keeps those tiles link-only rather than showing fake zeros.
    latestPublishedExam
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
    Exam.countDocuments({ exam_date: { $gte: now } }),
    Exam.countDocuments({ exam_date: { $gte: startOfMonth, $lt: now } }),
    // One query, all statuses — the client can show a "3 pending review"
    // sub-line without a second round-trip.
    ExamMarkSubmission.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Active subjects with no teacher assigned — captured here for the tile,
    // links out to the detailed report for the actual list.
    (async () => {
      const [assignments, activeSubjectIds] = await Promise.all([
        TeacherAssignment.distinct('subjectId'),
        (await import('../models/Subject.js')).default.distinct('_id', { status: 'active' })
      ]);
      const assigned = new Set(assignments.map(String));
      return activeSubjectIds.filter((id) => !assigned.has(String(id))).length;
    })(),
    // Promotion activity this month — a proxy for "is the academic office
    // running the promotion workflow?" The detailed report has the audit.
    PromotionRecord.countDocuments({ performed_at: { $gte: startOfMonth } }),
    findMostRecentPublishedExam()
  ]);

  // The performance-headline aggregation reads ExamMarkSubmission again,
  // so it runs after the exam has been found — cheap enough to sit outside
  // the top-level Promise.all rather than making that block more complex.
  const performance = await summarisePublishedExam(latestPublishedExam);

  const totals = invoiceTotals[0] ?? { expected: 0, collected: 0, outstanding: 0 };

  // Attendance rollup
  const attCounts = attendanceThisMonth.reduce(
    (acc, row) => ({ ...acc, [row._id]: row.count }),
    { Present: 0, Absent: 0, Late: 0, Excused: 0 }
  );
  const attended = attCounts.Present + attCounts.Late;
  const attTotal = attended + attCounts.Absent;
  const attendanceRate = percent(attended, attTotal);

  // Marks-submission rollup
  const submissionCounts = submissions.reduce(
    (acc, row) => ({ ...acc, [row._id]: row.count }),
    { draft: 0, submitted: 0, approved: 0, returned: 0, published: 0 }
  );

  // Each tile carries a drillTo report id — the client maps this to the
  // same report viewer used for everything else. Missing published results
  // is derived from finished exams minus published submissions.
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
      group: 'Academic Performance',
      // When any examination has published results, the tiles below carry the
      // headline number for the most recent one and name it in the hint —
      // the drill-through still opens the report where the officer can pick a
      // different examination. Before anything is published, they degrade to
      // link tiles rather than showing a zero that would read as failure.
      description: performance
        ? `Latest published: ${performance.examName}`
        : 'No examinations have published results yet',
      metrics: [
        {
          label: 'Overall Pass Rate',
          value: performance ? performance.passRate : null,
          hint: performance
            ? `${performance.students} student${performance.students === 1 ? '' : 's'} in ${performance.examName}`
            : 'Open report to select an examination',
          drillTo: 'performance-pass-fail',
          format: performance ? 'percent' : 'link'
        },
        {
          label: 'Class Average',
          value: performance ? performance.classAverage : null,
          hint: performance
            ? `Average across every class in ${performance.examName}`
            : 'Open report to select an examination',
          drillTo: 'performance-by-class',
          format: performance ? 'percent' : 'link'
        },
        {
          label: 'Subject Performance',
          value: null,
          // Subject-level detail is inherently multi-row (one number per
          // subject); the summary tile stays a link into the detail.
          hint: performance
            ? `Latest: ${performance.examName}`
            : 'Open report to select an examination',
          drillTo: 'performance-by-subject',
          format: 'link'
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
      group: 'Examinations',
      description: 'Scheduling and marks workflow',
      metrics: [
        {
          label: 'Upcoming',
          value: upcomingExams,
          drillTo: 'exam-pending',
          format: 'count'
        },
        {
          label: 'Completed This Month',
          value: completedExamsThisMonth,
          drillTo: 'exam-completed',
          format: 'count'
        },
        {
          label: 'Marks Awaiting Review',
          value: submissionCounts.submitted,
          hint: `${submissionCounts.approved} approved · ${submissionCounts.published} published`,
          drillTo: 'exam-result-summaries',
          format: 'count'
        },
        {
          label: 'Missing Marks',
          value: null,
          hint: 'Open report for the list',
          drillTo: 'exam-missing-marks',
          format: 'link'
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
        },
        {
          label: 'Promotion Activity',
          value: thisMonthPromotions,
          hint: 'This month',
          drillTo: 'promotion-history',
          format: 'count'
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
