import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import { findConflict } from '../utils/assignmentConflict.js';
import {
  FILTERS,
  dateRange,
  findStudents,
  fullName,
  percent,
  round1,
  activeStudentFilter,
  resolveHistoricalRoster
} from './helpers.js';

const ACADEMIC_ROLES = ['admin', 'principal', 'academic_officer'];

/** Shorthand for a report definition in the academic department. */
const report = (group, id, title, description, filters, run) => ({
  id,
  title,
  description,
  group,
  department: 'academic',
  roles: ACADEMIC_ROLES,
  filters,
  run
});

// ============================================================
// Student Reports
// ============================================================

const STUDENT_COLUMNS = [
  { key: 'rollNo', label: 'Admission No' },
  { key: 'name', label: 'Student' },
  { key: 'className', label: 'Class' },
  { key: 'sectionName', label: 'Section' },
  { key: 'gender', label: 'Gender' },
  { key: 'status', label: 'Status' }
];

const studentRow = (s) => ({
  rollNo: s.admissionNumber,
  name: fullName(s),
  className: s.classId?.cl_name ?? '—',
  sectionName: s.sectionId?.name ?? '—',
  gender: s.gender ?? '—',
  status: s.status ?? '—',
  admissionType: s.admissionType ?? '—',
  admittedOn: s.createdAt
});

