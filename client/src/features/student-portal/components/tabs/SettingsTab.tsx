import { useEffect, useState } from 'react';
import { SpinnerGap, User, Bell, Globe, Lock, ShieldCheck, Sun, Moon, Laptop } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '../Toast';
import { usePortal } from '../../context/PortalContext';
import { fullName, initialsOf } from '../../utils/portalStudent';
import { useTheme, type Theme } from '../../../../context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PHONE_PATTERN = /^[+\d][\d\s-]{6,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubTab = 'profile' | 'notifications' | 'appearance' | 'security';

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Globe },
  { id: 'security', label: 'Security', icon: Lock },
];

export default function SettingsTab() {
  const [sub, setSub] = useState<SubTab>('profile');
  const { student } = usePortal();
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Hairline Divided Summary KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px">
          <KPICell
            icon={User}
            iconClass="text-primary"
            label="Account"
            value={student ? fullName(student).split(' ')[0] : 'Student'}
            sub={student?.admissionNumber || 'Enrolled student'}
          />
          <KPICell
            icon={Globe}
            iconClass="text-sky-600 dark:text-sky-400"
            label="Theme"
            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
            sub="Visual interface"
          />
          <KPICell
            icon={Bell}
            iconClass="text-amber-600 dark:text-amber-400"
            label="Alerts"
            value="Active"
            sub="Notification digest"
          />
          <KPICell
            icon={ShieldCheck}
            iconClass="text-emerald-600 dark:text-emerald-400"
            label="Security"
            value="Protected"
            sub="Standard credential"
          />
        </div>
      </Card>

      {/* Sub Tabs Pill Navigation */}
      <Card className="border-border/80 shadow-2xs p-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {SUB_TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                sub === t.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Sub Tab Panels */}
      {sub === 'profile' && <ProfileSettings />}
      {sub === 'notifications' && <NotificationSettings />}
      {sub === 'appearance' && <AppearanceSettings />}
      {sub === 'security' && <SecuritySettings />}
    </div>
  );
}

function ProfileSettings() {
  const { student } = usePortal();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [touched, setTouched] = useState({ phone: false, email: false });
  const { showToast } = useToast();

  useEffect(() => {
    if (student) {
      setPhone(student.phoneNumber ?? '');
      setEmail(student.email ?? '');
      setAddress(student.address ?? '');
    }
  }, [student]);

  const phoneValid = PHONE_PATTERN.test(phone.trim());
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const addressValid = address.trim().length > 0;
  const formValid = phoneValid && emailValid && addressValid;

  const FloppyDisk = () => {
    setTouched({ phone: true, email: true });
    if (!formValid) {
      showToast('Please fix the highlighted fields before saving.', 'error');
      return;
    }
    showToast('Profile settings saved', 'success');
  };

  if (!student) {
    return (
      <Card className="border-border/80 shadow-2xs">
        <CardContent className="p-16 flex items-center justify-center text-muted-foreground text-sm">
          <SpinnerGap size={20} className="animate-spin mr-2 text-primary" /> Loading profile…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Profile Settings</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Update your contact information and display preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-border/60">
          <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shrink-0 shadow-xs">
            {initialsOf(student)}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{fullName(student)}</p>
            <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Phone Number
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              className={`w-full ${
                touched.phone && !phoneValid ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
            />
            {touched.phone && !phoneValid && <p className="text-xs text-destructive mt-1">Enter a valid phone number.</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email Address
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={`w-full ${
                touched.email && !emailValid ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
            />
            {touched.email && !emailValid && <p className="text-xs text-destructive mt-1">Enter a valid email address.</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Home Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full"
            placeholder="Residential address"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button onClick={FloppyDisk} className="px-6 text-xs font-semibold">
            FloppyDisk Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, sub, defaultOn = true }: { label: string; sub: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/40 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
          on ? 'bg-primary' : 'bg-muted-foreground/20'
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-card shadow-xs transition-all ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function NotificationSettings() {
  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Notification Preferences</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Choose which notifications and alerts you receive across the academic term
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 divide-y divide-border/40">
        <Toggle label="Academic notices" sub="Exam schedules, results publication, timetable changes" />
        <Toggle label="Fee reminders" sub="Invoice due dates and payment receipts confirmation" />
        <Toggle label="Library reminders" sub="Book loan return due dates and reservation updates" />
        <Toggle label="Direct messages" sub="New messages from instructors and academic coordinators" />
        <Toggle label="Events & announcements" sub="School-wide circulars and holiday calendar updates" defaultOn={false} />
      </CardContent>
    </Card>
  );
}

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Laptop },
];

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Appearance & Display</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Customize how the portal interface renders across your devices
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Theme Mode
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {THEME_OPTIONS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center justify-center gap-2 text-xs font-semibold rounded-lg py-2.5 px-4 border transition-all cursor-pointer ${
                  theme === t.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <Toggle label="Compact density mode" sub="Reduce spacing to display more records on screen" defaultOn={false} />
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Account Security</CardTitle>
        <CardDescription className="text-xs mt-0.5">Manage your portal credentials and access security</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form className="space-y-4 max-w-lg" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Password
            </label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              New Password
            </label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Confirm New Password
            </label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="pt-2">
            <Button type="submit" className="w-full sm:w-auto px-6 text-xs font-semibold">
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── KPI Strip Cell ─── */
function KPICell({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon size={15} className={iconClass} />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
