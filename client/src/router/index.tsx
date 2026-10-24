import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';
import ModuleRoute from './ModuleRoute';

import AppLayout from '../components/layout/AppLayout';
import AuthLayout from '../components/layout/AuthLayout';
import ForbiddenPage from '../components/common/ForbiddenPage';
import NotFoundPage from '../components/common/NotFoundPage';

// Authentication
import LoginPage from '../features/auth/pages/LoginPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';

// Dashboards
import AdminDashboard from '../features/dashboard/pages/AdminDashboard';
import PrincipalDashboard from '../features/dashboard/pages/PrincipalDashboard';
import AcademicOfficerDashboard from '../features/dashboard/pages/AcademicOfficerDashboard';
import TeacherDashboard from '../features/dashboard/pages/TeacherDashboard';
import AccountantDashboard from '../features/dashboard/pages/AccountantDashboard';
import StudentDashboard from '../features/dashboard/pages/StudentDashboard';
import ParentDashboard from '../features/dashboard/pages/ParentDashboard';

// Academic Structure

// Attendance
import StudentAttendancePage from '../features/attendance/pages/StudentAttendancePage';
import TeacherAttendancePage from '../features/teacher-attendance/pages/TeacherAttendancePage';

// Students
import StudentListPage from '../features/students/pages/StudentListPage';
import StudentProfilePage from '../features/students/pages/StudentProfilePage';

// Teachers
import TeacherListPage from '../features/teachers/pages/TeacherListPage';
import TeacherDetailPage from '../features/teachers/pages/TeacherDetailPage';
import TeacherPortalPage from '../features/teachers/pages/TeacherPortalPage';

// Parents
import ParentListPage from '../features/parents/pages/ParentListPage';
import ParentDetailPage from '../features/parents/pages/ParentDetailPage';

// Users
import UserListPage from '../features/users/pages/UserListPage';

// Timetable
import TimetablePage from '../features/timetable/pages/TimetablePage';
import ExamsPage from '../features/exams/pages/ExamsPage';

// Finance
import FeeManagementPage from '../features/finance/pages/FeeManagementPage';

// Reports
import ReportsPage from '../features/reports/pages/ReportsPage';

// Settings
import SettingsPage from '../features/settings/pages/SettingsPage';

// Audit Logs

// Parent Portal
import ParentPortalPage from '../features/parent-portal/pages/ParentPortalPage';

// Student Portal
import StudentPortalPage from '../features/student-portal/pages/StudentPortalPage';

// Teaching Log UI imports
import TeachingLogPage from '../app/dashboard/teaching-log/page';
import TeachingLogCreatePage from '../app/dashboard/teaching-log/create/page';
import TeachingLogDetailPage from '../app/dashboard/teaching-log/[id]/page';
import TeachingLogEditPage from '../app/dashboard/teaching-log/[id]/edit/page';

import { useAuthStore } from '../store/authStore';
import { homePathFor, userCanAccess } from '../hooks/usePermission';
import RolesPage from '../features/roles/pages/RolesPage';
import AccountPage from '../features/account/pages/AccountPage';
import RouteErrorPage from '../components/common/RouteErrorPage';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={homePathFor(user)} replace />;
}

// Settings holds several tabs with different owners (school details for admins,
// academic structure for the academic office, ...), so it opens for anyone who
// can use at least one of them.
function SettingsRoute() {
  const user = useAuthStore((s) => s.user);
  const canOpen = ['settings', 'academic-structure', 'audit-logs'].some((m) => userCanAccess(user, m));
  return canOpen ? <SettingsPage /> : <Navigate to="/403" replace />;
}

// Each role has its own dashboard; opening another role's (e.g. by typing the
// address) goes to your own instead. Admins may look at any of them.
function OwnDashboard({ path, children }: { path: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'admin' || homePathFor(user) === path) return <>{children}</>;
  return <Navigate to={homePathFor(user)} replace />;
}

// Wraps a set of routes in a per-role module permission gate (see usePermission.ts's
// rolePermissions — the same map that decides what the Sidebar shows).
function moduleGated(module: string, children: RouteObject[]) {
  return { element: <ModuleRoute module={module} />, children };
}

