import { useRef, useState } from 'react';
import { CheckCircle, ImageSquare, Laptop, Moon, SpinnerGap, Sun, UploadSimple, WarningCircle, type Icon } from '@phosphor-icons/react';
import { settingsApi, type SystemSettings } from '../api/settingsApi';
import type { Theme } from '../../../context/ThemeContext';
import { onLogoError, publishSchoolIdentity, resolveSchoolLogo } from '../hooks/useSchoolIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SettingsSection } from './SettingsSection';

interface Props {
  value: SystemSettings;
  /** Called after a new logo has been uploaded (it is saved straight away). */
  onLogoChange: (logoUrl: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const THEMES: { id: Theme; label: string; hint: string; icon: Icon; fill: string }[] = [
  { id: 'light', label: 'Light', hint: 'Bright, for daytime', icon: Sun, fill: 'bg-tile-yellow' },
  { id: 'dark', label: 'Dark', hint: 'Easy on the eyes', icon: Moon, fill: 'bg-tile-violet' },
  { id: 'system', label: 'Same as device', hint: 'Follows this computer', icon: Laptop, fill: 'bg-tile-blue' },
];

const MAX_MB = 2;

export default function BrandingSettings({ value, onLogoChange, theme, onThemeChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    setMessage(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setMessage({ ok: false, text: 'Choose a PNG, JPG or WEBP image.' });
    if (file.size > MAX_MB * 1024 * 1024) return setMessage({ ok: false, text: `The logo must be ${MAX_MB} MB or smaller.` });
    setUploading(true);
    try {
      const result = await settingsApi.uploadLogo(file);
      onLogoChange(result.logoUrl);
      publishSchoolIdentity({ logoUrl: result.logoUrl });
      setMessage({ ok: true, text: 'New logo saved. It now shows across the app.' });
    } catch (error) {
      setMessage({ ok: false, text: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'The logo could not be uploaded.' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SettingsSection icon={ImageSquare} tint="green" title="School logo" description="Shown in the sidebar, the sign-in page and on receipts">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files?.[0]); }}
          className={cn('flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:flex-row sm:text-left',
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30')}
        >
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
            <img
              src={resolveSchoolLogo(value.logoUrl || '/logo.png')}
              onError={onLogoError}
              alt="Current school logo"
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Drop a new logo here, or</p>
            <Input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <SpinnerGap size={16} className="animate-spin" /> : <UploadSimple size={16} />}
              {uploading ? 'Uploading…' : 'Choose an image'}
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG or WEBP, up to {MAX_MB} MB. A square image looks best.</p>
          </div>
        </div>
        {message && (
          <p className={cn('mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm', message.ok ? 'bg-tile-green text-tile-foreground' : 'bg-destructive/10 text-destructive')}>
            {message.ok ? <CheckCircle size={16} /> : <WarningCircle size={16} />} {message.text}
          </p>
        )}
      </SettingsSection>

      <SettingsSection icon={Sun} tint="yellow" title="Theme" description="Applies straight away, on this device only">
        <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
          {THEMES.map(({ id, label, hint, icon: ThemeIcon, fill }) => (
            <Button key={id} variant="plain" type="button" role="radio" aria-checked={theme === id} onClick={() => onThemeChange(id)}
              className={cn('flex h-auto flex-col items-start gap-2 whitespace-normal rounded-2xl p-4 text-left text-tile-foreground transition', fill,
                theme === id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'opacity-80 hover:opacity-100')}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 dark:bg-white/10"><ThemeIcon size={18} /></span>
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs opacity-75">{hint}</span>
            </Button>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
