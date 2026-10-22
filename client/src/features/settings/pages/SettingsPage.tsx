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
import { Card, CardContent } from '@/components/ui/card';

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

  const FloppyDisk = async () => {
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
        subtitle="Manage Buildings identity, academic policies, branding, discount rules, and audit logs."
        action={
          editableTab ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={reset}
                disabled={!draft || saving}
                className="gap-1.5 text-xs"
              >
                <ArrowCounterClockwise className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => void save()}
                disabled={!draft || saving}
                className="gap-1.5 text-xs font-medium shadow-sm"
              >
                {saving ? <SpinnerGap className="h-3.5 w-3.5 animate-spin" /> : <FloppyDisk className="h-3.5 w-3.5" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Tabs navigation */}
      <div className="bg-muted/60 border border-border rounded-xl p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all rounded-lg ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="min-h-[500px]">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

      <SuccessModal
        open={showSuccess}
        title="Settings Saved"
        description="School settings have been updated successfully."
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
