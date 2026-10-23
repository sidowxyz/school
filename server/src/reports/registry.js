/**
 * The report catalogue.
 *
 * A school's departments need different information, so reports are grouped by
 * department and gated by role rather than pooled into one page. Each report is
 * one entry here — id, who may run it, what filters it accepts, and a `run`
 * that returns a uniform table. Adding a report means adding a definition, not
 * a new route, controller and client screen.
 *
 * Every `run` resolves to:
 *   { columns: [{ key, label, type? }], rows: [...], summary?: [{ label, value }] }
 * so one client component renders any report and one CSV export serialises it.
 */

import { academicReports } from './academicReports.js';
import { teacherReports } from './teacherReports.js';
import { financeReports } from './financeReports.js';

/** Departments, in the order the UI lists them. */
export const DEPARTMENTS = [
  {
    id: 'academic',
    name: 'Academic Office',
    description: 'Students and teaching assignments',
    roles: ['admin', 'principal', 'academic_officer']
  },
  {
    id: 'teaching',
    name: 'My Teaching',
    description: 'Your assigned classes, subjects, timetable and attendance',
    roles: ['teacher', 'admin', 'principal', 'academic_officer']
  },
  {
    id: 'finance',
    name: 'Finance Office',
    description: 'Fee collection, payments, outstanding balances and revenue',
    roles: ['admin', 'accountant', 'principal']
  }
];

const ALL_REPORTS = [...academicReports, ...teacherReports, ...financeReports];

const byId = new Map(ALL_REPORTS.map((report) => [report.id, report]));

export const getReport = (id) => byId.get(id) ?? null;

export const canRun = (report, role) => Boolean(report) && report.roles.includes(role);

/**
 * The catalogue this role may actually run, grouped for display. Reports the
 * caller can't run are omitted entirely rather than shown and refused.
 */
export const getCatalogFor = (role) => {
  const departments = DEPARTMENTS.filter((d) => d.roles.includes(role)).map((department) => {
    const reports = ALL_REPORTS.filter((r) => r.department === department.id && r.roles.includes(role));

    // Preserve each group's first-appearance order rather than sorting
    // alphabetically — the groups read as a workflow.
    const groups = [];
    const groupIndex = new Map();
    for (const report of reports) {
      if (!groupIndex.has(report.group)) {
        groupIndex.set(report.group, groups.length);
        groups.push({ name: report.group, reports: [] });
      }
      groups[groupIndex.get(report.group)].reports.push({
        id: report.id,
        title: report.title,
        description: report.description,
        filters: report.filters ?? []
      });
    }

    return { ...department, groups, report_count: reports.length };
  });

  return departments.filter((d) => d.report_count > 0);
};
