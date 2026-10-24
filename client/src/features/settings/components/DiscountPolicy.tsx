import { Percent, CheckCircle, Stack, Info } from '@phosphor-icons/react';
import type { SystemSettings } from '../api/settingsApi';
import { SettingsHeading, SettingsSection } from './SettingsSection';
import { Button } from '@/components/ui/button';

interface Props {
  value: SystemSettings['discountRule'];
  onChange: (value: SystemSettings['discountRule']) => void;
}

export default function DiscountPolicy({ value, onChange }: Props) {
  return (
    <div className="space-y-5">
      <SettingsHeading title="Discount Policy" description="Choose how multiple valid discounts are applied to the same student invoice." />
      <SettingsSection icon={Percent} title="Discount combination rule" description="Applies when a student qualifies for more than one discount.">
        <div role="radiogroup" aria-label="Discount combination rule" className="grid gap-4 md:grid-cols-2">
          <PolicyOption selected={value === 'highest_only'} icon={CheckCircle} title="Highest discount only" description="Apply only the single best eligible discount. This avoids accidental over-discounting." onClick={() => onChange('highest_only')} />
          <PolicyOption selected={value === 'combined'} icon={Stack} title="Combine eligible discounts" description="Add all eligible discounts together. Use this only when the school policy permits stacking." onClick={() => onChange('combined')} />
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-tile-yellow px-4 py-3 text-sm text-tile-foreground">
          <Info size={18} weight="bold" className="mt-0.5 shrink-0" />
          <p>The actual scholarship and sibling-discount percentages remain managed by their live Finance rules. This setting controls only how overlapping rules are resolved.</p>
        </div>
      </SettingsSection>
    </div>
  );
}

function PolicyOption({ selected, icon: Icon, title, description, onClick }: { selected: boolean; icon: React.ElementType; title: string; description: string; onClick: () => void }) {
  return (
    <Button
      variant="plain"
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex h-auto items-start gap-3 whitespace-normal rounded-2xl border-2 p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
      <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-border'}`}>
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
    </Button>
  );
}