const studentReports = [
  report(
    'Students',
    'students-total',
    'Total Students',
    'Every enrolled student, with a headcount by status',
    [FILTERS.class, FILTERS.section, FILTERS.year],
    async (filters) => {
      const students = await findStudents(filters);
      const byStatus = students.reduce((acc, s) => {
        acc[s.status ?? 'Unknown'] = (acc[s.status ?? 'Unknown'] ?? 0) + 1;
        return acc;
      }, {});
      return {
        columns: STUDENT_COLUMNS,
        rows: students.map(studentRow),
        summary: [
          { label: 'Total Students', value: students.length },
          ...Object.entries(byStatus).map(([label, value]) => ({ label, value }))
        ]
      };
    }
  ),

  report(
    'Students',
    'students-by-class',
    'Students by Class',
    'Headcount for every class, with gender split',
    [FILTERS.year],
    async (filters) => {
      // A year filter groups by each student's class *in that year* (via the
      // StudentClass enrolment ledger), not their class today — otherwise a
      // student moved since would count against the wrong class, or the
      // wrong year's headcount, for every year but the current one.
      const historical = await resolveHistoricalRoster(filters);
      const [classes, students] = await Promise.all([
        Class.find().sort({ cl_name: 1 }),
        historical ? Promise.resolve(historical) : Student.find(activeStudentFilter({})).select('classId gender status')
      ]);

      const rows = classes.map((klass) => {
        const inClass = students.filter((s) => String(s.classId?._id ?? s.classId) === String(klass._id));
        return {
          className: klass.cl_name,
          total: inClass.length,
          male: inClass.filter((s) => s.gender === 'Male').length,
          female: inClass.filter((s) => s.gender === 'Female').length,
          active: inClass.filter((s) => s.status === 'Active').length
        };
      });

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'total', label: 'Total', type: 'number' },
          { key: 'male', label: 'Male', type: 'number' },
          { key: 'female', label: 'Female', type: 'number' },
          { key: 'active', label: 'Active', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Classes', value: classes.length },
          { label: 'Students', value: students.length }
        ]
      };
    }
  ),

  report(
    'Students',
    'students-by-section',
    'Students by Section',
    'Headcount per section, including classes that are not streamed',
    [FILTERS.class, FILTERS.year],
    async (filters) => {
      // findStudents(filters) returns the year-correct roster when year_id is
      // given (each row's sectionId comes from StudentClass.section, so this
      // groups by the section the student was in *that year*, not today's).
      // With no year filter it returns the live roster — identical semantics.
      const [sections, students] = await Promise.all([
        Section.find(filters.class_id ? { class: filters.class_id } : {}).populate('class', 'cl_name'),
        findStudents(filters)
      ]);

      const rows = sections.map((section) => ({
        className: section.class?.cl_name ?? '—',
        sectionName: section.name,
        // sectionId can be a raw id (live) or a populated ref (historical).
        total: students.filter((s) => String(s.sectionId?._id ?? s.sectionId) === String(section._id)).length
      }));

      // Students in classes with no sections would otherwise vanish.
      const unsectioned = students.filter((s) => !s.sectionId);
      if (unsectioned.length) {
        const byClass = new Map();
        for (const s of unsectioned) {
          const name = s.classId?.cl_name ?? '—';
          byClass.set(name, (byClass.get(name) ?? 0) + 1);
        }
        for (const [className, total] of byClass) {
          rows.push({ className, sectionName: 'No section', total });
        }
      }

      rows.sort((a, b) => a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName));

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'total', label: 'Students', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Sections', value: sections.length },
          { label: 'Unsectioned Students', value: unsectioned.length }
        ]
      };
    }
  ),

  report(
    'Students',
    'students-new-admissions',
    'New Admissions',
    'Students admitted in the selected period (excludes transfers)',
    [FILTERS.dateFrom, FILTERS.dateTo, FILTERS.class],
    async (filters) => {
      const range = dateRange(filters);
      const students = await findStudents(filters, {
        admissionType: 'Regular',
        ...(range ? { createdAt: range } : {})
      });

      return {
        columns: [
          ...STUDENT_COLUMNS.slice(0, 4),
          { key: 'admittedOn', label: 'Admitted', type: 'date' }
        ],
        rows: students.map(studentRow),
        summary: [{ label: 'New Admissions', value: students.length }]
      };
    }
  ),

  report(
    'Students',
    'students-withdrawn',
    'Withdrawn Students',
    'Students removed from the roll, plus those marked inactive or suspended',
    [FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const range = dateRange(filters);
      const students = await Student.find({
        $or: [{ isDeleted: true }, { status: { $in: ['Inactive', 'Suspended'] } }],
        ...(range ? { updatedAt: range } : {})
      })
        .select('firstName lastName admissionNumber classId sectionId status isDeleted deletedAt updatedAt')
        .populate('classId', 'cl_name')
        .populate('sectionId', 'name')
        .sort({ updatedAt: -1 });

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'status', label: 'Status' },
          { key: 'leftOn', label: 'Recorded', type: 'date' }
        ],
        rows: students.map((s) => ({
          rollNo: s.admissionNumber,
          name: fullName(s),
          className: s.classId?.cl_name ?? '—',
          status: s.isDeleted ? 'Withdrawn' : s.status,
          leftOn: s.deletedAt ?? s.updatedAt
        })),
        summary: [
          { label: 'Withdrawn', value: students.filter((s) => s.isDeleted).length },
          { label: 'Inactive / Suspended', value: students.filter((s) => !s.isDeleted).length }
        ]
      };
    }
  ),

  report(
    'Students',
    'students-active',
    'Active Students',
    'Students currently on the roll and marked active',
    [FILTERS.class, FILTERS.section, FILTERS.year],
    async (filters) => {
      const students = await findStudents(filters, { status: 'Active' });
      return {
        columns: STUDENT_COLUMNS,
        rows: students.map(studentRow),
        summary: [{ label: 'Active Students', value: students.length }]
      };
    }
  ),

  report(
    'Students',
    'students-demographics',
    'Student Demographics',
    'Gender and age distribution across the school',
    [FILTERS.class, FILTERS.year],
    async (filters) => {
      const students = await findStudents(filters);

      const ageOf = (birthDate) => {
        if (!birthDate) return null;
        const diff = Date.now() - new Date(birthDate).getTime();
        return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      };

      const buckets = new Map();
      for (const student of students) {
        const age = ageOf(student.birthDate);
        const label = age === null ? 'Unknown' : `${age}`;
        if (!buckets.has(label)) buckets.set(label, { age: label, male: 0, female: 0, total: 0 });
        const bucket = buckets.get(label);
        if (student.gender === 'Male') bucket.male += 1;
        if (student.gender === 'Female') bucket.female += 1;
        bucket.total += 1;
      }

      const rows = Array.from(buckets.values()).sort((a, b) => {
        if (a.age === 'Unknown') return 1;
        if (b.age === 'Unknown') return -1;
        return Number(a.age) - Number(b.age);
      });

      const male = students.filter((s) => s.gender === 'Male').length;
      const female = students.filter((s) => s.gender === 'Female').length;

      return {
        columns: [
          { key: 'age', label: 'Age' },
          { key: 'male', label: 'Male', type: 'number' },
          { key: 'female', label: 'Female', type: 'number' },
          { key: 'total', label: 'Total', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Total', value: students.length },
          { label: 'Male', value: `${male} (${percent(male, students.length)}%)` },
          { label: 'Female', value: `${female} (${percent(female, students.length)}%)` }
        ]
      };
    }
  ),

  report(
    'Students',
    'students-enrollment-trend',
    'Enrolment Trend',
    'Admissions per month, so intake can be compared over time',
    [FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const range = dateRange(filters);
      const students = await Student.find({
        isDeleted: { $ne: true },
        ...(range ? { createdAt: range } : {})
      }).select('createdAt admissionType');

      const byMonth = new Map();
      for (const student of students) {
        const key = new Date(student.createdAt).toISOString().slice(0, 7);
        if (!byMonth.has(key)) byMonth.set(key, { month: key, admissions: 0, transfers: 0 });
        const bucket = byMonth.get(key);
        if (student.admissionType === 'Transfer') bucket.transfers += 1;
        else bucket.admissions += 1;
      }

      const rows = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));

      return {
        columns: [
          { key: 'month', label: 'Month' },
          { key: 'admissions', label: 'New Admissions', type: 'number' },
          { key: 'transfers', label: 'Transfers', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Total Enrolled', value: students.length }],
        chart: { type: 'bar', x: 'month', series: ['admissions', 'transfers'] }
      };
    }
  )
];

