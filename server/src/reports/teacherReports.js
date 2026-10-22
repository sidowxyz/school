import Student from '../models/Student.js';
import StudentAttendance from '../models/StudentAttendance.js';
import Exam from '../models/Exam.js';
import ExamMarkSubmission from '../models/ExamMarkSubmission.js';
import { formatDuration, timeToMinutes } from '../utils/examTime.js';
import {
  FILTERS,
  dateRange,
  fullName,
  percent,
  round1,
  resolveTeacherScope,
  scopedClassIds
} from './helpers.js';

/**
 * Reports for teaching staff.
 *
 * Every one runs inside the scope returned by resolveTeacherScope — the
 * classes and subjects the teacher is actually assigned to. A teacher cannot
 * widen that scope with a filter, and nothing here touches fees, invoices,
 * payroll or school-wide administrative data.
 */

const TEACHING_ROLES = ['teacher', 'admin', 'principal', 'academic_officer'];

const report = (group, id, title, description, filters, run) => ({
  id,
  title,
  description,
  group,
  department: 'teaching',
  roles: TEACHING_ROLES,
  filters,
  run
});

const NO_ASSIGNMENTS = {
  label: 'No classes are assigned to you yet. Ask the academic office to assign your subjects.'
};

/** Days ordered as a school week, so timetables read naturally. */
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const sortSlots = (a, b) =>
  DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) ||
  (timeToMinutes(a.start) ?? 0) - (timeToMinutes(b.start) ?? 0);

// ============================================================
// Teaching Reports
// ============================================================

