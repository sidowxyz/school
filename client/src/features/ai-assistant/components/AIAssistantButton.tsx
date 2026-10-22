import { useState } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { useAuth } from '../../../hooks/useAuth';
import { roleCanAccess } from '../../../hooks/usePermission';
import AIAssistantPanel from './AIAssistantPanel';
import { Button } from '@/components/ui/button';

/**
 * Persistent assistant launcher.
 *
 * Mounted in AppLayout so it survives route changes. Hidden for roles with no
 * tools — the server would refuse them anyway, but showing an assistant that
 * can answer nothing is worse than not showing one.
 */
export default function AIAssistantButton() {
  const [open, setOpen] = useState(false);
  const { role } = useAuth();

  if (!roleCanAccess(role, 'ai-assistant')) return null;

  return (
    <>
      {!open && (
        <Button variant="plain"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Buildings assistant"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-colors hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 print:hidden"
        >
          <Sparkle size={19} />
        </Button>
      )}

      <AIAssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
