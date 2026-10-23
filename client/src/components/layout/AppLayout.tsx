import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StudentPortalSidebar from './StudentPortalSidebar';
import TopBar from './TopBar';
import AIAssistantButton from '../../features/ai-assistant/components/AIAssistantButton';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../features/auth/api/authApi';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role } = useAuth();
  const isStudent = role === 'student';
  const updateUser = useAuthStore((s) => s.updateUser);

  // A role's pages can change on the Roles page while someone is signed in.
  // Re-read them when the app opens and whenever the window regains focus, so
  // the sidebar and page gates follow without signing out.
  useEffect(() => {
    const refresh = () => {
      authApi.me()
        .then((me) => updateUser({ role: me.user.role, roleName: me.roleName, permissions: me.permissions }))
        .catch(() => { /* signed out or offline — the API guards still apply */ });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [updateUser]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-all duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {isStudent ? (
          <StudentPortalSidebar onMobileClose={() => setMobileOpen(false)} />
        ) : (
          <Sidebar onMobileClose={() => setMobileOpen(false)} />
        )}
      </div>

      {/* Main Content Viewport */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <div className="print:hidden">
          <TopBar onMobileMenuClick={() => setMobileOpen((o) => !o)} />
        </div>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-muted/40 print:overflow-visible print:p-0 scrollbar-thin">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Persistent AI Assistant Button */}
      <AIAssistantButton />
    </div>
  );
}
