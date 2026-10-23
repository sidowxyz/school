import Student from '../models/Student.js';
import StudentAttendance from '../models/StudentAttendance.js';
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

/** "HH:MM" -> minutes since midnight, or null when unparseable. */
const timeToMinutes = (time) => {
  const match = typeof time === 'string' ? /^(\d{1,2}):(\d{2})/.exec(time.trim()) : null;
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
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

export const teacherReports = [...teachingReports];
