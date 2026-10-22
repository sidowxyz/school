import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StudentPortalSidebar from './StudentPortalSidebar';
import TopBar from './TopBar';
import AIAssistantButton from '../../features/ai-assistant/components/AIAssistantButton';
import { useAuth } from '../../hooks/useAuth';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role } = useAuth();
  const isStudent = role === 'student';

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
