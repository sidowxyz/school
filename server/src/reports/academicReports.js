import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import Exam from '../models/Exam.js';
import ExamMarkSubmission from '../models/ExamMarkSubmission.js';
import PromotionRecord from '../models/PromotionRecord.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import { getClassResults } from '../services/examResultService.js';
import { nextClassFor } from '../services/promotionService.js';
import { findConflict } from '../utils/assignmentConflict.js';
import { formatDuration, timeToMinutes } from '../utils/examTime.js';
import {
  FILTERS,
  dateRange,
  emptyTable,
  findStudents,
  fullName,
  parseExamScope,
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
      // student promoted since would count against the wrong class, or the
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
    'Students admitted in the selected period (excludes promotions and transfers)',
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
        if (!byMonth.has(key)) byMonth.set(key, { month: key, admissions: 0, promoted: 0, transfers: 0 });
        const bucket = byMonth.get(key);
        if (student.admissionType === 'Promoted') bucket.promoted += 1;
        else if (student.admissionType === 'Transfer') bucket.transfers += 1;
        else bucket.admissions += 1;
      }

      const rows = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));

      return {
        columns: [
          { key: 'month', label: 'Month' },
          { key: 'admissions', label: 'New Admissions', type: 'number' },
          { key: 'transfers', label: 'Transfers', type: 'number' },
          { key: 'promoted', label: 'Promoted In', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Total Enrolled', value: students.length }],
        chart: { type: 'bar', x: 'month', series: ['admissions', 'transfers'] }
      };
    }
  )
];

// ============================================================
// Academic Performance
// ============================================================

/**
 * Published results for one class in one examination sitting. Every
 * performance report below reads through here, so they all agree.
 */
const resultsFor = async (filters) => {
  const scope = parseExamScope(filters);
  if (!scope.exam_period_id && !scope.exam_id) return null;
  if (!filters.class_id) return null;
  return getClassResults({ ...scope, class_id: filters.class_id });
};

const NEEDS_SCOPE = 'Select an examination and a class to run this report.';

