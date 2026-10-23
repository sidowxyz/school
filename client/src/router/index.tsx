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
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';

// Dashboards
import AdminDashboard from '../features/dashboard/pages/AdminDashboard';
import PrincipalDashboard from '../features/dashboard/pages/PrincipalDashboard';
import AcademicOfficerDashboard from '../features/dashboard/pages/AcademicOfficerDashboard';
import TeacherDashboard from '../features/dashboard/pages/TeacherDashboard';
import AccountantDashboard from '../features/dashboard/pages/AccountantDashboard';
import StudentDashboard from '../features/dashboard/pages/StudentDashboard';
import ParentDashboard from '../features/dashboard/pages/ParentDashboard';

// Academic Structure
import AcademicStructurePage from '../features/academic-structure/pages/AcademicStructurePage';

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

// Finance
import FeeManagementPage from '../features/finance/pages/FeeManagementPage';

// Reports
import ReportsPage from '../features/reports/pages/ReportsPage';

// Settings
import SettingsPage from '../features/settings/pages/SettingsPage';

// Audit Logs
import AuditLogsPage from '../features/audit-logs/pages/AuditLogsPage';

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
import { homePathFor } from '../hooks/usePermission';
import RolesPage from '../features/roles/pages/RolesPage';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
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
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
    ],
  },

  // Protected application routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/403', element: <ForbiddenPage /> },

          // Dashboards — any authenticated role, per rolePermissions' 'dashboard' entry
          moduleGated('dashboard', [
            { path: '/dashboard/admin', element: <AdminDashboard /> },
            { path: '/dashboard/principal', element: <PrincipalDashboard /> },
            { path: '/dashboard/academic-officer', element: <AcademicOfficerDashboard /> },
            { path: '/dashboard/teacher', element: <TeacherDashboard /> },
            { path: '/dashboard/accountant', element: <AccountantDashboard /> },
            { path: '/dashboard/student', element: <StudentDashboard /> },
            { path: '/dashboard/parent', element: <ParentDashboard /> },
          ]),

          moduleGated('academic-structure', [
            { path: '/academic-structure', element: <AcademicStructurePage /> },
          ]),

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
          moduleGated('settings', [
            { path: '/settings', element: <SettingsPage /> },
          ]),

          moduleGated('audit-logs', [
            { path: '/audit-logs', element: <AuditLogsPage /> },
          ]),

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
