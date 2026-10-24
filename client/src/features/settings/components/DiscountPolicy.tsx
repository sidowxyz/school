import { CheckCircle, Info, Percent, Stack, type Icon } from '@phosphor-icons/react';
import type { SystemSettings } from '../api/settingsApi';
import { SettingsSection } from './SettingsSection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  value: SystemSettings['discountRule'];
  onChange: (value: SystemSettings['discountRule']) => void;
}

// A worked example makes the difference concrete.
const EXAMPLE = { fee: 40, sibling: 10, scholarship: 25 };
const result = (rule: SystemSettings['discountRule']) => {
  const pct = rule === 'combined' ? EXAMPLE.sibling + EXAMPLE.scholarship : Math.max(EXAMPLE.sibling, EXAMPLE.scholarship);
  return { pct, pays: EXAMPLE.fee * (1 - pct / 100) };
};

export default function DiscountPolicy({ value, onChange }: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <SettingsSection icon={Percent} tint="pink" title="When a student gets more than one discount" description="Used every time a month is charged">
        <div role="radiogroup" aria-label="Discount combination rule" className="grid gap-4 md:grid-cols-2">
          <PolicyOption
            selected={value === 'highest_only'}
            icon={CheckCircle}
            fill="bg-tile-green"
            title="Best discount only"
            description="Only the single biggest discount applies. Recommended: it avoids giving away more than intended."
            onClick={() => onChange('highest_only')}
          />
          <PolicyOption
            selected={value === 'combined'}
            icon={Stack}
            fill="bg-tile-violet"
            title="Add them together"
            description="All discounts add up (never above 100%). Choose this only if your school's policy allows it."
            onClick={() => onChange('combined')}
          />
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>The discounts themselves are set elsewhere: sibling rules on a parent's page, and a student's own discount in Fees &amp; Payments. A change here applies to months charged from now on.</p>
        </div>
      </SettingsSection>

      <SettingsSection icon={Info} tint="blue" title="Example" description={`A $${EXAMPLE.fee} monthly fee`}>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between"><span className="text-muted-foreground">Sibling discount</span><span className="font-medium">{EXAMPLE.sibling}%</span></li>
          <li className="flex justify-between"><span className="text-muted-foreground">Scholarship</span><span className="font-medium">{EXAMPLE.scholarship}%</span></li>
        </ul>
        <div className="mt-4 space-y-2">
          {(['highest_only', 'combined'] as const).map((rule) => {
            const r = result(rule);
            return (
              <div key={rule} className={cn('flex items-center justify-between rounded-xl px-3 py-2.5 text-sm', rule === value ? 'bg-tile-green text-tile-foreground' : 'bg-muted/50 text-muted-foreground')}>
                <span>{rule === 'combined' ? 'Added together' : 'Best only'} · {r.pct}% off</span>
                <span className="font-semibold tabular-nums">pays ${r.pays.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}

function PolicyOption({ selected, icon: OptionIcon, fill, title, description, onClick }: {
  selected: boolean; icon: Icon; fill: string; title: string; description: string; onClick: () => void;
}) {
  return (
    <Button
      variant="plain"
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex h-auto items-start gap-3 whitespace-normal rounded-2xl border-2 p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-tile-foreground', fill)}>
        <OptionIcon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
      <span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-primary' : 'border-border')}>
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
    </Button>
  );
}