const performanceReports = [
  report(
    'Academic Performance',
    'performance-student-results',
    'Student Results',
    'Every student\'s subject marks, total, percentage and grade',
    [FILTERS.examScope, FILTERS.class],
    async (filters) => {
      const data = await resultsFor(filters);
      if (!data) return emptyTable([{ key: 'note', label: NEEDS_SCOPE }]);

      const subjectColumns = data.subjects.map((s) => ({
        key: `subject_${s.subjectId}`,
        label: `${s.name} (/${s.maxMarks})`,
        type: 'number'
      }));

      return {
        columns: [
          { key: 'rank', label: 'Rank', type: 'number' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          ...subjectColumns,
          { key: 'total', label: 'Total' },
          { key: 'percentage', label: '%', type: 'number' },
          { key: 'grade', label: 'Grade' },
          { key: 'result', label: 'Result' }
        ],
        rows: data.results.map((r) => ({
          rank: r.rank,
          rollNo: r.student.rollNo,
          name: r.student.name,
          ...Object.fromEntries(
            data.subjects.map((s) => [
              `subject_${s.subjectId}`,
              r.marks.find((m) => m.subjectId === s.subjectId)?.marks ?? null
            ])
          ),
          total: `${r.totalObtained}/${r.totalMax}`,
          percentage: r.percentage,
          grade: r.grade,
          result: r.isPass ? 'Pass' : 'Fail'
        })),
        summary: [
          { label: 'Students', value: data.summary.total },
          { label: 'Class Average', value: `${data.summary.classAverage}%` },
          { label: 'Pass Rate', value: `${data.summary.passPercentage}%` }
        ]
      };
    }
  ),

  report(
    'Academic Performance',
    'performance-by-class',
    'Class Performance',
    'Average, pass rate and spread for every class in one examination',
    [FILTERS.examScope],
    async (filters) => {
      const scope = parseExamScope(filters);
      if (!scope.exam_period_id && !scope.exam_id) {
        return emptyTable([{ key: 'note', label: 'Select an examination to run this report.' }]);
      }

      const classes = await Class.find().sort({ cl_name: 1 });
      const rows = [];

      for (const klass of classes) {
        const data = await getClassResults({ ...scope, class_id: klass._id });
        if (!data.results.length) continue;
        rows.push({
          className: klass.cl_name,
          students: data.summary.total,
          average: data.summary.classAverage,
          passRate: data.summary.passPercentage,
          highest: data.summary.highest,
          lowest: data.summary.lowest
        });
      }

      rows.sort((a, b) => b.average - a.average);

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'students', label: 'Students', type: 'number' },
          { key: 'average', label: 'Average %', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' },
          { key: 'highest', label: 'Highest %', type: 'number' },
          { key: 'lowest', label: 'Lowest %', type: 'number' }
        ],
        rows,
        summary: [{ label: 'Classes with Results', value: rows.length }],
        chart: { type: 'bar', x: 'className', series: ['average', 'passRate'] }
      };
    }
  ),

  report(
    'Academic Performance',
    'performance-by-subject',
    'Subject Performance',
    'Average mark and pass rate per subject',
    [FILTERS.examScope, FILTERS.class],
    async (filters) => {
      const data = await resultsFor(filters);
      if (!data) return emptyTable([{ key: 'note', label: NEEDS_SCOPE }]);

      const rows = data.subjects.map((subject) => {
        const marks = data.results
          .map((r) => r.marks.find((m) => m.subjectId === subject.subjectId))
          .filter((m) => m && m.marks !== null);
        const total = marks.reduce((sum, m) => sum + m.marks, 0);
        const average = marks.length ? round1(total / marks.length) : 0;
        const passing = marks.filter((m) => (m.marks / subject.maxMarks) * 100 >= 50).length;
        return {
          subject: subject.name,
          sat: marks.length,
          average,
          averagePercent: percent(average, subject.maxMarks),
          passRate: percent(passing, marks.length),
          highest: marks.length ? Math.max(...marks.map((m) => m.marks)) : 0,
          lowest: marks.length ? Math.min(...marks.map((m) => m.marks)) : 0
        };
      });

      rows.sort((a, b) => b.averagePercent - a.averagePercent);

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'sat', label: 'Sat', type: 'number' },
          { key: 'average', label: 'Average Mark', type: 'number' },
          { key: 'averagePercent', label: 'Average %', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' },
          { key: 'highest', label: 'Highest', type: 'number' },
          { key: 'lowest', label: 'Lowest', type: 'number' }
        ],
        rows,
        chart: { type: 'bar', x: 'subject', series: ['averagePercent'] }
      };
    }
  ),

  report(
    'Academic Performance',
    'performance-extremes',
    'Highest & Lowest Performers',
    'The top and bottom ten students in a class',
    [FILTERS.examScope, FILTERS.class],
    async (filters) => {
      const data = await resultsFor(filters);
      if (!data) return emptyTable([{ key: 'note', label: NEEDS_SCOPE }]);

      const ranked = data.results;
      const top = ranked.slice(0, 10).map((r) => ({ band: 'Highest', ...performerRow(r) }));
      const bottom = ranked
        .slice(-10)
        .reverse()
        .map((r) => ({ band: 'Lowest', ...performerRow(r) }));

      // With 20 or fewer students the two halves would overlap and double-count.
      const rows = ranked.length <= 20 ? ranked.map((r) => ({ band: 'All', ...performerRow(r) })) : [...top, ...bottom];

      return {
        columns: [
          { key: 'band', label: 'Band' },
          { key: 'rank', label: 'Rank', type: 'number' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'percentage', label: '%', type: 'number' },
          { key: 'grade', label: 'Grade' }
        ],
        rows,
        summary: [
          { label: 'Highest', value: `${ranked[0]?.percentage ?? 0}%` },
          { label: 'Lowest', value: `${ranked[ranked.length - 1]?.percentage ?? 0}%` }
        ]
      };
    }
  ),

  report(
    'Academic Performance',
    'performance-pass-fail',
    'Pass / Fail Rates',
    'Pass and fail counts per class for one examination',
    [FILTERS.examScope],
    async (filters) => {
      const scope = parseExamScope(filters);
      if (!scope.exam_period_id && !scope.exam_id) {
        return emptyTable([{ key: 'note', label: 'Select an examination to run this report.' }]);
      }

      const classes = await Class.find().sort({ cl_name: 1 });
      const rows = [];
      let passed = 0;
      let failed = 0;

      for (const klass of classes) {
        const data = await getClassResults({ ...scope, class_id: klass._id });
        if (!data.results.length) continue;
        passed += data.summary.passed;
        failed += data.summary.failed;
        rows.push({
          className: klass.cl_name,
          students: data.summary.total,
          passed: data.summary.passed,
          failed: data.summary.failed,
          passRate: data.summary.passPercentage
        });
      }

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'students', label: 'Students', type: 'number' },
          { key: 'passed', label: 'Passed', type: 'number' },
          { key: 'failed', label: 'Failed', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' }
        ],
        rows,
        summary: [
          { label: 'Passed', value: passed },
          { label: 'Failed', value: failed },
          { label: 'Overall Pass Rate', value: `${percent(passed, passed + failed)}%` }
        ],
        chart: { type: 'bar', x: 'className', series: ['passed', 'failed'] }
      };
    }
  ),

  report(
    'Academic Performance',
    'performance-class-comparison',
    'Class Comparison',
    'Every class side by side on the same subjects',
    [FILTERS.examScope],
    async (filters) => {
      const scope = parseExamScope(filters);
      if (!scope.exam_period_id && !scope.exam_id) {
        return emptyTable([{ key: 'note', label: 'Select an examination to run this report.' }]);
      }

      const classes = await Class.find().sort({ cl_name: 1 });
      const subjectNames = new Set();
      const perClass = [];

      for (const klass of classes) {
        const data = await getClassResults({ ...scope, class_id: klass._id });
        if (!data.results.length) continue;

        const averages = {};
        for (const subject of data.subjects) {
          const marks = data.results
            .map((r) => r.marks.find((m) => m.subjectId === subject.subjectId))
            .filter((m) => m && m.marks !== null);
          if (!marks.length) continue;
          subjectNames.add(subject.name);
          averages[subject.name] = percent(
            marks.reduce((sum, m) => sum + m.marks, 0) / marks.length,
            subject.maxMarks
          );
        }
        perClass.push({ className: klass.cl_name, overall: data.summary.classAverage, averages });
      }

      const subjects = Array.from(subjectNames).sort();

      return {
        columns: [
          { key: 'className', label: 'Class' },
          { key: 'overall', label: 'Overall %', type: 'number' },
          ...subjects.map((name) => ({ key: `s_${name}`, label: `${name} %`, type: 'number' }))
        ],
        rows: perClass.map((entry) => ({
          className: entry.className,
          overall: entry.overall,
          ...Object.fromEntries(subjects.map((name) => [`s_${name}`, entry.averages[name] ?? null]))
        })),
        chart: { type: 'bar', x: 'className', series: ['overall'] }
      };
    }
  ),

  report(
    'Academic Performance',
    'performance-support-needed',
    'Students Requiring Academic Support',
    'Students below the pass threshold, with the subjects they are failing',
    [FILTERS.examScope, FILTERS.class, FILTERS.threshold],
    async (filters) => {
      const data = await resultsFor(filters);
      if (!data) return emptyTable([{ key: 'note', label: NEEDS_SCOPE }]);

      const threshold = Number(filters.threshold ?? 50);

      const rows = data.results
        .filter((r) => r.percentage < threshold)
        .map((r) => {
          const failing = r.marks.filter(
            (m) => m.marks !== null && (m.marks / m.maxMarks) * 100 < threshold
          );
          return {
            rollNo: r.student.rollNo,
            name: r.student.name,
            percentage: r.percentage,
            grade: r.grade,
            failingCount: failing.length,
            failingSubjects: failing.map((m) => m.subjectName).join(', ') || '—'
          };
        })
        .sort((a, b) => a.percentage - b.percentage);

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'percentage', label: 'Overall %', type: 'number' },
          { key: 'grade', label: 'Grade' },
          { key: 'failingCount', label: 'Subjects Below', type: 'number' },
          { key: 'failingSubjects', label: 'Subjects Needing Support' }
        ],
        rows,
        summary: [
          { label: 'Needing Support', value: rows.length },
          { label: 'Threshold', value: `${threshold}%` },
          { label: 'Share of Class', value: `${percent(rows.length, data.summary.total)}%` }
        ]
      };
    }
  )
];

