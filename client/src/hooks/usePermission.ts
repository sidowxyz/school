import { useAuth } from './useAuth';

// 'ai-assistant' gates only whether the assistant launcher is shown. It is not a
// grant of data access: every tool the assistant can run is separately
// role-checked server-side in server/src/ai/registry, and student/parent tools
// resolve their own records from the signed-in user rather than accepting an id.
const rolePermissions: Record<string, string[]> = {
  admin:            ['*'],
  principal:        ['dashboard', 'students', 'teachers', 'parents', 'attendance', 'marks-results', 'reports', 'communication', 'teacher-attendance', 'student-promotion', 'ai-assistant'],
  academic_officer: ['dashboard', 'academic-structure', 'timetable', 'examinations', 'marks-results', 'reports', 'ai-assistant'],
// Teachers manage their assigned teaching activities only.
// Timetable access is limited to their own assigned schedule,
// while academic timetable administration remains with academic officers/admins.
teacher: [
  'dashboard',
  'timetable',
  'teaching-log',
  'attendance',
  'marks-results',
  'reports',
  'ai-assistant',
],
  accountant:       ['dashboard', 'fees', 'discounts', 'reports', 'ai-assistant'],
  // 'attendance' (the taking/marking interface) is teacher/principal/admin-only —
  // students and parents view their own read-only report inside their portal instead.
  // Nothing marks-results / reports / etc. for these roles: the whole student
  // and parent surface lives inside student-portal / parent-portal, which has
  // its own ResultsTab, ReportCardsTab, AttendanceTab, FeesTab, etc. That is
  // the only place they belong, and putting them anywhere else would ship
  // stripped-down staff-facing screens that the portals already do properly.
  student:          ['dashboard', 'library', 'student-portal', 'ai-assistant'],
  parent:           ['dashboard', 'parent-portal', 'ai-assistant'],
  // 'reports' surfaces only the Library department on the librarian's page —
  // the report catalogue is filtered per-role server-side, so nothing academic,
  // teaching or finance is reachable from here.
  librarian:        ['dashboard', 'library', 'reports', 'ai-assistant'],
};

export function usePermission(module: string): boolean {
  const { role } = useAuth();
  if (!role) return false;
  const allowed = rolePermissions[role] ?? [];
  return allowed.includes('*') || allowed.includes(module);
}

/** Non-hook variant for filtering static lists (e.g. Sidebar nav items) by an explicit role. */
export function roleCanAccess(role: string | undefined, module: string): boolean {
  if (!role) return false;
  const allowed = rolePermissions[role] ?? [];
  return allowed.includes('*') || allowed.includes(module);
}
