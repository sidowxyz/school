import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Percent, CalendarBlank, ClockCounterClockwise, SpinnerGap, Palette, ArrowCounterClockwise, FloppyDisk, Buildings } from '@phosphor-icons/react';
import SuccessModal from '../../../components/common/SuccessModal';
import PageHeader from '../../../components/common/PageHeader';
import { useTheme, type Theme } from '../../../context/ThemeContext';
import SchoolProfile from '../components/SchoolProfile';
import AcademicCalendar from '../components/AcademicCalendar';
import BrandingSettings from '../components/BrandingSettings';
import DiscountPolicy from '../components/DiscountPolicy';
import RecentActivity from '../components/RecentActivity';
import { settingsApi, type SystemSettings } from '../api/settingsApi';
import { publishSchoolIdentity } from '../hooks/useSchoolIdentity';
import { Button } from '@/components/ui/button';

const tabs = [
  { id: 'School Profile', label: 'School Profile', icon: Buildings },
  { id: 'Academic', label: 'Academic', icon: CalendarBlank },
  { id: 'Branding', label: 'Branding', icon: Palette },
  { id: 'Discount Policy', label: 'Discount Policy', icon: Percent },
  { id: 'Audit', label: 'Audit Logs', icon: ClockCounterClockwise },
] as const;

type TabId = typeof tabs[number]['id'];

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<TabId>(tabs.some((tab) => tab.id === requestedTab) ? requestedTab as TabId : 'School Profile');
  const [saved, setSaved] = useState<SystemSettings | null>(null);
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { theme, setTheme } = useTheme();
  const [savedTheme, setSavedTheme] = useState<Theme>(theme);

  useEffect(() => {
    settingsApi.getSystemSettings().then((settings) => {
      setSaved(settings);
      setDraft(settings);
      publishSchoolIdentity({ schoolName: settings.schoolName, logoUrl: settings.logoUrl || '/logo.png' });
    }).catch(() => setError('Could not load system settings. Please try again.')).finally(() => setLoading(false));
  }, []);

  const editableTab = activeTab === 'School Profile' || activeTab === 'Branding' || activeTab === 'Discount Policy';
  const updateDraft = (patch: Partial<SystemSettings>) => setDraft((current) => current ? { ...current, ...patch } : current);

  const reset = () => {
    if (saved) setDraft(saved);
    if (activeTab === 'Branding') setTheme(savedTheme);
    setError('');
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const updated = await settingsApi.updateSystemSettings({
        schoolName: draft.schoolName,
        schoolCode: draft.schoolCode,
        schoolEmail: draft.schoolEmail,
        schoolPhone: draft.schoolPhone,
        address: draft.address,
        website: draft.website,
        principalName: draft.principalName,
        timezone: draft.timezone,
        language: draft.language,
        logoUrl: draft.logoUrl,
        brandingColors: draft.brandingColors,
        discountRule: draft.discountRule,
      });
      setSaved(updated);
      setDraft(updated);
      publishSchoolIdentity({ schoolName: updated.schoolName, logoUrl: updated.logoUrl || '/logo.png' });
      setSavedTheme(theme);
      setShowSuccess(true);
    } catch (reason) {
      setError((reason as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Manage school identity, academic policies, branding, discount rules, and audit logs."
        action={
          editableTab ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={reset}
                disabled={!draft || saving}
                className="h-10 gap-1.5 rounded-xl text-sm"
              >
                <ArrowCounterClockwise className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => void save()}
                disabled={!draft || saving}
                className="h-10 gap-1.5 rounded-xl text-sm font-semibold shadow-sm"
              >
                {saving ? <SpinnerGap className="h-3.5 w-3.5 animate-spin" /> : <FloppyDisk className="h-3.5 w-3.5" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Section navigation */}
        <nav aria-label="Settings sections" className="rounded-2xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  variant="ghost"
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`h-10 shrink-0 justify-start gap-2.5 rounded-xl px-3 text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" weight={isActive ? 'fill' : 'regular'} />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-sm text-muted-foreground">
              <SpinnerGap className="h-5 w-5 animate-spin text-primary" />
              Loading settings…
            </div>
          ) : draft ? (
            <>
              {activeTab === 'School Profile' && <SchoolProfile value={draft} onChange={updateDraft} />}
              {activeTab === 'Academic' && <AcademicCalendar />}
              {activeTab === 'Branding' && (
                <BrandingSettings
                  value={draft}
                  onChange={(patch) => {
                    updateDraft(patch);
                    if (patch.logoUrl) setSaved((current) => (current ? { ...current, ...patch } : current));
                  }}
                  theme={theme}
                  onThemeChange={setTheme}
                />
              )}
              {activeTab === 'Discount Policy' && (
                <DiscountPolicy value={draft.discountRule} onChange={(discountRule) => updateDraft({ discountRule })} />
              )}
              {activeTab === 'Audit' && <RecentActivity />}
            </>
          ) : null}
        </div>
      </div>

      <SuccessModal
        open={showSuccess}
        title="Settings Saved"
        description="School settings have been updated successfully."
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