const performerRow = (r) => ({
  rank: r.rank,
  rollNo: r.student.rollNo,
  name: r.student.name,
  percentage: r.percentage,
  grade: r.grade
});

// ============================================================
// Examination Reports
// ============================================================

const examPopulate = [
  { path: 'class_id', select: 'cl_name' },
  { path: 'subject_id', select: 'sub_name' },
  { path: 'section_id', select: 'name' },
  { path: 'exam_type', select: 'type_name' },
  { path: 'exam_period_id', select: 'name status' }
];

const examFilter = (filters) => {
  const query = {};
  if (filters.exam_period_id) query.exam_period_id = filters.exam_period_id;
  if (filters.class_id) query.class_id = filters.class_id;
  if (filters.subject_id) query.subject_id = filters.subject_id;
  const range = dateRange(filters);
  if (range) query.exam_date = range;
  return query;
};

const TIMETABLE_COLUMNS = [
  { key: 'className', label: 'Class' },
  { key: 'subject', label: 'Subject' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'start', label: 'Start Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'end', label: 'End Time' }
];

const timetableRow = (exam) => ({
  className: exam.class_id?.cl_name ?? '—',
  subject: exam.subject_id?.sub_name ?? '—',
  date: exam.exam_date,
  start: exam.start_time,
  duration: formatDuration(
    exam.duration_minutes ?? (timeToMinutes(exam.end_time) - timeToMinutes(exam.start_time) || 0)
  ),
  end: exam.end_time,
  examName: exam.ex_name,
  period: exam.exam_period_id?.name ?? '—'
});

/** Has this exam's scheduled end time passed? */
const hasFinished = (exam, now = new Date()) => {
  const date = new Date(exam.exam_date);
  const minutes = timeToMinutes(exam.end_time);
  if (minutes !== null) date.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date < now;
};

const examinationReports = [
  report(
    'Examinations',
    'exam-timetable',
    'Examination Timetable',
    'The full school examination timetable: class, subject, date, time and duration',
    [FILTERS.examPeriod, FILTERS.class, FILTERS.subject],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters))
        .populate(examPopulate)
        .sort({ exam_date: 1, start_time: 1 });

      return {
        columns: [...TIMETABLE_COLUMNS, { key: 'period', label: 'Examination Period' }],
        rows: exams.map(timetableRow),
        summary: [{ label: 'Scheduled Examinations', value: exams.length }]
      };
    }
  ),

  report(
    'Examinations',
    'exam-schedule-by-class',
    'Examination Schedule by Class',
    'Each class\'s own examination schedule, in date order',
    [FILTERS.examPeriod, FILTERS.class],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters))
        .populate(examPopulate)
        .sort({ exam_date: 1, start_time: 1 });

      const rows = [...exams]
        .sort(
          (a, b) =>
            (a.class_id?.cl_name ?? '').localeCompare(b.class_id?.cl_name ?? '') ||
            new Date(a.exam_date) - new Date(b.exam_date)
        )
        .map(timetableRow);

      const classCount = new Set(exams.map((e) => String(e.class_id?._id))).size;

      return {
        columns: TIMETABLE_COLUMNS,
        rows,
        summary: [
          { label: 'Classes Examined', value: classCount },
          { label: 'Examinations', value: exams.length }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'exam-schedule-by-subject',
    'Examination Schedule by Subject',
    'Every sitting of each subject across the school',
    [FILTERS.examPeriod, FILTERS.subject],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters))
        .populate(examPopulate)
        .sort({ exam_date: 1 });

      const rows = [...exams]
        .sort(
          (a, b) =>
            (a.subject_id?.sub_name ?? '').localeCompare(b.subject_id?.sub_name ?? '') ||
            new Date(a.exam_date) - new Date(b.exam_date)
        )
        .map(timetableRow);

      return {
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'className', label: 'Class' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'start', label: 'Start Time' },
          { key: 'duration', label: 'Duration' },
          { key: 'end', label: 'End Time' }
        ],
        rows,
        summary: [
          { label: 'Subjects Examined', value: new Set(exams.map((e) => String(e.subject_id?._id))).size },
          { label: 'Sittings', value: exams.length }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'exam-completed',
    'Completed Examinations',
    'Examinations whose scheduled time has passed, and whether marks are in',
    [FILTERS.examPeriod, FILTERS.class],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters)).populate(examPopulate).sort({ exam_date: -1 });
      const finished = exams.filter((e) => hasFinished(e));

      const submissions = await ExamMarkSubmission.find({
        exam_id: { $in: finished.map((e) => e._id) }
      }).select('exam_id status');
      const statusBy = new Map(submissions.map((s) => [String(s.exam_id), s.status]));

      return {
        columns: [
          ...TIMETABLE_COLUMNS,
          { key: 'marksStatus', label: 'Marks' }
        ],
        rows: finished.map((exam) => ({
          ...timetableRow(exam),
          marksStatus: statusBy.get(String(exam._id)) ?? 'not entered'
        })),
        summary: [
          { label: 'Completed', value: finished.length },
          {
            label: 'Marks Published',
            value: finished.filter((e) => statusBy.get(String(e._id)) === 'published').length
          }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'exam-pending',
    'Pending Examinations',
    'Examinations still to be sat',
    [FILTERS.examPeriod, FILTERS.class],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters)).populate(examPopulate).sort({ exam_date: 1 });
      const pending = exams.filter((e) => !hasFinished(e));

      return {
        columns: TIMETABLE_COLUMNS,
        rows: pending.map(timetableRow),
        summary: [{ label: 'Pending', value: pending.length }]
      };
    }
  ),

  report(
    'Examinations',
    'exam-results',
    'Examination Results',
    'Published results for one class, ranked',
    [FILTERS.examScope, FILTERS.class],
    async (filters) => {
      const data = await resultsFor(filters);
      if (!data) return emptyTable([{ key: 'note', label: NEEDS_SCOPE }]);

      return {
        columns: [
          { key: 'rank', label: 'Rank', type: 'number' },
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'total', label: 'Total' },
          { key: 'percentage', label: '%', type: 'number' },
          { key: 'grade', label: 'Grade' },
          { key: 'result', label: 'Result' }
        ],
        rows: data.results.map((r) => ({
          rank: r.rank,
          rollNo: r.student.rollNo,
          name: r.student.name,
          total: `${r.totalObtained}/${r.totalMax}`,
          percentage: r.percentage,
          grade: r.grade,
          result: r.isPass ? 'Pass' : 'Fail'
        })),
        summary: [
          { label: 'Students', value: data.summary.total },
          { label: 'Average', value: `${data.summary.classAverage}%` },
          { label: 'Pass Rate', value: `${data.summary.passPercentage}%` }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'exam-result-summaries',
    'Result Summaries',
    'One line per marks submission: where it sits in the workflow and how the class did',
    [FILTERS.examPeriod, FILTERS.class],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters)).select('_id');
      const submissions = await ExamMarkSubmission.find({
        exam_id: { $in: exams.map((e) => e._id) }
      })
        .populate({ path: 'exam_id', select: 'ex_name exam_date' })
        .populate('class_id', 'cl_name')
        .populate('subject_id', 'sub_name')
        .sort({ updatedAt: -1 });

      const rows = submissions.map((sub) => {
        const marked = sub.entries.filter((e) => e.marks !== null);
        const passMark = sub.pass_marks ?? sub.max_marks / 2;
        const passing = marked.filter((e) => e.marks >= passMark).length;
        const average = marked.length
          ? round1(marked.reduce((sum, e) => sum + e.marks, 0) / marked.length)
          : 0;
        return {
          examName: sub.exam_id?.ex_name ?? '—',
          className: sub.class_id?.cl_name ?? '—',
          subject: sub.subject_id?.sub_name ?? '—',
          entered: `${marked.length}/${sub.entries.length}`,
          average,
          passRate: percent(passing, marked.length),
          status: sub.status
        };
      });

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'entered', label: 'Marks Entered' },
          { key: 'average', label: 'Average', type: 'number' },
          { key: 'passRate', label: 'Pass Rate %', type: 'number' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Submissions', value: rows.length },
          { label: 'Published', value: rows.filter((r) => r.status === 'published').length }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'exam-missing-marks',
    'Missing Marks',
    'Examinations that have been sat but whose marks are incomplete or not entered',
    [FILTERS.examPeriod, FILTERS.class],
    async (filters) => {
      const exams = await Exam.find(examFilter(filters)).populate(examPopulate).sort({ exam_date: 1 });
      const finished = exams.filter((e) => hasFinished(e));

      const submissions = await ExamMarkSubmission.find({
        exam_id: { $in: finished.map((e) => e._id) }
      }).select('exam_id status entries max_marks');
      const byExam = new Map(submissions.map((s) => [String(s.exam_id), s]));

      const rows = [];
      for (const exam of finished) {
        const sub = byExam.get(String(exam._id));
        const total = sub?.entries.length ?? 0;
        const entered = sub?.entries.filter((e) => e.marks !== null).length ?? 0;
        // Only surface what is actually outstanding.
        if (sub && entered === total && total > 0) continue;
        rows.push({
          examName: exam.ex_name,
          className: exam.class_id?.cl_name ?? '—',
          subject: exam.subject_id?.sub_name ?? '—',
          date: exam.exam_date,
          entered: sub ? `${entered}/${total}` : 'none',
          missing: sub ? total - entered : null,
          status: sub?.status ?? 'not started'
        });
      }

      return {
        columns: [
          { key: 'examName', label: 'Examination' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'date', label: 'Sat On', type: 'date' },
          { key: 'entered', label: 'Entered' },
          { key: 'missing', label: 'Missing', type: 'number' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        summary: [
          { label: 'Examinations Outstanding', value: rows.length },
          { label: 'Never Started', value: rows.filter((r) => r.status === 'not started').length }
        ]
      };
    }
  ),

  report(
    'Examinations',
    'exam-students-without-results',
    'Students Without Results',
    'Enrolled students with no published mark in the selected examination',
    [FILTERS.examScope, FILTERS.class],
    async (filters) => {
      const scope = parseExamScope(filters);
      if ((!scope.exam_period_id && !scope.exam_id) || !filters.class_id) {
        return emptyTable([{ key: 'note', label: NEEDS_SCOPE }]);
      }

      const [data, students] = await Promise.all([
        getClassResults({ ...scope, class_id: filters.class_id }),
        findStudents(filters)
      ]);

      const withResults = new Set(data.results.map((r) => r.student.id));
      const missing = students.filter((s) => !withResults.has(String(s._id)));

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'status', label: 'Status' }
        ],
        rows: missing.map(studentRow),
        summary: [
          { label: 'Without Results', value: missing.length },
          { label: 'Enrolled', value: students.length },
          { label: 'Coverage', value: `${percent(students.length - missing.length, students.length)}%` }
        ]
      };
    }
  )
];

