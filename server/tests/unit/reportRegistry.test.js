import { getCatalogFor, getReport, canRun, DEPARTMENTS } from '../../src/reports/registry.js';
import { academicReports } from '../../src/reports/academicReports.js';
import { teacherReports } from '../../src/reports/teacherReports.js';
import { financeReports } from '../../src/reports/financeReports.js';
import { libraryReports } from '../../src/reports/libraryReports.js';
import {
  parseExamScope,
  percent,
  round1,
  resolveHistoricalRoster,
  resolveHistoricalClassMap,
  resolveYearScopedStudentIds
} from '../../src/reports/helpers.js';

// The registry and its helpers are pure — no database, so these run without Mongo.

const ALL = [...academicReports, ...teacherReports, ...financeReports, ...libraryReports];

describe('report definitions', () => {
  it('gives every report a unique id', () => {
    const ids = ALL.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every report the metadata the catalogue needs', () => {
    for (const report of ALL) {
      expect(typeof report.run).toBe('function');
      expect(report.title).toBeTruthy();
      expect(report.description).toBeTruthy();
      expect(report.group).toBeTruthy();
      expect(report.roles.length).toBeGreaterThan(0);
    }
  });

  it('places every report in a declared department', () => {
    const departmentIds = DEPARTMENTS.map((d) => d.id);
    for (const report of ALL) {
      expect(departmentIds).toContain(report.department);
    }
  });

  it('covers all five academic report groups from the brief', () => {
    const groups = new Set(academicReports.map((r) => r.group));
    expect(groups).toEqual(
      new Set(['Students', 'Academic Performance', 'Examinations', 'Promotion', 'Teaching Assignments']),
    );
  });

  it('covers all three teacher report groups from the brief', () => {
    const groups = new Set(teacherReports.map((r) => r.group));
    expect(groups).toEqual(new Set(['My Teaching', 'Assessment', 'Examinations']));
  });

  it('covers all four finance report groups from the brief', () => {
    const groups = new Set(financeReports.map((r) => r.group));
    expect(groups).toEqual(
      new Set(['Fee Collection', 'Payments', 'Outstanding Balances', 'Financial Summary']),
    );
  });

  it('covers all four library report groups from the brief', () => {
    // §14.2 Library Reports: inventory & availability, borrowing/return
    // activity, overdue items, library usage summaries.
    const groups = new Set(libraryReports.map((r) => r.group));
    expect(groups).toEqual(
      new Set(['Inventory & Availability', 'Borrowing Activity', 'Overdue & Fines', 'Library Usage']),
    );
  });
});

describe('role-based access', () => {
  it('gives academic staff both departments', () => {
    for (const role of ['admin', 'principal', 'academic_officer']) {
      const departments = getCatalogFor(role).map((d) => d.id);
      expect(departments).toEqual(expect.arrayContaining(['academic', 'teaching']));
    }
  });

  it('gives teachers only their own teaching department', () => {
    const departments = getCatalogFor('teacher').map((d) => d.id);
    expect(departments).toEqual(['teaching']);
  });

  it('keeps every academic report out of a teacher\'s catalogue', () => {
    const visible = getCatalogFor('teacher')
      .flatMap((d) => d.groups)
      .flatMap((g) => g.reports)
      .map((r) => r.id);
    for (const report of academicReports) {
      expect(visible).not.toContain(report.id);
    }
  });

  it('refuses a teacher running an academic report directly', () => {
    for (const report of academicReports) {
      expect(canRun(report, 'teacher')).toBe(false);
    }
  });

  it('gives roles without a reporting department nothing at all', () => {
    // Librarian now HAS a department (library); students and parents still
    // read their own results/attendance/fees through their portals only.
    for (const role of ['student', 'parent']) {
      expect(getCatalogFor(role)).toEqual([]);
    }
  });

  it('gives librarians only the library department', () => {
    const departments = getCatalogFor('librarian').map((d) => d.id);
    expect(departments).toEqual(['library']);
  });

  it('keeps every library report away from teachers, academic officers and accountants', () => {
    // Library reports are inventory/circulation data — no reason for teaching
    // or finance roles to see them, and the librarian sees no other department.
    for (const role of ['teacher', 'academic_officer', 'accountant']) {
      const visible = getCatalogFor(role)
        .flatMap((d) => d.groups)
        .flatMap((g) => g.reports)
        .map((r) => r.id);
      for (const report of libraryReports) {
        expect(visible).not.toContain(report.id);
        expect(canRun(report, role)).toBe(false);
      }
    }
  });

  it('keeps academic, teaching and finance reports away from librarians', () => {
    for (const report of [...academicReports, ...teacherReports, ...financeReports]) {
      expect(canRun(report, 'librarian')).toBe(false);
    }
  });

  it('keeps financial data out of the academic and teaching departments', () => {
    // Teachers and academic officers must never see fee or invoice data; only
    // the finance department may carry it.
    const financial = /fee|invoice|payment|revenue|salary|payroll|discount|waiver|outstanding/i;
    for (const report of [...academicReports, ...teacherReports]) {
      expect(report.id).not.toMatch(financial);
      expect(report.title).not.toMatch(financial);
    }
  });

  it('gives accountants the finance department and nothing else', () => {
    const departments = getCatalogFor('accountant').map((d) => d.id);
    expect(departments).toEqual(['finance']);
  });

  it('keeps every finance report away from teachers and academic officers', () => {
    for (const role of ['teacher', 'academic_officer']) {
      const visible = getCatalogFor(role)
        .flatMap((d) => d.groups)
        .flatMap((g) => g.reports)
        .map((r) => r.id);
      for (const report of financeReports) {
        expect(visible).not.toContain(report.id);
        expect(canRun(report, role)).toBe(false);
      }
    }
  });

  it('keeps academic and teaching reports away from accountants', () => {
    for (const report of [...academicReports, ...teacherReports]) {
      expect(canRun(report, 'accountant')).toBe(false);
    }
  });
});

