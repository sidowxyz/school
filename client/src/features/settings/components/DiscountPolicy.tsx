import { Percent, CheckCircle, Stack } from '@phosphor-icons/react';
import type { SystemSettings } from '../api/settingsApi';
import { Button } from '@/components/ui/button';

interface Props {
  value: SystemSettings['discountRule'];
  onChange: (value: SystemSettings['discountRule']) => void;
}

export default function DiscountPolicy({ value, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-bold text-gray-900">Discount Policy</h2><p className="mt-1 text-sm text-gray-500">Choose how multiple valid discounts are applied to the same student invoice.</p></div>
      <section className="rounded-2xl border border-gray-200 p-6">
        <div className="mb-6 flex items-center gap-2"><Percent className="text-green-600" size={20} /><h3 className="text-lg font-semibold text-gray-900">Discount combination rule</h3></div>
        <div className="grid gap-4 md:grid-cols-2">
          <PolicyOption selected={value === 'highest_only'} icon={CheckCircle} title="Highest discount only" description="Apply only the single best eligible discount. This avoids accidental over-discounting." onClick={() => onChange('highest_only')} />
          <PolicyOption selected={value === 'combined'} icon={Stack} title="Combine eligible discounts" description="Add all eligible discounts together. Use this only when the Buildings policy permits stacking." onClick={() => onChange('combined')} />
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">The actual scholarship and sibling-discount percentages remain managed by their live Finance rules. This setting controls only how overlapping rules are resolved.</div>
      </section>
    </div>
  );
}

function PolicyOption({ selected, icon: Icon, title, description, onClick }: { selected: boolean; icon: React.ElementType; title: string; description: string; onClick: () => void }) {
  return <Button variant="plain" type="button" onClick={onClick} className={`rounded-2xl border-2 p-5 text-left transition ${selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}><div className="flex items-start gap-3"><div className={`rounded-xl p-2.5 ${selected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}><Icon size={20} /></div><div><p className="font-semibold text-gray-900">{title}</p><p className="mt-1 text-sm leading-5 text-gray-500">{description}</p></div></div></Button>;
}