const teachingReports = [
  report(
    'My Teaching',
    'teaching-my-classes',
    'Assigned Classes',
    'The classes you teach, with roster size and the subjects you take them for',
    [],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      if (!scope.assignments.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const counts = await Student.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$classId', count: { $sum: 1 } } }
      ]);
      const countBy = new Map(counts.map((c) => [String(c._id), c.count]));

      const byClass = new Map();
      for (const a of scope.assignments) {
        const key = String(a.classId?._id);
        if (!byClass.has(key)) {
          byClass.set(key, {
            className: a.classId?.cl_name ?? '—',
            sectionName: a.sectionId?.name ?? 'All sections',
            students: countBy.get(key) ?? 0,
            subjects: new Set(),
            periods: 0
          });
        }
        const entry = byClass.get(key);
        if (a.subjectId?.sub_name) entry.subjects.add(a.subjectId.sub_name);
        entry.periods += a.timetableSlots?.length ?? 0;
      }

      const rows = Array.from(byClass.values())
        .map((entry) => ({ ...entry, subjects: Array.from(entry.subjects).sort().join(', ') }))
        .sort((a, b) => a.className.localeCompare(b.className));

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'students', label: 'Students', type: 'number' },
          { key: 'subjects', label: 'Subjects You Teach' },
          { key: 'periods', label: 'Periods/Week', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Classes', value: rows.length },
          { label: 'Students', value: rows.reduce((sum, r) => sum + r.students, 0) }
        ]
      };
    }
  ),

  report(
    'My Teaching',
    'teaching-my-subjects',
    'Assigned Subjects',
    'The subjects you teach and the classes you take them with',
    [],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      if (!scope.assignments.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const bySubject = new Map();
      for (const a of scope.assignments) {
        const key = String(a.subjectId?._id);
        if (!bySubject.has(key)) {
          bySubject.set(key, { subject: a.subjectId?.sub_name ?? '—', classes: new Set(), periods: 0 });
        }
        const entry = bySubject.get(key);
        if (a.classId?.cl_name) entry.classes.add(a.classId.cl_name);
        entry.periods += a.timetableSlots?.length ?? 0;
      }

      const rows = Array.from(bySubject.values())
        .map((entry) => ({
          subject: entry.subject,
          classCount: entry.classes.size,
          classes: Array.from(entry.classes).sort().join(', '),
          periods: entry.periods
        }))
        .sort((a, b) => a.subject.localeCompare(b.subject));

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'classCount', label: 'Classes', type: 'number' },
          { key: 'classes', label: 'Class List' },
          { key: 'periods', label: 'Periods/Week', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Subjects', value: rows.length }]
      };
    }
  ),

  report(
    'My Teaching',
    'teaching-my-timetable',
    'Teaching Timetable',
    'Your weekly teaching schedule, in day and period order',
    [],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      if (!scope.assignments.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const rows = [];
      for (const a of scope.assignments) {
        for (const slot of a.timetableSlots ?? []) {
          if (!slot.periodId) continue; // period deleted — nothing to show
          rows.push({
            day: slot.day,
            period: slot.periodId.per_name,
            start: slot.periodId.time_in,
            end: slot.periodId.time_out,
            subject: a.subjectId?.sub_name ?? '—',
            className: a.classId?.cl_name ?? '—',
            sectionName: a.sectionId?.name ?? '—'
          });
        }
      }
      rows.sort(sortSlots);

      return {
        columns: [
          { key: 'day', label: 'Day' },
          { key: 'period', label: 'Period' },
          { key: 'start', label: 'Start' },
          { key: 'end', label: 'End' },
          { key: 'subject', label: 'Subject' },
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' }
        ],
        rows,
        summary: [{ label: 'Periods per Week', value: rows.length }]
      };
    }
  ),

  report(
    'My Teaching',
    'teaching-students-per-class',
    'Students per Class',
    'The roster of each class you teach',
    [FILTERS.class],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      const classIds = scopedClassIds(scope, filters);
      if (!classIds.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const students = await Student.find({ classId: { $in: classIds }, isDeleted: { $ne: true } })
        .select('firstName lastName admissionNumber classId sectionId gender')
        .populate('classId', 'cl_name')
        .populate('sectionId', 'name')
        .sort({ admissionNumber: 1 });

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'gender', label: 'Gender' }
        ],
        rows: students.map((s) => ({
          rollNo: s.admissionNumber,
          name: fullName(s),
          className: s.classId?.cl_name ?? '—',
          sectionName: s.sectionId?.name ?? '—',
          gender: s.gender ?? '—'
        })),
        summary: [
          { label: 'Students', value: students.length },
          { label: 'Classes', value: classIds.length }
        ]
      };
    }
  ),

  report(
    'My Teaching',
    'teaching-attendance',
    'Student Attendance',
    'Attendance records for your classes over the selected period',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      const classIds = scopedClassIds(scope, filters);
      if (!classIds.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const students = await Student.find({ classId: { $in: classIds }, isDeleted: { $ne: true } })
        .select('firstName lastName admissionNumber classId')
        .populate('classId', 'cl_name');
      const studentBy = new Map(students.map((s) => [String(s._id), s]));

      const range = dateRange(filters);
      const records = await StudentAttendance.find({
        studentId: { $in: students.map((s) => s._id) },
        ...(range ? { att_date: range } : {})
      })
        .populate('periodId', 'per_name')
        .sort({ att_date: -1 })
        .limit(2000);

      const counts = records.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        columns: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'period', label: 'Period' },
          { key: 'status', label: 'Status' }
        ],
        rows: records.map((r) => {
          const student = studentBy.get(String(r.studentId));
          return {
            date: r.att_date,
            rollNo: student?.admissionNumber ?? '—',
            name: fullName(student),
            className: student?.classId?.cl_name ?? '—',
            period: r.periodId?.per_name ?? '—',
            status: r.status
          };
        }),
        summary: [
          { label: 'Records', value: records.length },
          ...Object.entries(counts).map(([label, value]) => ({ label, value }))
        ]
      };
    }
  ),

  report(
    'My Teaching',
    'teaching-attendance-percentage',
    'Attendance Percentage',
    'Each student\'s attendance rate across your classes',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters, { user }) => {
      const rows = await attendanceRates(filters, user);
      if (!Array.isArray(rows)) return rows;

      const overall = rows.length ? round1(rows.reduce((sum, r) => sum + r.rate, 0) / rows.length) : 0;

      return {
        columns: ATTENDANCE_RATE_COLUMNS,
        rows: rows.sort((a, b) => b.rate - a.rate),
        summary: [
          { label: 'Students', value: rows.length },
          { label: 'Average Attendance', value: `${overall}%` }
        ]
      };
    }
  ),

  report(
    'My Teaching',
    'teaching-low-attendance',
    'Students with Low Attendance',
    'Students falling below the attendance threshold',
    [FILTERS.class, { ...FILTERS.threshold, label: 'Attendance Threshold %', default: 75 }, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters, { user }) => {
      const rows = await attendanceRates(filters, user);
      if (!Array.isArray(rows)) return rows;

      const threshold = Number(filters.threshold ?? 75);
      const low = rows.filter((r) => r.present + r.absent > 0 && r.rate < threshold);

      return {
        columns: ATTENDANCE_RATE_COLUMNS,
        rows: low.sort((a, b) => a.rate - b.rate),
        summary: [
          { label: 'Below Threshold', value: low.length },
          { label: 'Threshold', value: `${threshold}%` },
          { label: 'Students Tracked', value: rows.length }
        ]
      };
    }
  )
];

