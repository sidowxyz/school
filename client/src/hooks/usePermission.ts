import { useAuth } from './useAuth';
import type { User } from '../types/auth.types';

// 'ai-assistant' gates only whether the assistant launcher is shown. It is not a
// grant of data access: every tool the assistant can run is separately
// role-checked server-side in server/src/ai/registry, and student/parent tools
// resolve their own records from the signed-in user rather than accepting an id.
//
// Built-in roles only. Custom roles (made on the Roles page) carry their own
// pages in user.permissions, sent by the server at login and from /auth/me.
// Keep in step with BUILT_IN_ROLES in server/src/config/access.js.
const rolePermissions: Record<string, string[]> = {
  admin:            ['*'],
  principal:        ['dashboard', 'students', 'teachers', 'parents', 'attendance', 'timetable', 'reports', 'teacher-attendance', 'ai-assistant'],
  academic_officer: ['dashboard', 'academic-structure', 'timetable', 'teacher-attendance', 'reports', 'ai-assistant'],
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

export const BUILT_IN_ROLES = Object.keys(rolePermissions);
export const isBuiltInRole = (role?: string) => !!role && role in rolePermissions;

export type Action = 'view' | 'create' | 'edit' | 'delete';

// Modules that exist only for a specific role and are hidden even from '*' roles.
const teacherOnlyModules = ['teaching-log'];

// What each built-in role may change (beyond viewing) on the pages it can open.
// Mirrors the server's authorize() lists, so a button is only shown when the
// server will accept the click. Admin may do everything. 'fees-setup' covers
// class fees, payment methods and per-student discounts (admin only).
const builtInWrites: Record<string, Record<string, Action[]>> = {
  principal: {
    students: ['create', 'edit', 'delete'],
    parents: ['create', 'edit'],
    attendance: ['create', 'edit'],
    'teacher-attendance': ['create', 'edit', 'delete'],
  },
  academic_officer: {
    'academic-structure': ['create', 'edit', 'delete'],
    timetable: ['create', 'edit', 'delete'],
    'teacher-attendance': ['create', 'edit', 'delete'],
  },
  teacher: { attendance: ['create', 'edit'] },
  accountant: { fees: ['create', 'edit'] },
};

type Who = Pick<User, 'role' | 'permissions'> | null | undefined;

function canAccess(who: Who, module: string, action: Action = 'view'): boolean {
  if (!who?.role) return false;
  if (!isBuiltInRole(who.role)) return !!who.permissions?.[module]?.includes(action);
  const allowed = rolePermissions[who.role];
  if (allowed.includes('*')) return !teacherOnlyModules.includes(module);
  if (action !== 'view') return !!builtInWrites[who.role]?.[module]?.includes(action);
  return allowed.includes(module);
}

export function usePermission(module: string): boolean {
  const { user } = useAuth();
  return canAccess(user, module);
}

/**
 * Whether the signed-in user may do this on a page: built-in roles per
 * builtInWrites above, custom roles per what was ticked on the Roles page.
 * Use it to hide buttons the server would refuse.
 */
export function useCan(module: string, action: Action): boolean {
  const { user } = useAuth();
  return canAccess(user, module, action);
}

/** Non-hook variant for filtering static lists (e.g. Sidebar nav items). */
export function userCanAccess(who: Who, module: string): boolean {
  return canAccess(who, module);
}

/** Non-hook variant for a role alone — built-in roles only. */
export function roleCanAccess(role: string | undefined, module: string): boolean {
  return canAccess(role ? { role } : null, module);
}

const DASHBOARDS: Record<string, string> = {
  admin: '/dashboard/admin',
  principal: '/dashboard/principal',
  academic_officer: '/dashboard/academic-officer',
  teacher: '/dashboard/teacher',
  accountant: '/dashboard/accountant',
  student: '/student-portal',
  parent: '/parent-portal',
};

// Where a custom role lands: the first page it was given, in sidebar order.
const PAGE_PATHS: [string, string][] = [
  ['attendance', '/attendance'],
  ['timetable', '/timetable'],
  ['academic-structure', '/settings?tab=structure'],
  ['students', '/students'],
  ['teachers', '/teachers'],
  ['teacher-attendance', '/teacher-attendance'],
  ['parents', '/parents'],
  ['fees', '/finance'],
  ['reports', '/reports'],
];

/** The page a user opens on after signing in or clicking "Dashboard". */
export function homePathFor(who: Who): string {
  if (!who?.role) return '/login';
  if (isBuiltInRole(who.role)) return DASHBOARDS[who.role];
  return PAGE_PATHS.find(([module]) => canAccess(who, module))?.[1] ?? '/403';
}

/** "Academic Officer", or a custom role's own name. */
export function roleLabel(who: Pick<User, 'role' | 'roleName'> | null | undefined): string {
  if (!who?.role) return '';
  return who.roleName ?? who.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