// ============================================================
// Promotion Reports
// ============================================================

const promotionPopulate = [
  { path: 'student', select: 'firstName lastName admissionNumber' },
  { path: 'from_class', select: 'cl_name' },
  { path: 'to_class', select: 'cl_name' },
  { path: 'academic_year', select: 'y_name' },
  { path: 'performed_by', select: 'username firstName lastName' }
];

const promotionRow = (record) => ({
  rollNo: record.student?.admissionNumber ?? '—',
  name: fullName(record.student),
  fromClass: record.from_class?.cl_name ?? '—',
  toClass: record.to_class?.cl_name ?? 'Graduated',
  type: record.type,
  percentage: record.percentage ?? null,
  reason: record.reason ?? '—',
  performedBy: fullName(record.performed_by) || record.performed_by?.username || '—',
  date: record.performed_at
});

const PROMOTION_COLUMNS = [
  { key: 'rollNo', label: 'Admission No' },
  { key: 'name', label: 'Student' },
  { key: 'fromClass', label: 'From' },
  { key: 'toClass', label: 'To' },
  { key: 'percentage', label: '%', type: 'number' },
  { key: 'performedBy', label: 'Recorded By' },
  { key: 'date', label: 'Date', type: 'date' }
];

const promotionQuery = (filters, extra = {}) => {
  const query = { ...extra };
  const range = dateRange(filters);
  if (range) query.performed_at = range;
  if (filters.class_id) query.$or = [{ from_class: filters.class_id }, { to_class: filters.class_id }];
  return query;
};

