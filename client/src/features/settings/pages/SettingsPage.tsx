import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ArrowCircleUp, Buildings, CalendarBlank, ClockCounterClockwise, FloppyDisk, Palette, Percent, SpinnerGap, WarningCircle, type Icon } from '@phosphor-icons/react';
import PageHeader from '../../../components/common/PageHeader';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import SchoolProfile from '../components/SchoolProfile';
import AcademicCalendar from '../components/AcademicCalendar';
import BrandingSettings from '../components/BrandingSettings';
import DiscountPolicy from '../components/DiscountPolicy';
import AuditLogsPage from '../../audit-logs/pages/AuditLogsPage';
import PromotionTab from '../../promotion/PromotionTab';
import { usePermission } from '../../../hooks/usePermission';
import { settingsApi, type SystemSettings } from '../api/settingsApi';
import { publishSchoolIdentity } from '../hooks/useSchoolIdentity';
import { DashboardLoading } from '../../dashboard/components/DashboardKit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId = 'school' | 'promotion' | 'calendar' | 'branding' | 'discounts' | 'audit';

// Each tab shows only for the people who may use it ("module" as in usePermission).
const TABS: { id: TabId; label: string; icon: Icon; module: 'settings' | 'academic-structure' | 'audit-logs' | 'calendar' }[] = [
  { id: 'school', label: 'School profile', icon: Buildings, module: 'settings' },
  { id: 'promotion', label: 'New school year', icon: ArrowCircleUp, module: 'academic-structure' },
  { id: 'calendar', label: 'Calendar', icon: CalendarBlank, module: 'calendar' },
  { id: 'branding', label: 'Logo & theme', icon: Palette, module: 'settings' },
  { id: 'discounts', label: 'Discount policy', icon: Percent, module: 'settings' },
  { id: 'audit', label: 'Audit logs', icon: ClockCounterClockwise, module: 'audit-logs' },
];

// Older links used the tab titles.
const LEGACY: Record<string, TabId> = {
  'School Profile': 'school', Academic: 'calendar', Branding: 'branding', 'Discount Policy': 'discounts', Audit: 'audit', activity: 'audit',
};

// The fields saved with "Save changes" (the logo saves on upload, the theme instantly).
const SAVED_FIELDS = ['schoolName', 'schoolCode', 'principalName', 'schoolEmail', 'schoolPhone', 'website', 'address', 'discountRule'] as const;

export default function SettingsPage() {
  const canSettings = usePermission('settings');
  const canStructure = usePermission('academic-structure');
  const canAudit = usePermission('audit-logs');
  const allowed = { settings: canSettings, 'academic-structure': canStructure, 'audit-logs': canAudit, calendar: canSettings || canStructure };
  const tabs = TABS.filter((t) => allowed[t.module]);

  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') ?? '';
  const asked = TABS.some((t) => t.id === raw) ? (raw as TabId) : LEGACY[raw];
  const tab: TabId = tabs.some((t) => t.id === asked) ? asked! : tabs[0]?.id ?? 'school';
  const openTab = (value: string) => setParams(value === tabs[0]?.id ? {} : { tab: value }, { replace: true });

  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState<SystemSettings | null>(null);
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // School details are only for the people who can change them.
    if (!canSettings) { setLoading(false); return; }
    settingsApi.getSystemSettings().then((settings) => {
      setSaved(settings);
      setDraft(settings);
      publishSchoolIdentity({ schoolName: settings.schoolName, logoUrl: settings.logoUrl || '/logo.png' });
    }).catch(() => setError('Could not load the settings. Refresh the page to try again.')).finally(() => setLoading(false));
  }, [canSettings]);

  const changed = useMemo(
    () => !!saved && !!draft && SAVED_FIELDS.some((k) => (saved[k] ?? '') !== (draft[k] ?? '')),
    [saved, draft],
  );

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!changed) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed]);

  const updateDraft = (patch: Partial<SystemSettings>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const save = async () => {
    if (!draft) return;
    if (!draft.schoolName.trim()) { setError('The school needs a name.'); openTab('school'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await settingsApi.updateSystemSettings(Object.fromEntries(SAVED_FIELDS.map((k) => [k, draft[k]])) as Partial<SystemSettings>);
      setSaved(updated);
      setDraft(updated);
      publishSchoolIdentity({ schoolName: updated.schoolName, logoUrl: updated.logoUrl || '/logo.png' });
      showToast('Settings saved.');
    } catch (reason) {
      setError((reason as { response?: { data?: { message?: string } } })?.response?.data?.message || 'The settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  // Academic Structure has its own page again; old links still land there.
  if (raw === 'structure') return <Navigate to="/academic-structure" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle={canSettings ? "School details, calendar, branding, fee rules and logs." : 'The school calendar and moving students into the next year.'}
      />

      <Tabs value={tab} onValueChange={openTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {tabs.map(({ id, label, icon: TabIcon }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <TabIcon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <WarningCircle size={17} className="shrink-0" /> {error}
        </div>
      )}

      {/* These tabs don't need the school details. */}
      {tab === 'promotion' && <PromotionTab />}
      {tab === 'calendar' && <AcademicCalendar />}
      {tab === 'audit' && <AuditLogsPage embedded />}

      {['school', 'branding', 'discounts'].includes(tab) && (loading ? (
        <DashboardLoading />
      ) : draft && saved ? (
        <>
          {tab === 'school' && <SchoolProfile value={draft} onChange={updateDraft} />}
          {tab === 'branding' && (
            <BrandingSettings
              value={draft}
              onLogoChange={(logoUrl) => { updateDraft({ logoUrl }); setSaved((s) => (s ? { ...s, logoUrl } : s)); }}
              theme={theme}
              onThemeChange={setTheme}
            />
          )}
          {tab === 'discounts' && <DiscountPolicy value={draft.discountRule} onChange={(discountRule) => updateDraft({ discountRule })} />}
        </>
      ) : null)}

      {/* Shown only while there is something to save. */}
      {changed && (
        <div className="sticky bottom-4 z-30 mr-14 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-warning" /> You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setDraft(saved); setError(''); }} disabled={saving}>Discard</Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <SpinnerGap size={15} className="animate-spin" /> : <FloppyDisk size={15} />}
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