// ============================================================
// Teacher / Academic Assignment Reports
// ============================================================

const assignmentPopulate = [
  { path: 'subjectId', select: 'sub_name' },
  { path: 'classId', select: 'cl_name' },
  { path: 'sectionId', select: 'name' },
  { path: 'termId', select: 'name' },
  { path: 'timetableSlots.periodId', select: 'per_name time_in time_out' },
  {
    path: 'teacherId',
    select: 'userId',
    populate: { path: 'userId', select: 'firstName lastName username' }
  }
];

const teacherNameOf = (assignment) => {
  const user = assignment.teacherId?.userId;
  return fullName(user) || user?.username || 'Unassigned';
};

const slotCount = (assignment) => assignment.timetableSlots?.length ?? 0;

const assignmentReports = [
  report(
    'Teaching Assignments',
    'assignments-teachers-by-subject',
    'Teachers by Subject',
    'Who teaches each subject, and to which classes',
    [FILTERS.subject],
    async (filters) => {
      const assignments = await TeacherAssignment.find(
        filters.subject_id ? { subjectId: filters.subject_id } : {}
      ).populate(assignmentPopulate);

      const rows = assignments
        .map((a) => ({
          subject: a.subjectId?.sub_name ?? '—',
          teacher: teacherNameOf(a),
          className: a.classId?.cl_name ?? '—',
          sectionName: a.sectionId?.name ?? '—',
          term: a.termId?.name ?? '—',
          periods: slotCount(a)
        }))
        .sort((a, b) => a.subject.localeCompare(b.subject) || a.teacher.localeCompare(b.teacher));

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'teacher', label: 'Teacher' },
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'term', label: 'Term' },
          { key: 'periods', label: 'Periods/Week', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Assignments', value: rows.length },
          { label: 'Subjects Covered', value: new Set(rows.map((r) => r.subject)).size }
        ]
      };
    }
  ),

  report(
    'Teaching Assignments',
    'assignments-teachers-by-class',
    'Teachers by Class',
    'Every teacher working with each class',
    [FILTERS.class],
    async (filters) => {
      const assignments = await TeacherAssignment.find(
        filters.class_id ? { classId: filters.class_id } : {}
      ).populate(assignmentPopulate);

      const rows = assignments
        .map((a) => ({
          className: a.classId?.cl_name ?? '—',
          sectionName: a.sectionId?.name ?? '—',
          subject: a.subjectId?.sub_name ?? '—',
          teacher: teacherNameOf(a),
          periods: slotCount(a)
        }))
        .sort((a, b) => a.className.localeCompare(b.className) || a.subject.localeCompare(b.subject));

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'subject', label: 'Subject' },
          { key: 'teacher', label: 'Teacher' },
          { key: 'periods', label: 'Periods/Week', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Assignments', value: rows.length }]
      };
    }
  ),

  report(
    'Teaching Assignments',
    'assignments-workload',
    'Teacher Workload',
    'Periods per week, classes and subjects carried by each teacher',
    [],
    async () => {
      const assignments = await TeacherAssignment.find().populate(assignmentPopulate);

      const byTeacher = new Map();
      for (const a of assignments) {
        const name = teacherNameOf(a);
        if (!byTeacher.has(name)) {
          byTeacher.set(name, { teacher: name, subjects: new Set(), classes: new Set(), periods: 0, assignments: 0 });
        }
        const entry = byTeacher.get(name);
        if (a.subjectId?.sub_name) entry.subjects.add(a.subjectId.sub_name);
        if (a.classId?.cl_name) entry.classes.add(a.classId.cl_name);
        entry.periods += slotCount(a);
        entry.assignments += 1;
      }

      const rows = Array.from(byTeacher.values())
        .map((entry) => ({
          teacher: entry.teacher,
          assignments: entry.assignments,
          subjectCount: entry.subjects.size,
          classCount: entry.classes.size,
          periods: entry.periods,
          subjects: Array.from(entry.subjects).sort().join(', ')
        }))
        .sort((a, b) => b.periods - a.periods);

      const totalPeriods = rows.reduce((sum, r) => sum + r.periods, 0);

      return {
        columns: [
          { key: 'teacher', label: 'Teacher' },
          { key: 'periods', label: 'Periods/Week', type: 'number' },
          { key: 'classCount', label: 'Classes', type: 'number' },
          { key: 'subjectCount', label: 'Subjects', type: 'number' },
          { key: 'subjects', label: 'Subject List' }
        ],
        rows,
        summary: [
          { label: 'Teachers Assigned', value: rows.length },
          { label: 'Average Periods/Week', value: rows.length ? round1(totalPeriods / rows.length) : 0 },
          { label: 'Heaviest Load', value: rows[0] ? `${rows[0].teacher} (${rows[0].periods})` : '—' }
        ],
        chart: { type: 'bar', x: 'teacher', series: ['periods'] }
      };
    }
  ),

  report(
    'Teaching Assignments',
    'assignments-subject-assignments',
    'Subject Assignments',
    'Every subject with its assigned classes and teachers',
    [],
    async () => {
      const [subjects, assignments] = await Promise.all([
        Subject.find().sort({ sub_name: 1 }),
        TeacherAssignment.find().populate(assignmentPopulate)
      ]);

      const rows = subjects.map((subject) => {
        const mine = assignments.filter((a) => String(a.subjectId?._id) === String(subject._id));
        return {
          subject: subject.sub_name,
          code: subject.subjectCode ?? subject.sub_no,
          status: subject.status,
          classCount: new Set(mine.map((a) => a.classId?.cl_name).filter(Boolean)).size,
          teacherCount: new Set(mine.map(teacherNameOf)).size,
          teachers: Array.from(new Set(mine.map(teacherNameOf))).sort().join(', ') || '—'
        };
      });

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'code', label: 'Code' },
          { key: 'classCount', label: 'Classes', type: 'number' },
          { key: 'teacherCount', label: 'Teachers', type: 'number' },
          { key: 'teachers', label: 'Assigned Teachers' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [{ label: 'Subjects', value: subjects.length }]
      };
    }
  ),

  report(
    'Teaching Assignments',
    'assignments-conflicts',
    'Scheduling Conflicts',
    'Assignments that clash — a class double-booked, or a teacher in two places at once',
    [],
    async () => {
      const assignments = await TeacherAssignment.find().populate(assignmentPopulate);

      // Same rule engine the assignment endpoints enforce, run over existing
      // records so any clash predating the rules is surfaced rather than hidden.
      const shaped = assignments.map((a) => ({
        teacherId: a.teacherId?._id ?? a.teacherId,
        classId: a.classId?._id ?? a.classId,
        sectionId: a.sectionId?._id ?? a.sectionId,
        subjectId: a.subjectId?._id ?? a.subjectId,
        termId: a.termId?._id ?? a.termId,
        slots: (a.timetableSlots ?? [])
          .filter((s) => s.periodId)
          .map((s) => ({ day: s.day, startTime: s.periodId.time_in, endTime: s.periodId.time_out })),
        doc: a
      }));

      const rows = [];
      const seen = new Set();

      for (let i = 0; i < shaped.length; i += 1) {
        const conflict = findConflict(shaped[i], shaped.slice(i + 1));
        if (!conflict) continue;

        const pairKey = [String(shaped[i].doc._id), String(conflict.other.doc._id)].sort().join('|');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        rows.push({
          reason: conflict.reason.replace(/_/g, ' ').toLowerCase(),
          day: conflict.otherSlot.day,
          time: `${conflict.otherSlot.startTime}-${conflict.otherSlot.endTime}`,
          first: `${teacherNameOf(shaped[i].doc)} · ${shaped[i].doc.subjectId?.sub_name ?? '—'} · ${shaped[i].doc.classId?.cl_name ?? '—'}`,
          second: `${teacherNameOf(conflict.other.doc)} · ${conflict.other.doc.subjectId?.sub_name ?? '—'} · ${conflict.other.doc.classId?.cl_name ?? '—'}`
        });
      }

      return {
        columns: [
          { key: 'reason', label: 'Conflict' },
          { key: 'day', label: 'Day' },
          { key: 'time', label: 'Time' },
          { key: 'first', label: 'Assignment' },
          { key: 'second', label: 'Clashes With' }
        ],
        rows,
        summary: [
          { label: 'Conflicts', value: rows.length },
          { label: 'Assignments Checked', value: assignments.length }
        ]
      };
    }
  ),

  report(
    'Teaching Assignments',
    'assignments-unassigned-subjects',
    'Unassigned Subjects',
    'Active subjects with no teacher assigned',
    [],
    async () => {
      const [subjects, assignments] = await Promise.all([
        Subject.find({ status: 'active' }).populate('classId', 'cl_name').sort({ sub_name: 1 }),
        TeacherAssignment.find().select('subjectId')
      ]);

      const assigned = new Set(assignments.map((a) => String(a.subjectId)));
      const rows = subjects
        .filter((s) => !assigned.has(String(s._id)))
        .map((s) => ({
          subject: s.sub_name,
          code: s.subjectCode ?? s.sub_no,
          className: s.classId?.cl_name ?? 'School-wide'
        }));

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'code', label: 'Code' },
          { key: 'className', label: 'Class' }
        ],
        rows,
        summary: [
          { label: 'Unassigned', value: rows.length },
          { label: 'Active Subjects', value: subjects.length }
        ]
      };
    }
  )
];

export const academicReports = [
  ...studentReports,
  ...assignmentReports
];
