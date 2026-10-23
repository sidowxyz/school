import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userCanAccess } from '../hooks/usePermission';

interface Props { module: string }

/**
 * Gates a route by the same per-role module permissions the Sidebar uses to
 * decide which links to show, so a hidden nav link is also a blocked route.
 */
export default function ModuleRoute({ module }: Props) {
  const { user } = useAuth();
  return userCanAccess(user, module) ? <Outlet /> : <Navigate to="/403" replace />;
}
