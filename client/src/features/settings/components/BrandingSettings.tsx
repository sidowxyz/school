import { useRef, useState } from 'react';
import { ImageSquare, Moon, Palette, SpinnerGap, Sun } from '@phosphor-icons/react';
import { settingsApi, type SystemSettings } from '../api/settingsApi';
import type { Theme } from '../../../context/ThemeContext';
import { publishSchoolIdentity, resolveSchoolLogo } from '../hooks/useSchoolIdentity';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { SettingsField, SettingsHeading, SettingsSection, settingsInput } from './SettingsSection';

interface Props {
  value: SystemSettings;
  onChange: (patch: Partial<SystemSettings>) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const imageSource = (url?: string) => resolveSchoolLogo(url || '/logo.png');

export default function BrandingSettings({ value, onChange, theme, onThemeChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const upload = async (file?: File) => {
    if (!file) return;
    setMessage('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setMessage('Choose a PNG, JPG, or WEBP image.');
    if (file.size > 2 * 1024 * 1024) return setMessage('Logo must be 2 MB or smaller.');
    setUploading(true);
    try {
      const result = await settingsApi.uploadLogo(file);
      onChange({ logoUrl: result.logoUrl });
      publishSchoolIdentity({ logoUrl: result.logoUrl });
      setMessage('Logo uploaded and saved successfully.');
    } catch (error) {
      setMessage((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Logo upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <SettingsHeading title="Branding & Appearance" description="Manage the school logo, brand colors, and portal theme." />

      <SettingsSection icon={ImageSquare} title="School Logo" description="Shown in the sidebar, login page and printed documents.">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40">
            <img src={imageSource(value.logoUrl)} alt="School Logo" className="h-20 w-20 object-contain" />
          </div>
          <div className="space-y-2.5">
            <Input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="h-11 gap-2 rounded-xl px-5">
              {uploading ? <SpinnerGap size={18} className="animate-spin" /> : <ImageSquare size={18} />}
              {uploading ? 'Uploading…' : 'Upload Logo'}
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG or WEBP · Maximum 2 MB</p>
            {message && <p className={`text-sm ${message.includes('successfully') ? 'text-primary' : 'text-destructive'}`}>{message}</p>}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={Palette} title="Brand Colors" description="Pick the colors that represent your school.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ColorField label="Primary Color" value={value.brandingColors.primary} onChange={(primary) => onChange({ brandingColors: { ...value.brandingColors, primary } })} />
          <ColorField label="Secondary Color" value={value.brandingColors.secondary} onChange={(secondary) => onChange({ brandingColors: { ...value.brandingColors, secondary } })} />
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <span className="text-xs font-semibold text-foreground/80">Preview</span>
          <span className="h-8 flex-1 rounded-lg" style={{ background: value.brandingColors.primary }} />
          <span className="h-8 flex-1 rounded-lg" style={{ background: value.brandingColors.secondary }} />
        </div>
      </SettingsSection>

      <SettingsSection
        icon={theme === 'dark' ? Moon : Sun}
        title="Theme"
        description="The selected theme applies immediately and is remembered on this device."
      >
        <NativeSelect aria-label="Portal theme" value={theme} onChange={(event) => onThemeChange(event.target.value as Theme)} className={settingsInput}>
          <option value="light">Light Theme</option>
          <option value="dark">Dark Theme</option>
          <option value="system">System Default</option>
        </NativeSelect>
      </SettingsSection>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <SettingsField label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-transparent p-1"
        />
        <Input
          aria-label={`${label} hex value`}
          value={value.toUpperCase()}
          onChange={(event) => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && onChange(event.target.value)}
          className={`${settingsInput} font-mono`}
        />
      </div>
    </SettingsField>
  );
}
