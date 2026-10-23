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
          aria-label="Open school assistant"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 print:hidden"
        >
          <Sparkle size={19} />
        </Button>
      )}

      <AIAssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
