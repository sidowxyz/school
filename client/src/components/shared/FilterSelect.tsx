import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

// Radix Select rejects empty item values, but callers use '' for "nothing selected yet".
const EMPTY = '__empty__';

/** Themed dropdown with a small label on top; a drop-in for native selects. */
export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  required,
  className = '',
}: Props) {
  const hasEmptyOption = options.some((o) => o.value === '');
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <Select
        value={value === '' && hasEmptyOption ? EMPTY : value}
        onValueChange={(v) => onChange(v === EMPTY ? '' : v)}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          aria-label={label}
          className="h-10 w-full rounded-lg border-border bg-background text-xs shadow-2xs sm:text-sm"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || EMPTY} value={o.value === '' ? EMPTY : o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