const ATTENDANCE_RATE_COLUMNS = [
  { key: 'rollNo', label: 'Admission No' },
  { key: 'name', label: 'Student' },
  { key: 'className', label: 'Class' },
  { key: 'present', label: 'Present', type: 'number' },
  { key: 'absent', label: 'Absent', type: 'number' },
  { key: 'late', label: 'Late', type: 'number' },
  { key: 'rate', label: 'Attendance %', type: 'number' }
];

/** Per-student attendance rates within the teacher's scope. */
const attendanceRates = async (filters, user) => {
  const scope = await resolveTeacherScope(user, filters);
  const classIds = scopedClassIds(scope, filters);
  if (!classIds.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

  const students = await Student.find({ classId: { $in: classIds }, isDeleted: { $ne: true } })
    .select('firstName lastName admissionNumber classId')
    .populate('classId', 'cl_name');

  const range = dateRange(filters);
  const records = await StudentAttendance.find({
    studentId: { $in: students.map((s) => s._id) },
    ...(range ? { att_date: range } : {})
  }).select('studentId status');

  const tally = new Map();
  for (const record of records) {
    const key = String(record.studentId);
    if (!tally.has(key)) tally.set(key, { present: 0, absent: 0, late: 0, excused: 0 });
    const entry = tally.get(key);
    if (record.status === 'Present') entry.present += 1;
    else if (record.status === 'Absent') entry.absent += 1;
    else if (record.status === 'Late') entry.late += 1;
    else entry.excused += 1;
  }

  return students.map((student) => {
    const entry = tally.get(String(student._id)) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    // Late still counts as attending; excused is left out of the denominator.
    const attended = entry.present + entry.late;
    const total = attended + entry.absent;
    return {
      rollNo: student.admissionNumber,
      name: fullName(student),
      className: student.classId?.cl_name ?? '—',
      present: entry.present,
      absent: entry.absent,
      late: entry.late,
      rate: percent(attended, total)
    };
  });
};

// ============================================================
// Assessment Reports
// ============================================================

/** The teacher's own marks submissions, optionally narrowed by class. */
const mySubmissions = async (filters, user, extra = {}) => {
  const scope = await resolveTeacherScope(user, filters);
  if (!scope.assignments.length) return { scope, submissions: null };

  const classIds = scopedClassIds(scope, filters);
  const submissions = await ExamMarkSubmission.find({
    class_id: { $in: classIds },
    subject_id: { $in: scope.subjectIds },
    ...extra
  })
    .populate({ path: 'exam_id', select: 'ex_name exam_date total_marks pass_marks' })
    .populate('class_id', 'cl_name')
    .populate('subject_id', 'sub_name')
    .populate({ path: 'entries.student', select: 'firstName lastName admissionNumber' })
    .sort({ updatedAt: -1 });

  return { scope, submissions };
};

const submissionStats = (sub) => {
  const marked = sub.entries.filter((e) => e.marks !== null && e.marks !== undefined);
  const passMark = sub.pass_marks ?? sub.max_marks / 2;
  const passing = marked.filter((e) => e.marks >= passMark).length;
  return {
    marked: marked.length,
    total: sub.entries.length,
    passing,
    failing: marked.length - passing,
    average: marked.length ? round1(marked.reduce((sum, e) => sum + e.marks, 0) / marked.length) : 0,
    passMark
  };
};

const assessmentReports = [
  report(
    'Assessment',
    'assessment-marks-entered',
    'Marks Entered',
    'Marks you have saved, submitted or had published',
    [FILTERS.class],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(filters, user);
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const rows = submissions.map((sub) => {
        const stats = submissionStats(sub);
        return {
          examName: sub.exam_id?.ex_name ?? '—',
          className: sub.class_id?.cl_name ?? '—',
          subject: sub.subject_id?.sub_name ?? '—',
          entered: `${stats.marked}/${stats.total}`,
          average: stats.average,
          status: sub.status,
          updated: sub.updatedAt
        };
      });

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'entered', label: 'Entered' },
          { key: 'average', label: 'Average', type: 'number' },
          { key: 'status', label: 'Status' },
          { key: 'updated', label: 'Last Updated', type: 'date' }
        ],
        rows,
        summary: [
          { label: 'Submissions', value: rows.length },
          { label: 'Published', value: rows.filter((r) => r.status === 'published').length },
          { label: 'Awaiting Approval', value: rows.filter((r) => r.status === 'submitted').length }
        ]
      };
    }
  ),

  report(
    'Assessment',
    'assessment-marks-pending',
    'Marks Pending',
    'Examinations you still owe marks for, and marks returned to you for correction',
    [FILTERS.class],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      if (!scope.assignments.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const classIds = scopedClassIds(scope, filters);
      const exams = await Exam.find({
        class_id: { $in: classIds },
        subject_id: { $in: scope.subjectIds }
      })
        .populate('class_id', 'cl_name')
        .populate('subject_id', 'sub_name')
        .sort({ exam_date: 1 });

      const submissions = await ExamMarkSubmission.find({
        exam_id: { $in: exams.map((e) => e._id) }
      }).select('exam_id status entries returnReason');
      const byExam = new Map(submissions.map((s) => [String(s.exam_id), s]));

      const rows = [];
      for (const exam of exams) {
        const sub = byExam.get(String(exam._id));
        const marked = sub?.entries.filter((e) => e.marks !== null).length ?? 0;
        const total = sub?.entries.length ?? 0;
        const complete = sub && total > 0 && marked === total;
        const returned = sub?.status === 'returned';

        // Complete, non-returned work isn't pending.
        if (complete && !returned) continue;

        rows.push({
          examName: exam.ex_name,
          className: exam.class_id?.cl_name ?? '—',
          subject: exam.subject_id?.sub_name ?? '—',
          examDate: exam.exam_date,
          entered: sub ? `${marked}/${total}` : 'not started',
          status: sub?.status ?? 'not started',
          note: sub?.returnReason ?? '—'
        });
      }

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'examDate', label: 'Exam Date', type: 'date' },
          { key: 'entered', label: 'Entered' },
          { key: 'status', label: 'Status' },
          { key: 'note', label: 'Returned Because' }
        ],
        rows,
        summary: [
          { label: 'Outstanding', value: rows.length },
          { label: 'Returned to You', value: rows.filter((r) => r.status === 'returned').length }
        ]
      };
    }
  ),

  report(
    'Assessment',
    'assessment-student-results',
    'Student Results',
    'Every mark you have recorded, per student',
    [FILTERS.class, FILTERS.subject],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(
        filters,
        user,
        filters.subject_id ? { subject_id: filters.subject_id } : {}
      );
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const rows = [];
      for (const sub of submissions) {
        const passMark = sub.pass_marks ?? sub.max_marks / 2;
        for (const entry of sub.entries) {
          if (entry.marks === null || entry.marks === undefined) continue;
          rows.push({
            rollNo: entry.student?.admissionNumber ?? '—',
            name: fullName(entry.student),
            className: sub.class_id?.cl_name ?? '—',
            subject: sub.subject_id?.sub_name ?? '—',
            examName: sub.exam_id?.ex_name ?? '—',
            marks: `${entry.marks}/${sub.max_marks}`,
            percentage: percent(entry.marks, sub.max_marks),
            result: entry.marks >= passMark ? 'Pass' : 'Fail'
          });
        }
      }

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'examName', label: 'Examination' },
          { key: 'marks', label: 'Marks' },
          { key: 'percentage', label: '%', type: 'number' },
          { key: 'result', label: 'Result' }
        ],
        rows,
        summary: [{ label: 'Marks Recorded', value: rows.length }]
      };
    }
  ),

  report(
    'Assessment',
    'assessment-class-average',
    'Class Average',
    'How each of your classes is performing overall',
    [],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(filters, user);
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const byClass = new Map();
      for (const sub of submissions) {
        const key = sub.class_id?.cl_name ?? '—';
        if (!byClass.has(key)) byClass.set(key, { className: key, marks: [], max: 0, passing: 0, marked: 0 });
        const entry = byClass.get(key);
        const stats = submissionStats(sub);
        for (const e of sub.entries) {
          if (e.marks === null || e.marks === undefined) continue;
          entry.marks.push(percent(e.marks, sub.max_marks));
        }
        entry.passing += stats.passing;
        entry.marked += stats.marked;
      }

      const rows = Array.from(byClass.values())
        .map((entry) => ({
          className: entry.className,
          marksRecorded: entry.marked,
          average: entry.marks.length ? round1(entry.marks.reduce((a, b) => a + b, 0) / entry.marks.length) : 0,
          passRate: percent(entry.passing, entry.marked),
          highest: entry.marks.length ? Math.max(...entry.marks) : 0,
          lowest: entry.marks.length ? Math.min(...entry.marks) : 0
        }))
        .sort((a, b) => b.average - a.average);

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'marksRecorded', label: 'Marks', type: 'number' },
          { key: 'average', label: 'Average %', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' },
          { key: 'highest', label: 'Highest %', type: 'number' },
          { key: 'lowest', label: 'Lowest %', type: 'number' }
        ],
        rows,
        chart: { type: 'bar', x: 'className', series: ['average', 'passRate'] }
      };
    }
  ),

  report(
    'Assessment',
    'assessment-subject-average',
    'Subject Average',
    'How each subject you teach is performing across your classes',
    [],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(filters, user);
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const bySubject = new Map();
      for (const sub of submissions) {
        const key = sub.subject_id?.sub_name ?? '—';
        if (!bySubject.has(key)) bySubject.set(key, { subject: key, marks: [], passing: 0, marked: 0, classes: new Set() });
        const entry = bySubject.get(key);
        const stats = submissionStats(sub);
        if (sub.class_id?.cl_name) entry.classes.add(sub.class_id.cl_name);
        for (const e of sub.entries) {
          if (e.marks === null || e.marks === undefined) continue;
          entry.marks.push(percent(e.marks, sub.max_marks));
        }
        entry.passing += stats.passing;
        entry.marked += stats.marked;
      }

      const rows = Array.from(bySubject.values())
        .map((entry) => ({
          subject: entry.subject,
          classCount: entry.classes.size,
          marksRecorded: entry.marked,
          average: entry.marks.length ? round1(entry.marks.reduce((a, b) => a + b, 0) / entry.marks.length) : 0,
          passRate: percent(entry.passing, entry.marked)
        }))
        .sort((a, b) => b.average - a.average);

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'classCount', label: 'Classes', type: 'number' },
          { key: 'marksRecorded', label: 'Marks', type: 'number' },
          { key: 'average', label: 'Average %', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' }
        ],
        rows,
        chart: { type: 'bar', x: 'subject', series: ['average'] }
      };
    }
  ),

  report(
    'Assessment',
    'assessment-pass-fail',
    'Pass / Fail Distribution',
    'Pass and fail counts for each set of marks you have entered',
    [FILTERS.class],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(filters, user);
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      let passed = 0;
      let failed = 0;

      const rows = submissions.map((sub) => {
        const stats = submissionStats(sub);
        passed += stats.passing;
        failed += stats.failing;
        return {
          examName: sub.exam_id?.ex_name ?? '—',
          className: sub.class_id?.cl_name ?? '—',
          subject: sub.subject_id?.sub_name ?? '—',
          marked: stats.marked,
          passed: stats.passing,
          failed: stats.failing,
          passRate: percent(stats.passing, stats.marked)
        };
      });

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'marked', label: 'Marked', type: 'number' },
          { key: 'passed', label: 'Passed', type: 'number' },
          { key: 'failed', label: 'Failed', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Passed', value: passed },
          { label: 'Failed', value: failed },
          { label: 'Overall Pass Rate', value: `${percent(passed, passed + failed)}%` }
        ]
      };
    }
  ),

  report(
    'Assessment',
    'assessment-below-threshold',
    'Students Below Threshold',
    'Students in your classes scoring under the required mark',
    [FILTERS.class, FILTERS.subject, FILTERS.threshold],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(
        filters,
        user,
        filters.subject_id ? { subject_id: filters.subject_id } : {}
      );
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const threshold = Number(filters.threshold ?? 50);
      const rows = [];

      for (const sub of submissions) {
        for (const entry of sub.entries) {
          if (entry.marks === null || entry.marks === undefined) continue;
          const pct = percent(entry.marks, sub.max_marks);
          if (pct >= threshold) continue;
          rows.push({
            rollNo: entry.student?.admissionNumber ?? '—',
            name: fullName(entry.student),
            className: sub.class_id?.cl_name ?? '—',
            subject: sub.subject_id?.sub_name ?? '—',
            examName: sub.exam_id?.ex_name ?? '—',
            marks: `${entry.marks}/${sub.max_marks}`,
            percentage: pct
          });
        }
      }

      rows.sort((a, b) => a.percentage - b.percentage);

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'examName', label: 'Examination' },
          { key: 'marks', label: 'Marks' },
          { key: 'percentage', label: '%', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Below Threshold', value: rows.length },
          { label: 'Threshold', value: `${threshold}%` }
        ]
      };
    }
  )
];