describe('getReport', () => {
  it('finds a report by id', () => {
    expect(getReport('students-total')?.title).toBe('Total Students');
  });

  it('registers the Refunds report in the Payments group, finance-only', () => {
    const refunds = getReport('finance-refunds');
    expect(refunds).not.toBeNull();
    expect(refunds.group).toBe('Payments');
    expect(refunds.department).toBe('finance');
    expect(canRun(refunds, 'accountant')).toBe(true);
    expect(canRun(refunds, 'admin')).toBe(true);
    expect(canRun(refunds, 'teacher')).toBe(false);
    expect(canRun(refunds, 'academic_officer')).toBe(false);
  });

  it('returns null for an unknown id', () => {
    expect(getReport('does-not-exist')).toBeNull();
  });

  it('treats an unknown report as not runnable', () => {
    expect(canRun(getReport('does-not-exist'), 'admin')).toBe(false);
  });
});

describe('helpers', () => {
  it('unpacks an examination period scope', () => {
    expect(parseExamScope({ scope: 'period:abc' })).toEqual({ exam_period_id: 'abc' });
  });

  it('unpacks a single-exam scope', () => {
    expect(parseExamScope({ scope: 'exam:xyz' })).toEqual({ exam_id: 'xyz' });
  });

  it('falls back to explicit params', () => {
    expect(parseExamScope({ exam_period_id: 'p1' })).toEqual({ exam_period_id: 'p1' });
  });

  it('returns nothing when no scope was chosen', () => {
    expect(parseExamScope({})).toEqual({});
    expect(parseExamScope({ scope: '' })).toEqual({});
  });

  it('computes percentages without dividing by zero', () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(0, 0)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(round1(66.666)).toBe(66.7);
  });
});

// ------------------------------------------------------------
// Historical (academic-year) roster resolvers
//
// A student's Student.classId is their *current* class — it moves when they
// are promoted. Reports scoped to a past academic year ("Class 5, 2025") must
// resolve enrolment through the StudentClass ledger instead, or figures
// silently land in the wrong class after a promotion. These tests lock in
// the "no year filter → null (fall back to live classId)" behaviour that
// every caller relies on to decide whether to switch resolvers, without
// needing a live database.
// ------------------------------------------------------------
describe('historical roster resolvers', () => {
  it('resolveHistoricalRoster returns null when no year filter is given', async () => {
    await expect(resolveHistoricalRoster({})).resolves.toBeNull();
    await expect(resolveHistoricalRoster({ class_id: 'abc' })).resolves.toBeNull();
  });

  it('resolveHistoricalClassMap returns null when no year filter is given', async () => {
    await expect(resolveHistoricalClassMap({})).resolves.toBeNull();
    await expect(resolveHistoricalClassMap({ class_id: 'abc' })).resolves.toBeNull();
  });

  it('resolveYearScopedStudentIds returns null when no year filter is given', async () => {
    await expect(resolveYearScopedStudentIds({})).resolves.toBeNull();
    await expect(resolveYearScopedStudentIds({ class_id: 'abc' })).resolves.toBeNull();
  });
});

// Reports that group or filter on "students in a class" must offer the year
// filter — otherwise the only meaning the user can express is "today's
// roster", and historical reports read as an implementation shortcut
// rather than a real choice.
describe('academic-year filter coverage', () => {
  const shouldOfferYear = [
    // Student rosters — section history became available on 2026-08-19
    // when StudentClass gained a `section` field, so this list now includes
    // students-by-section too.
    'students-total',
    'students-active',
    'students-by-class',
    'students-by-section',
    'students-demographics',
    // Finance rows and class rollups: bucketing invoices by a student's
    // current class silently drifts as the school promotes them.
    // finance-collection-by-year is intentionally omitted — the year is
    // its primary axis, so a year filter would collapse it to a single row.
    'finance-collection-summary',
    'finance-collection-by-class',
    'finance-fully-paid',
    'finance-partially-paid',
    'finance-unpaid',
    'finance-discounts',
    'finance-outstanding-students',
    'finance-outstanding-by-class',
    'finance-aging',
    'finance-dashboard'
  ];

  for (const id of shouldOfferYear) {
    it(`${id} declares FILTERS.year`, () => {
      const report = getReport(id);
      expect(report).toBeTruthy();
      const keys = report.filters.map((f) => f.key);
      expect(keys).toContain('year_id');
    });
  }

});
