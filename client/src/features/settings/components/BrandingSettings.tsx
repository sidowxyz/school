import { useRef, useState } from 'react';
import { ImageSquare, SpinnerGap, Palette } from '@phosphor-icons/react';
import { settingsApi, type SystemSettings } from '../api/settingsApi';
import type { Theme } from '../../../context/ThemeContext';
import { publishSchoolIdentity, resolveSchoolLogo } from '../hooks/useSchoolIdentity';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

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

  const UploadSimple = async (file?: File) => {
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
      setMessage((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Logo UploadSimple failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-bold text-gray-900">Branding & Appearance</h2><p className="mt-1 text-sm text-gray-500">Manage the Buildings logo, brand colors, and portal theme.</p></div>
      <section className="rounded-2xl border border-gray-200 p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-900">School Logo</h3>
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50"><img src={imageSource(value.logoUrl)} alt="School Logo" className="h-20 w-20 object-contain" /></div>
          <div className="space-y-3">
            <Input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            <Button variant="plain" type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-white hover:bg-green-700 disabled:opacity-60">{uploading ? <SpinnerGap size={18} className="animate-spin" /> : <ImageSquare size={18} />}{uploading ? 'Uploading…' : 'Upload Logo'}</Button>
            <p className="text-sm text-gray-500">PNG, JPG or WEBP · Maximum 2 MB</p>
            {message && <p className={`text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 p-6">
        <div className="mb-6 flex items-center gap-2"><Palette className="text-green-600" size={20} /><h3 className="text-lg font-semibold text-gray-900">Brand Colors</h3></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ColorField label="Primary Color" value={value.brandingColors.primary} onChange={(primary) => onChange({ brandingColors: { ...value.brandingColors, primary } })} />
          <ColorField label="Secondary Color" value={value.brandingColors.secondary} onChange={(secondary) => onChange({ brandingColors: { ...value.brandingColors, secondary } })} />
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Theme</h3>
        <p className="mb-4 text-sm text-gray-500">The selected theme applies immediately and is remembered on this device.</p>
        <NativeSelect aria-label="Portal theme" value={theme} onChange={(event) => onThemeChange(event.target.value as Theme)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"><option value="light">Light Theme</option><option value="dark">Dark Theme</option><option value="system">System Default</option></NativeSelect>
      </section>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-sm font-medium text-gray-700">{label}</span><div className="flex items-center gap-3"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-16 rounded-xl border border-gray-300" /><Input aria-label={`${label} hex value`} value={value.toUpperCase()} onChange={(event) => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && onChange(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono text-sm text-gray-800" /></div></label>;
}