const promotionReports = [
  report(
    'Promotion',
    'promotion-promoted',
    'Students Promoted',
    'Students moved up through the normal promotion path',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const records = await PromotionRecord.find(promotionQuery(filters, { type: 'normal' }))
        .populate(promotionPopulate)
        .sort({ performed_at: -1 });
      return {
        columns: PROMOTION_COLUMNS,
        rows: records.map(promotionRow),
        summary: [{ label: 'Promoted', value: records.length }]
      };
    }
  ),

  report(
    'Promotion',
    'promotion-retained',
    'Students Not Promoted',
    'Students retained in their current class',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const records = await PromotionRecord.find(promotionQuery(filters, { type: 'retained' }))
        .populate(promotionPopulate)
        .sort({ performed_at: -1 });
      return {
        columns: PROMOTION_COLUMNS,
        rows: records.map(promotionRow),
        summary: [{ label: 'Retained', value: records.length }]
      };
    }
  ),

  report(
    'Promotion',
    'promotion-awaiting',
    'Students Awaiting Promotion',
    'Enrolled students with no promotion decision recorded yet, and where they would go',
    [FILTERS.class],
    async (filters) => {
      const [students, classes, records] = await Promise.all([
        findStudents(filters),
        Class.find(),
        PromotionRecord.find({}).select('student performed_at').sort({ performed_at: -1 })
      ]);

      // A student is "awaiting" when nothing has been recorded for them since
      // they entered their current class.
      const decidedAt = new Map();
      for (const record of records) {
        const key = String(record.student);
        if (!decidedAt.has(key)) decidedAt.set(key, record.performed_at);
      }

      const nextByClass = new Map(
        classes.map((klass) => [String(klass._id), nextClassFor(klass, classes)])
      );

      const rows = students
        .filter((student) => {
          const decided = decidedAt.get(String(student._id));
          // Undecided, or last decided before they joined this class.
          return !decided || new Date(decided) < new Date(student.updatedAt ?? student.createdAt);
        })
        .map((student) => {
          const next = nextByClass.get(String(student.classId?._id ?? student.classId));
          return {
            rollNo: student.admissionNumber,
            name: fullName(student),
            className: student.classId?.cl_name ?? '—',
            sectionName: student.sectionId?.name ?? '—',
            nextClass: next ? next.cl_name : 'Graduating'
          };
        });

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'className', label: 'Current Class' },
          { key: 'sectionName', label: 'Section' },
          { key: 'nextClass', label: 'Would Promote To' }
        ],
        rows,
        summary: [{ label: 'Awaiting Decision', value: rows.length }]
      };
    }
  ),

  report(
    'Promotion',
    'promotion-history',
    'Promotion History',
    'Every recorded movement between classes, newest first',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const records = await PromotionRecord.find(promotionQuery(filters))
        .populate(promotionPopulate)
        .sort({ performed_at: -1 });
      return {
        columns: [
          ...PROMOTION_COLUMNS.slice(0, 4),
          { key: 'type', label: 'Type' },
          { key: 'performedBy', label: 'Recorded By' },
          { key: 'date', label: 'Date', type: 'date' }
        ],
        rows: records.map(promotionRow),
        summary: [
          { label: 'Records', value: records.length },
          { label: 'Normal', value: records.filter((r) => r.type === 'normal').length },
          { label: 'Special', value: records.filter((r) => r.type === 'special').length },
          { label: 'Retained', value: records.filter((r) => r.type === 'retained').length },
          { label: 'Graduated', value: records.filter((r) => r.type === 'graduated').length }
        ]
      };
    }
  ),

  report(
    'Promotion',
    'promotion-special',
    'Special / Exceptional Promotions',
    'Students moved outside the normal class sequence, with the reason and who authorised it',
    [FILTERS.class, FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const records = await PromotionRecord.find(promotionQuery(filters, { type: 'special' }))
        .populate(promotionPopulate)
        .sort({ performed_at: -1 });
      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'fromClass', label: 'From' },
          { key: 'toClass', label: 'To' },
          { key: 'reason', label: 'Reason' },
          { key: 'performedBy', label: 'Authorised By' },
          { key: 'date', label: 'Date', type: 'date' }
        ],
        rows: records.map(promotionRow),
        summary: [{ label: 'Special Promotions', value: records.length }]
      };
    }
  ),

  report(
    'Promotion',
    'promotion-transfers',
    'Students Transferred Between Classes',
    'Every move that was not a straight promotion up one class',
    [FILTERS.dateFrom, FILTERS.dateTo],
    async (filters) => {
      const [records, classes] = await Promise.all([
        PromotionRecord.find(promotionQuery(filters, { type: { $in: ['special', 'normal'] } }))
          .populate(promotionPopulate)
          .sort({ performed_at: -1 }),
        Class.find()
      ]);

      const nextByClass = new Map(
        classes.map((klass) => [String(klass._id), nextClassFor(klass, classes)])
      );

      // A 'normal' record whose destination isn't the computed next class was
      // written before the ladder changed — surface it as a transfer too.
      const transfers = records.filter((record) => {
        if (record.type === 'special') return true;
        const expected = nextByClass.get(String(record.from_class?._id ?? record.from_class));
        return expected && String(expected._id) !== String(record.to_class?._id ?? record.to_class);
      });

      return {
        columns: [
          { key: 'rollNo', label: 'Admission No' },
          { key: 'name', label: 'Student' },
          { key: 'fromClass', label: 'From' },
          { key: 'toClass', label: 'To' },
          { key: 'type', label: 'Type' },
          { key: 'reason', label: 'Reason' },
          { key: 'date', label: 'Date', type: 'date' }
        ],
        rows: transfers.map(promotionRow),
        summary: [{ label: 'Transfers', value: transfers.length }]
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
  ...performanceReports,
  ...examinationReports,
  ...promotionReports,
  ...assignmentReports
];
