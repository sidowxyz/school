// Roles and page access.
//
// Built-in roles are fixed: the code relies on them (a teacher's own classes,
// a student's own portal, ...) and their access is decided by the authorize()
// lists on each route. Custom roles are created by an admin on the Roles page
// and get exactly the pages and actions ticked there. For a custom role the
// authorize() middleware checks the request against the role's permissions
// using the map below.

export const SYSTEM_ROLES = ['admin', 'principal', 'academic_officer', 'teacher', 'accountant', 'student', 'parent'];

export const ACTIONS = ['view', 'create', 'edit', 'delete'];

// Pages a custom role can be given, with the API paths (under /api) that
// belong to each page. User accounts, roles and settings stay admin-only so a
// custom role can never hand itself more access.
export const MODULES = [
  // A student's profile also reads their attendance and fees through the staff portal routes.
  { key: 'students', label: 'Students', group: 'People', paths: ['/students', '/portal/student'] },
  { key: 'parents', label: 'Parents', group: 'People', paths: ['/parents'] },
  { key: 'teachers', label: 'Teachers', group: 'People', paths: ['/teachers', '/staff'] },
  { key: 'teacher-attendance', label: 'Staff Attendance', group: 'People', paths: ['/staff-attendance'] },
  { key: 'attendance', label: 'Attendance', group: 'Academics', paths: ['/attendance'] },
  { key: 'timetable', label: 'Timetable', group: 'Academics', paths: ['/timetable', '/assignments', '/teacher-assignments'] },
  {
    key: 'academic-structure', label: 'Academic Structure', group: 'Academics',
    paths: ['/years', '/terms', '/levels', '/periods', '/classes', '/sections', '/subjects'],
  },
  {
    key: 'fees', label: 'Fees & Payments', group: 'Administration',
    paths: [
      '/fees', '/fee-types', '/fee-structures', '/payment-methods', '/student-fees', '/student-invoices', '/invoices', '/payments',
      '/applies-to', '/scholarships', '/scholarship-types', '/student-scholarships', '/discount-types', '/sibling-rules',
      '/v1/analytics/finance-summary',
    ],
  },
  { key: 'reports', label: 'Reports', group: 'Administration', paths: ['/reports', '/financial-reports'] },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

// Lists every page uses for its filters (classes, terms, payment methods, ...)
// and the school's name and logo. Any custom role that can open at least one
// page may read these; changing settings stays with admins.
const LOOKUP_PATHS = [...MODULES.find((m) => m.key === 'academic-structure').paths, '/payment-methods', '/v1/settings'];

// What each built-in role can open, shown read-only on the Roles page.
// Keep in step with client/src/hooks/usePermission.ts.
const ALL = ACTIONS;
export const BUILT_IN_ROLES = [
  { key: 'admin', name: 'Admin', color: 'pink', description: 'Full access to everything, including user accounts, roles and settings.', allAccess: true },
  {
    key: 'principal', name: 'Principal', color: 'violet', description: 'Runs the school day to day: people, attendance and reports.',
    permissions: { students: ALL, parents: ['view', 'create', 'edit'], teachers: ['view'], 'teacher-attendance': ['view', 'create', 'edit'], attendance: ['view', 'create', 'edit'], timetable: ['view'], reports: ['view'] },
  },
  {
    key: 'academic_officer', name: 'Academic Officer', color: 'blue', description: 'Sets up the school year, classes, subjects and the timetable.',
    permissions: { 'academic-structure': ALL, timetable: ALL, 'teacher-attendance': ['view', 'create', 'edit'], reports: ['view'] },
  },
  {
    key: 'teacher', name: 'Teacher', color: 'green', description: 'Takes attendance, keeps teaching logs and sees their own timetable.',
    permissions: { attendance: ['view', 'create', 'edit'], timetable: ['view'], reports: ['view'] },
  },
  {
    key: 'accountant', name: 'Accountant', color: 'yellow', description: 'Collects fees, prints receipts and runs finance reports.',
    permissions: { fees: ALL, reports: ['view'] },
  },
  { key: 'student', name: 'Student', color: 'blue', description: 'Sees only their own portal: profile, attendance, timetable and fees.', portal: true },
  { key: 'parent', name: 'Parent', color: 'pink', description: "Sees only their own children's portal.", portal: true },
];

const startsWithPath = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

/** The page an API path belongs to, e.g. '/api/classes/1' -> 'academic-structure'. */
export const moduleForPath = (url) => {
  const path = url.split('?')[0].replace(/^\/api(?=\/)/, '');
  // Longest prefix wins, so '/v1/analytics/finance-summary' beats nothing and
  // '/student-fees' isn't mistaken for '/students'.
  let best = null;
  for (const m of MODULES) {
    for (const p of m.paths) {
      if (startsWithPath(path, p) && (!best || p.length > best.length)) best = { key: m.key, length: p.length };
    }
  }
  return best?.key ?? null;
};

export const isLookupPath = (url) => {
  const path = url.split('?')[0].replace(/^\/api(?=\/)/, '');
  return LOOKUP_PATHS.some((p) => startsWithPath(path, p));
};

export const actionForMethod = (method) => ({
  GET: 'view', HEAD: 'view', POST: 'create', PUT: 'edit', PATCH: 'edit', DELETE: 'delete',
}[method] ?? 'view');
