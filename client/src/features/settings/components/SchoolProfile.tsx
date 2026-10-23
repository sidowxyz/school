import { Buildings, Globe, IdentificationCard } from '@phosphor-icons/react';
import type { SystemSettings } from '../api/settingsApi';
import { resolveSchoolLogo } from '../hooks/useSchoolIdentity';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { SettingsField, SettingsHeading, SettingsSection, settingsInput } from './SettingsSection';

interface Props {
  value: SystemSettings;
  onChange: (patch: Partial<SystemSettings>) => void;
}

export default function SchoolProfile({ value, onChange }: Props) {
  return (
    <div className="space-y-5">
      <SettingsHeading title="School Profile" description="Live school identity and contact information used across the system." />

      <div className="flex items-center gap-4 rounded-2xl bg-tile-green p-5 text-tile-foreground">
        <img
          src={resolveSchoolLogo(value.logoUrl || '/logo.png')}
          alt=""
          className="h-16 w-16 rounded-2xl bg-white/70 object-contain p-1.5"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{value.schoolName || 'Your school'}</p>
          <p className="truncate text-sm opacity-75">
            {[value.schoolCode, value.address].filter(Boolean).join(' · ') || 'Add your school details below'}
          </p>
        </div>
      </div>

      <SettingsSection icon={IdentificationCard} title="Identity" description="How the school is named across reports and documents.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsField label="School Name" className="md:col-span-2">
            <Input className={settingsInput} value={value.schoolName} onChange={(e) => onChange({ schoolName: e.target.value })} required />
          </SettingsField>
          <SettingsField label="School Code">
            <Input className={settingsInput} value={value.schoolCode || ''} onChange={(e) => onChange({ schoolCode: e.target.value })} placeholder="SBS-001" />
          </SettingsField>
          <SettingsField label="Principal Name">
            <Input className={settingsInput} value={value.principalName || ''} onChange={(e) => onChange({ principalName: e.target.value })} />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection icon={Buildings} title="Contact" description="Shown on receipts, report cards and the login page.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsField label="Email Address">
            <Input type="email" className={settingsInput} value={value.schoolEmail} onChange={(e) => onChange({ schoolEmail: e.target.value })} required />
          </SettingsField>
          <SettingsField label="Phone Number">
            <Input className={settingsInput} value={value.schoolPhone || ''} onChange={(e) => onChange({ schoolPhone: e.target.value })} />
          </SettingsField>
          <SettingsField label="Website" className="md:col-span-2">
            <Input className={settingsInput} value={value.website || ''} onChange={(e) => onChange({ website: e.target.value })} placeholder="https://school.example" />
          </SettingsField>
          <SettingsField label="School Address" className="md:col-span-2">
            <Textarea rows={3} className="w-full resize-none rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm" value={value.address || ''} onChange={(e) => onChange({ address: e.target.value })} />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection icon={Globe} title="Regional" description="Date, time and language defaults.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsField label="Timezone">
            <NativeSelect className={settingsInput} value={value.timezone || 'Africa/Mogadishu'} onChange={(e) => onChange({ timezone: e.target.value })}>
              <option value="Africa/Mogadishu">Africa/Mogadishu</option>
              <option value="UTC">UTC</option>
            </NativeSelect>
          </SettingsField>
          <SettingsField label="Language">
            <NativeSelect className={settingsInput} value={value.language || 'English'} onChange={(e) => onChange({ language: e.target.value as 'English' | 'Somali' })}>
              <option value="English">English</option>
              <option value="Somali">Somali</option>
            </NativeSelect>
          </SettingsField>
        </div>
      </SettingsSection>
    </div>
  );
}