export const router = createBrowserRouter([
  // Public authentication routes
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
    ],
  },

  // Protected application routes
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/403', element: <ForbiddenPage /> },
          // Every signed-in person: appearance and their own password.
          { path: '/account', element: <AccountPage /> },

          // Dashboards — any authenticated role, per rolePermissions' 'dashboard' entry
          moduleGated('dashboard', [
            { path: '/dashboard/admin', element: <OwnDashboard path="/dashboard/admin"><AdminDashboard /></OwnDashboard> },
            { path: '/dashboard/principal', element: <OwnDashboard path="/dashboard/principal"><PrincipalDashboard /></OwnDashboard> },
            { path: '/dashboard/academic-officer', element: <OwnDashboard path="/dashboard/academic-officer"><AcademicOfficerDashboard /></OwnDashboard> },
            { path: '/dashboard/teacher', element: <OwnDashboard path="/dashboard/teacher"><TeacherDashboard /></OwnDashboard> },
            { path: '/dashboard/accountant', element: <OwnDashboard path="/dashboard/accountant"><AccountantDashboard /></OwnDashboard> },
            { path: '/dashboard/student', element: <OwnDashboard path="/student-portal"><StudentDashboard /></OwnDashboard> },
            { path: '/dashboard/parent', element: <OwnDashboard path="/parent-portal"><ParentDashboard /></OwnDashboard> },
          ]),

          // Academic Structure and Audit Logs now live in Settings.
          { path: '/academic-structure', element: <Navigate to="/settings?tab=structure" replace /> },
          { path: '/audit-logs', element: <Navigate to="/settings?tab=audit" replace /> },

          moduleGated('attendance', [
            { path: '/attendance', element: <StudentAttendancePage /> },
          ]),

          moduleGated('students', [
            { path: '/students', element: <StudentListPage /> },
            { path: '/students/:id', element: <StudentProfilePage /> },
          ]),

          moduleGated('teachers', [
            { path: '/teachers', element: <TeacherListPage /> },
            { path: '/teachers/:id', element: <TeacherDetailPage /> },
          ]),

          moduleGated('parents', [
            { path: '/parents', element: <ParentListPage /> },
            { path: '/parents/:id', element: <ParentDetailPage /> },
          ]),

          moduleGated('users', [
            { path: '/users', element: <UserListPage /> },
            { path: '/roles', element: <RolesPage /> },
          ]),

          moduleGated('teacher-attendance', [
            { path: '/teacher-attendance', element: <TeacherAttendancePage /> },
          ]),

          moduleGated('timetable', [
            { path: '/timetable', element: <TimetablePage /> },
          ]),

          moduleGated('exams', [
            { path: '/exams', element: <ExamsPage /> },
          ]),

          moduleGated('fees', [
            { path: '/finance', element: <FeeManagementPage /> },
            { path: '/fees', element: <Navigate to="/finance" replace /> },
            // The advanced accounting page was removed for the MVP.
            { path: '/finance/accounting', element: <Navigate to="/finance" replace /> },
          ]),

          moduleGated('reports', [
            { path: '/reports', element: <ReportsPage /> },
          ]),

          // Settings & Audit Logs have no Sidebar entry (no module grants them to
          // non-admin roles), so only 'admin' (which matches every module via '*')
          // passes ModuleRoute here.
          { path: '/settings', element: <SettingsRoute /> },

          moduleGated('parent-portal', [
            { path: '/parent-portal', element: <ParentPortalPage /> },
          ]),

          moduleGated('student-portal', [
            { path: '/student-portal', element: <StudentPortalPage /> },
          ]),

          moduleGated('teaching-log', [
            { path: '/teacher-portal', element: <TeacherPortalPage /> },
            { path: '/teaching-log', element: <TeachingLogPage /> },
            { path: '/teaching-log/create', element: <TeachingLogCreatePage /> },
            { path: '/teaching-log/:id', element: <TeachingLogDetailPage /> },
            { path: '/teaching-log/:id/edit', element: <TeachingLogEditPage /> },
            // Backward-compatible aliases
            { path: '/dashboard/teaching-log', element: <TeachingLogPage /> },
            { path: '/dashboard/teaching-log/create', element: <TeachingLogCreatePage /> },
            { path: '/dashboard/teaching-log/:id', element: <TeachingLogDetailPage /> },
            { path: '/dashboard/teaching-log/:id/edit', element: <TeachingLogEditPage /> },
          ]),

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
