import { Buildings, Envelope, Globe, IdentificationCard, MapPin, Phone, Receipt, SignIn, WarningCircle } from '@phosphor-icons/react';
import type { SystemSettings } from '../api/settingsApi';
import { onLogoError, resolveSchoolLogo } from '../hooks/useSchoolIdentity';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsField, SettingsSection } from './SettingsSection';

interface Props {
  value: SystemSettings;
  onChange: (patch: Partial<SystemSettings>) => void;
}

// The sample values a new install starts with; they should be replaced.
const looksLikeSample = (v: SystemSettings) =>
  v.schoolEmail === 'info@school.edu' || (v.schoolPhone ?? '').includes('XXX') || (v.website ?? '').includes('example');

const logo = (v: SystemSettings) => resolveSchoolLogo(v.logoUrl || '/logo.png');

export default function SchoolProfile({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Who the school is, at a glance. */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-tile-green p-5 text-tile-foreground sm:p-6">
        <img src={logo(value)} onError={onLogoError} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white/80 object-contain p-1.5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold">{value.schoolName || 'Your school'}</p>
          <p className="truncate text-sm opacity-75">
            {[value.schoolCode, value.address].filter(Boolean).join(' · ') || 'Add your school details below'}
          </p>
        </div>
        {value.principalName && (
          <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold dark:bg-white/10">Principal: {value.principalName}</span>
        )}
      </div>

      {looksLikeSample(value) && (
        <div className="flex items-start gap-2.5 rounded-xl bg-tile-yellow px-4 py-3 text-sm text-tile-foreground">
          <WarningCircle size={18} className="mt-0.5 shrink-0" />
          <p>Some contact details are still the sample values. Replace them with your school's real email, phone and website — they appear on receipts and the sign-in page.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SettingsSection icon={IdentificationCard} tint="blue" title="Identity" description="How the school is named on reports, receipts and the sign-in page">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SettingsField label="School name" className="md:col-span-2">
                <Input value={value.schoolName} onChange={(e) => onChange({ schoolName: e.target.value })} required placeholder="e.g. Horn of Africa Academy" />
              </SettingsField>
              <SettingsField label="School code" hint="Short code printed on documents">
                <Input value={value.schoolCode || ''} onChange={(e) => onChange({ schoolCode: e.target.value })} placeholder="e.g. HAA" />
              </SettingsField>
              <SettingsField label="Principal">
                <Input value={value.principalName || ''} onChange={(e) => onChange({ principalName: e.target.value })} placeholder="Full name" />
              </SettingsField>
            </div>
          </SettingsSection>

          <SettingsSection icon={Buildings} tint="violet" title="Contact" description="Where parents and staff can reach the school">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SettingsField label="Email">
                <Input type="email" value={value.schoolEmail} onChange={(e) => onChange({ schoolEmail: e.target.value })} required placeholder="office@yourschool.com" />
              </SettingsField>
              <SettingsField label="Phone">
                <Input value={value.schoolPhone || ''} onChange={(e) => onChange({ schoolPhone: e.target.value })} placeholder="+252 61 000 0000" />
              </SettingsField>
              <SettingsField label="Website" className="md:col-span-2">
                <Input value={value.website || ''} onChange={(e) => onChange({ website: e.target.value })} placeholder="https://yourschool.com" />
              </SettingsField>
              <SettingsField label="Address" className="md:col-span-2">
                <Textarea rows={3} className="resize-none" value={value.address || ''} onChange={(e) => onChange({ address: e.target.value })} placeholder="District, city" />
              </SettingsField>
            </div>
          </SettingsSection>
        </div>

        {/* Live preview of where these details show up. */}
        <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <SettingsSection icon={SignIn} tint="green" title="Sign-in page" description="Updates as you type">
            <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
              <img src={logo(value)} onError={onLogoError} alt="" className="mx-auto h-14 w-14 rounded-full bg-card object-cover shadow-sm ring-4 ring-card" />
              <p className="mt-3 text-sm font-semibold">{value.schoolName || 'Your school'}</p>
              <p className="text-xs text-muted-foreground">Sign in to continue</p>
              <div className="mx-auto mt-3 h-8 max-w-[180px] rounded-md bg-primary/90" />
            </div>
          </SettingsSection>

          <SettingsSection icon={Receipt} tint="yellow" title="Receipt header" description="Printed on every fee receipt">
            <div className="rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center gap-3">
                <img src={logo(value)} onError={onLogoError} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{value.schoolName || 'Your school'}</p>
                  {value.schoolCode && <p className="text-[11px] text-muted-foreground">{value.schoolCode}</p>}
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {value.address && <li className="flex items-center gap-2"><MapPin size={13} /> <span className="truncate">{value.address}</span></li>}
                {value.schoolPhone && <li className="flex items-center gap-2"><Phone size={13} /> {value.schoolPhone}</li>}
                {value.schoolEmail && <li className="flex items-center gap-2"><Envelope size={13} /> <span className="truncate">{value.schoolEmail}</span></li>}
                {value.website && <li className="flex items-center gap-2"><Globe size={13} /> <span className="truncate">{value.website}</span></li>}
              </ul>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