// ============================================================
// Examination Reports
// ============================================================

const examinationReports = [
  report(
    'Examinations',
    'teacher-exam-subjects',
    'Assigned Examination Subjects',
    'Examinations scheduled for the subjects and classes you teach',
    [FILTERS.class],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      const classIds = scopedClassIds(scope, filters);
      if (!classIds.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const exams = await Exam.find({
        class_id: { $in: classIds },
        subject_id: { $in: scope.subjectIds }
      })
        .populate('class_id', 'cl_name')
        .populate('subject_id', 'sub_name')
        .populate('exam_type', 'type_name')
        .sort({ exam_date: 1 });

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'className', label: 'Class' },
          { key: 'examName', label: 'Examination' },
          { key: 'examType', label: 'Type' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'totalMarks', label: 'Total Marks', type: 'number' }
        ],
        rows: exams.map((exam) => ({
          subject: exam.subject_id?.sub_name ?? '—',
          className: exam.class_id?.cl_name ?? '—',
          examName: exam.ex_name,
          examType: exam.exam_type?.type_name ?? '—',
          date: exam.exam_date,
          totalMarks: exam.total_marks
        })),
        summary: [{ label: 'Examinations', value: exams.length }]
      };
    }
  ),

  report(
    'Examinations',
    'teacher-exam-timetable',
    'Examination Timetable',
    'When your examinations are sat, with date, start time and duration',
    [FILTERS.class],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      const classIds = scopedClassIds(scope, filters);
      if (!classIds.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const exams = await Exam.find({
        class_id: { $in: classIds },
        subject_id: { $in: scope.subjectIds }
      })
        .populate('class_id', 'cl_name')
        .populate('subject_id', 'sub_name')
        .sort({ exam_date: 1, start_time: 1 });

      return {
        columns: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'start', label: 'Start Time' },
          { key: 'duration', label: 'Duration' },
          { key: 'end', label: 'End Time' }
        ],
        rows: exams.map((exam) => ({
          date: exam.exam_date,
          className: exam.class_id?.cl_name ?? '—',
          subject: exam.subject_id?.sub_name ?? '—',
          start: exam.start_time,
          duration: formatDuration(
            exam.duration_minutes ??
              (timeToMinutes(exam.end_time) - timeToMinutes(exam.start_time) || 0)
          ),
          end: exam.end_time
        })),
        summary: [{ label: 'Examinations', value: exams.length }]
      };
    }
  ),

  report(
    'Examinations',
    'teacher-exam-registered-students',
    'Students Registered for an Examination',
    'Who is due to sit each of your examinations',
    [FILTERS.class],
    async (filters, { user }) => {
      const scope = await resolveTeacherScope(user, filters);
      const classIds = scopedClassIds(scope, filters);
      if (!classIds.length) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const exams = await Exam.find({
        class_id: { $in: classIds },
        subject_id: { $in: scope.subjectIds }
      })
        .populate('class_id', 'cl_name')
        .populate('subject_id', 'sub_name')
        .sort({ exam_date: 1 });

      const students = await Student.find({ classId: { $in: classIds }, isDeleted: { $ne: true } })
        .select('firstName lastName admissionNumber classId')
        .sort({ admissionNumber: 1 });

      const rows = [];
      for (const exam of exams) {
        const cohort = students.filter((s) => String(s.classId) === String(exam.class_id?._id));
        for (const student of cohort) {
          rows.push({
            examName: exam.ex_name,
            subject: exam.subject_id?.sub_name ?? '—',
            className: exam.class_id?.cl_name ?? '—',
            date: exam.exam_date,
            rollNo: student.admissionNumber,
            name: fullName(student)
          });
        }
      }

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'subject', label: 'Subject' },
          { key: 'className', label: 'Class' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' }
        ],
        rows,
        summary: [
          { label: 'Examinations', value: exams.length },
          { label: 'Registrations', value: rows.length }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'teacher-exam-missing-marks',
    'Missing Marks',
    'Students in your examinations who have no mark recorded yet',
    [FILTERS.class],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(filters, user);
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const rows = [];
      for (const sub of submissions) {
        for (const entry of sub.entries) {
          if (entry.marks !== null && entry.marks !== undefined) continue;
          rows.push({
            examName: sub.exam_id?.ex_name ?? '—',
            className: sub.class_id?.cl_name ?? '—',
            subject: sub.subject_id?.sub_name ?? '—',
            rollNo: entry.student?.admissionNumber ?? '—',
            name: fullName(entry.student),
            status: sub.status
          });
        }
      }

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'status', label: 'Submission Status' }
        ],
        rows,
        summary: [{ label: 'Missing Marks', value: rows.length }]
      };
    }
  ),

  report(
    'Examinations',
    'teacher-exam-submitted-results',
    'Submitted Results',
    'Marks you have sent for approval, and where they got to',
    [FILTERS.class],
    async (filters, { user }) => {
      const { submissions } = await mySubmissions(filters, user, {
        status: { $in: ['submitted', 'approved', 'published', 'returned'] }
      });
      if (!submissions) return { columns: [NO_ASSIGNMENTS], rows: [], summary: [] };

      const rows = submissions.map((sub) => {
        const stats = submissionStats(sub);
        return {
          examName: sub.exam_id?.ex_name ?? '—',
          className: sub.class_id?.cl_name ?? '—',
          subject: sub.subject_id?.sub_name ?? '—',
          students: stats.marked,
          average: stats.average,
          status: sub.status,
          submitted: sub.submittedAt,
          note: sub.returnReason ?? '—'
        };
      });

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'students', label: 'Students', type: 'number' },
          { key: 'average', label: 'Average', type: 'number' },
          { key: 'status', label: 'Status' },
          { key: 'submitted', label: 'Submitted', type: 'date' },
          { key: 'note', label: 'Returned Because' }
        ],
        rows,
        summary: [
          { label: 'Submitted', value: rows.length },
          { label: 'Published', value: rows.filter((r) => r.status === 'published').length },
          { label: 'Returned', value: rows.filter((r) => r.status === 'returned').length }
        ]
      };
    }
  )
];

export const teacherReports = [...teachingReports, ...assessmentReports, ...examinationReports];
