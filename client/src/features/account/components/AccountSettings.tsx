import { useState, type FormEvent } from 'react';
import { Laptop, Lock, Moon, SpinnerGap, Sun, type Icon } from '@phosphor-icons/react';
import api from '../../../lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Panel } from '../../dashboard/components/DashboardKit';
import { useTheme, type Theme } from '../../../context/ThemeContext';
import { useAuthStore } from '../../../store/authStore';

const THEMES: { id: Theme; label: string; icon: Icon; fill: string }[] = [
  { id: 'light', label: 'Light', icon: Sun, fill: 'bg-tile-yellow' },
  { id: 'dark', label: 'Dark', icon: Moon, fill: 'bg-tile-violet' },
  { id: 'system', label: 'Same as device', icon: Laptop, fill: 'bg-tile-blue' },
];

/** What every signed-in person can change for themselves: how the app looks, and their password. */
export default function AccountSettings() {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSave = current.length > 0 && next.length >= 8 && confirm === next && !saving;

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      // This device stays signed in; every other device is signed out.
      const refreshToken = useAuthStore.getState().refreshToken;
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next, refreshToken });
      setCurrent(''); setNext(''); setConfirm('');
      showToast('Your password has been changed. Other devices have been signed out.');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Could not change your password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Appearance" description="How the app looks on this device">
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ id, label, icon: ThemeIcon, fill }) => (
            <Button key={id} variant="plain" type="button" onClick={() => setTheme(id)} aria-pressed={theme === id}
              className={cn('flex h-auto flex-col items-center gap-2 rounded-2xl p-4 text-sm font-medium text-tile-foreground transition', fill,
                theme === id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'opacity-80 hover:opacity-100')}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 dark:bg-white/10"><ThemeIcon size={18} /></span>
              {label}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel title="Change password" description="Use at least 8 characters">
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current" className="text-xs">Current password</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new" className="text-xs">New password</Label>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)}
              className={cn(tooShort && 'border-destructive')} />
            {tooShort && <p className="text-xs text-destructive">At least 8 characters.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm" className="text-xs">Type the new password again</Label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className={cn(mismatch && 'border-destructive')} />
            {mismatch && <p className="text-xs text-destructive">The passwords don't match.</p>}
          </div>
          <Button type="submit" disabled={!canSave}>
            {saving ? <SpinnerGap size={15} className="animate-spin" /> : <Lock size={15} />} Change password
          </Button>
        </form>
      </Panel>
    </div>
  );
}
