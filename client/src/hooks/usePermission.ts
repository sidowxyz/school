import { useAuth } from './useAuth';

// 'ai-assistant' gates only whether the assistant launcher is shown. It is not a
// grant of data access: every tool the assistant can run is separately
// role-checked server-side in server/src/ai/registry, and student/parent tools
// resolve their own records from the signed-in user rather than accepting an id.
const rolePermissions: Record<string, string[]> = {
  admin:            ['*'],
  principal:        ['dashboard', 'students', 'teachers', 'parents', 'attendance', 'reports', 'teacher-attendance', 'ai-assistant'],
  academic_officer: ['dashboard', 'academic-structure', 'timetable', 'reports', 'ai-assistant'],
  // Teachers manage their assigned teaching activities only. Timetable access is
  // limited to their own assigned schedule; timetable administration stays with
  // academic officers and admins.
  teacher:          ['dashboard', 'timetable', 'teaching-log', 'attendance', 'reports', 'ai-assistant'],
  accountant:       ['dashboard', 'fees', 'discounts', 'reports', 'ai-assistant'],
  // 'attendance' (the taking/marking interface) is teacher/principal/admin-only —
  // students and parents see their own records inside their portal instead.
  student:          ['dashboard', 'student-portal', 'ai-assistant'],
  parent:           ['dashboard', 'parent-portal', 'ai-assistant'],
};

// Modules that exist only for a specific role and are hidden even from '*' roles.
const teacherOnlyModules = ['teaching-log'];

function canAccess(role: string, module: string): boolean {
  const allowed = rolePermissions[role] ?? [];
  if (allowed.includes('*')) return !teacherOnlyModules.includes(module);
  return allowed.includes(module);
}

export function usePermission(module: string): boolean {
  const { role } = useAuth();
  if (!role) return false;
  return canAccess(role, module);
}

/** Non-hook variant for filtering static lists (e.g. Sidebar nav items) by an explicit role. */
export function roleCanAccess(role: string | undefined, module: string): boolean {
  if (!role) return false;
  return canAccess(role, module);
}
