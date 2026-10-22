import type { SystemSettings } from '../api/settingsApi';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';

interface Props {
  value: SystemSettings;
  onChange: (patch: Partial<SystemSettings>) => void;
}

const inputClass = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100';

export default function SchoolProfile({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">School Profile</h2>
        <p className="mt-1 text-sm text-gray-500">Live school identity and contact information used across the system.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="School Name"><Input className={inputClass} value={value.schoolName} onChange={(event) => onChange({ schoolName: event.target.value })} required /></Field>
        <Field label="School Code"><Input className={inputClass} value={value.schoolCode || ''} onChange={(event) => onChange({ schoolCode: event.target.value })} placeholder="SBS-001" /></Field>
        <Field label="Email Address"><Input type="email" className={inputClass} value={value.schoolEmail} onChange={(event) => onChange({ schoolEmail: event.target.value })} required /></Field>
        <Field label="Phone Number"><Input className={inputClass} value={value.schoolPhone || ''} onChange={(event) => onChange({ schoolPhone: event.target.value })} /></Field>
        <Field label="Website"><Input className={inputClass} value={value.website || ''} onChange={(event) => onChange({ website: event.target.value })} placeholder="https://school.example" /></Field>
        <Field label="Principal Name"><Input className={inputClass} value={value.principalName || ''} onChange={(event) => onChange({ principalName: event.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="School Address"><Textarea rows={3} className={inputClass} value={value.address || ''} onChange={(event) => onChange({ address: event.target.value })} /></Field></div>
        <Field label="Timezone"><NativeSelect className={inputClass} value={value.timezone || 'Africa/Mogadishu'} onChange={(event) => onChange({ timezone: event.target.value })}><option value="Africa/Mogadishu">Africa/Mogadishu</option><option value="UTC">UTC</option></NativeSelect></Field>
        <Field label="Language"><NativeSelect className={inputClass} value={value.language || 'English'} onChange={(event) => onChange({ language: event.target.value as 'English' | 'Somali' })}><option value="English">English</option><option value="Somali">Somali</option></NativeSelect></Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>{children}</label>;
}
