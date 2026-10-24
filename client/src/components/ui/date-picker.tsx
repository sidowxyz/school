import * as React from 'react';
import { CalendarBlank, CaretLeft, CaretRight, Clock, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// The app's own date, month and time pickers, replacing the browser's built-in
// ones (which look different in every browser). Values use the same strings
// the browser inputs did — "2026-10-24", "2026-10", "07:30" — so they drop in
// where <input type="date|month|time"> was.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// The school week starts on Saturday.
const WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseIso = (v?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
};
const todayIso = () => { const t = new Date(); return toIso(t.getFullYear(), t.getMonth(), t.getDate()); };
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const shiftIso = (iso: string, days: number) => {
  const p = parseIso(iso)!;
  const d = new Date(p.y, p.m, p.d + days);
  return toIso(d.getFullYear(), d.getMonth(), d.getDate());
};

/** "Sat 24 Oct 2026" */
const formatDate = (iso: string) => {
  const p = parseIso(iso);
  if (!p) return '';
  return new Date(p.y, p.m, p.d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const formatMonth = (v: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
};

const inRange = (v: string, min?: string, max?: string) => (!min || v >= min) && (!max || v <= max);

/** The field-like button that opens a picker. */
const PickerTrigger = React.forwardRef<HTMLButtonElement, {
  icon: React.ElementType; text: string; placeholder: string; disabled?: boolean; invalid?: boolean;
  className?: string; id?: string; onClear?: () => void; 'aria-label'?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ icon: Icon, text, placeholder, disabled, invalid, className, onClear, ...props }, ref) => (
    <div className={cn('relative w-full', className)}>
      <Button
        ref={ref}
        type="button"
        variant="plain"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-left text-sm font-normal ring-offset-background transition-colors',
          'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20',
          invalid && 'border-destructive',
          onClear && text && 'pr-9',
        )}
        {...props}
      >
        <Icon size={16} className="shrink-0 text-muted-foreground" />
        <span className={cn('truncate', !text && 'text-muted-foreground')}>{text || placeholder}</span>
      </Button>
      {onClear && text && !disabled && (
        <Button
          type="button"
          variant="plain"
          onClick={onClear}
          aria-label="Clear"
          className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={13} />
        </Button>
      )}
    </div>
  ),
);
PickerTrigger.displayName = 'PickerTrigger';

/** Keeps native "required" form validation working without a visible input. */
function RequiredShadow({ value, required }: { value: string; required?: boolean }) {
  if (!required) return null;
  return (
    <input
      tabIndex={-1}
      aria-hidden
      required
      value={value}
      onChange={() => undefined}
      className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
    />
  );
}

const NavButton = ({ onClick, label, children, disabled }: { onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }) => (
  <Button type="button" variant="ghost" size="icon" onClick={onClick} disabled={disabled} aria-label={label} className="h-8 w-8 rounded-full">
    {children}
  </Button>
);

const cellBase = 'flex items-center justify-center rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30';

// ─── Date ────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Show an × to empty the field (for optional dates and filters). */
  clearable?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export function DatePicker({
  value, onChange, min, max, placeholder = 'Pick a date', disabled, required, clearable, invalid, id, className, ...rest
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseIso(value);
  const start = selected ?? parseIso(max && todayIso() > max ? max : min && todayIso() < min ? min : todayIso())!;
  const [view, setView] = React.useState<'days' | 'months' | 'years'>('days');
  const [year, setYear] = React.useState(start.y);
  const [month, setMonth] = React.useState(start.m);
  const [focused, setFocused] = React.useState(toIso(start.y, start.m, start.d));
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Each time it opens, show the selected (or today's) month.
  React.useEffect(() => {
    if (!open) return;
    const s = parseIso(value) ?? start;
    setYear(s.y); setMonth(s.m); setView('days'); setFocused(toIso(s.y, s.m, s.d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep keyboard focus on the focused day.
  React.useEffect(() => {
    if (open && view === 'days') gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, view, focused, month, year]);

  const pick = (iso: string) => {
    if (!inRange(iso, min, max)) return;
    onChange(iso);
    setOpen(false);
  };

  const goMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (moves[e.key] !== undefined) {
      e.preventDefault();
      const next = shiftIso(focused, moves[e.key]);
      const p = parseIso(next)!;
      setFocused(next); setYear(p.y); setMonth(p.m);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      goMonth(e.key === 'PageUp' ? -1 : 1);
    }
  };

  const lead = (new Date(year, month, 1).getDay() + 1) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - lead + 1;
    const d = new Date(year, month, day);
    return { iso: toIso(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === month };
  });
  const lastRowEmpty = cells.slice(35).every((c) => !c.inMonth);
  const today = todayIso();
  const minYear = min ? Number(min.slice(0, 4)) : 1950;
  const maxYear = max ? Number(max.slice(0, 4)) : new Date().getFullYear() + 10;
  const pageStart = year - (year % 12);
  const monthDisabled = (m: number) => {
    const last = toIso(year, m, daysIn(year, m));
    const first = toIso(year, m, 1);
    return (min && last < min) || (max && first > max);
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PickerTrigger id={id} icon={CalendarBlank} text={formatDate(value)} placeholder={placeholder} disabled={disabled}
            invalid={invalid} aria-label={rest['aria-label']} onClear={clearable ? () => onChange('') : undefined} />
        </PopoverTrigger>
        <PopoverContent className="w-[296px]">
          <div className="mb-2 flex items-center justify-between">
            <NavButton label="Previous" onClick={() => (view === 'days' ? goMonth(-1) : setYear((y) => y - (view === 'years' ? 12 : 1)))}>
              <CaretLeft size={15} />
            </NavButton>
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-3 text-sm font-semibold"
              onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days')}
              aria-label="Choose month and year"
            >
              {view === 'days' ? `${MONTHS[month]} ${year}` : view === 'months' ? year : `${pageStart} – ${pageStart + 11}`}
            </Button>
            <NavButton label="Next" onClick={() => (view === 'days' ? goMonth(1) : setYear((y) => y + (view === 'years' ? 12 : 1)))}>
              <CaretRight size={15} />
            </NavButton>
          </div>

          {view === 'days' && (
            <div ref={gridRef} role="grid" aria-label={`${MONTHS[month]} ${year}`} onKeyDown={onGridKey}>
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
                {WEEKDAYS.map((d) => <div key={d} className={cn('py-1', d === 'Fri' && 'text-muted-foreground/60')}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {(lastRowEmpty ? cells.slice(0, 35) : cells).map((c) => {
                  const isSelected = c.iso === value;
                  const isToday = c.iso === today;
                  const allowed = inRange(c.iso, min, max);
                  return (
                    <Button
                      key={c.iso}
                      type="button"
                      variant="plain"
                      data-date={c.iso}
                      tabIndex={c.iso === focused ? 0 : -1}
                      disabled={!allowed}
                      aria-pressed={isSelected}
                      aria-label={formatDate(c.iso)}
                      onClick={() => pick(c.iso)}
                      onFocus={() => setFocused(c.iso)}
                      className={cn(
                        cellBase, 'h-9 w-full p-0 font-medium',
                        !c.inMonth && 'text-muted-foreground/50',
                        isSelected ? 'bg-primary text-primary-foreground hover:bg-primary'
                          : isToday ? 'bg-tile-blue text-tile-foreground hover:bg-tile-blue'
                            : 'hover:bg-muted',
                      )}
                    >
                      {c.day}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, m) => (
                <Button key={name} type="button" variant="plain" disabled={!!monthDisabled(m)}
                  onClick={() => { setMonth(m); setView('days'); setFocused(toIso(year, m, 1)); }}
                  className={cn(cellBase, 'h-11 font-medium', selected && selected.y === year && selected.m === m ? 'bg-primary text-primary-foreground hover:bg-primary' : 'hover:bg-muted')}>
                  {name.slice(0, 3)}
                </Button>
              ))}
            </div>
          )}

          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => pageStart + i).map((y) => (
                <Button key={y} type="button" variant="plain" disabled={y < minYear || y > maxYear}
                  onClick={() => { setYear(y); setView('months'); }}
                  className={cn(cellBase, 'h-11 font-medium tabular-nums', selected?.y === y ? 'bg-primary text-primary-foreground hover:bg-primary' : 'hover:bg-muted')}>
                  {y}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs" disabled={!inRange(today, min, max)} onClick={() => pick(today)}>
              Today
            </Button>
            {clearable && value && (
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs text-muted-foreground" onClick={() => { onChange(''); setOpen(false); }}>
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <RequiredShadow value={value} required={required} />
    </div>
  );
}

// ─── Month ───────────────────────────────────────────────────────────────────

export interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export function MonthPicker({ value, onChange, min, max, placeholder = 'Pick a month', disabled, clearable, id, className, ...rest }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const now = new Date();
  const [year, setYear] = React.useState(() => Number(value?.slice(0, 4)) || now.getFullYear());

  React.useEffect(() => {
    if (open) setYear(Number(value?.slice(0, 4)) || now.getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const minYear = min ? Number(min.slice(0, 4)) : 1990;
  const maxYear = max ? Number(max.slice(0, 4)) : now.getFullYear() + 10;

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PickerTrigger id={id} icon={CalendarBlank} text={formatMonth(value)} placeholder={placeholder} disabled={disabled}
            aria-label={rest['aria-label']} onClear={clearable ? () => onChange('') : undefined} />
        </PopoverTrigger>
        <PopoverContent className="w-[264px]">
          <div className="mb-2 flex items-center justify-between">
            <NavButton label="Previous year" disabled={year <= minYear} onClick={() => setYear((y) => y - 1)}><CaretLeft size={15} /></NavButton>
            <span className="text-sm font-semibold tabular-nums">{year}</span>
            <NavButton label="Next year" disabled={year >= maxYear} onClick={() => setYear((y) => y + 1)}><CaretRight size={15} /></NavButton>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((name, m) => {
              const v = `${year}-${pad(m + 1)}`;
              const isSelected = v === value;
              return (
                <Button key={name} type="button" variant="plain" disabled={!inRange(v, min, max)} aria-pressed={isSelected}
                  onClick={() => { onChange(v); setOpen(false); }}
                  className={cn(cellBase, 'h-11 font-medium',
                    isSelected ? 'bg-primary text-primary-foreground hover:bg-primary'
                      : v === thisMonth ? 'bg-tile-blue text-tile-foreground hover:bg-tile-blue' : 'hover:bg-muted')}>
                  {name.slice(0, 3)}
                </Button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs" disabled={!inRange(thisMonth, min, max)}
              onClick={() => { onChange(thisMonth); setOpen(false); }}>
              This month
            </Button>
            {clearable && value && (
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs text-muted-foreground" onClick={() => { onChange(''); setOpen(false); }}>
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Time ────────────────────────────────────────────────────────────────────

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Minutes between choices (default 5). */
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export function TimePicker({ value, onChange, step = 5, placeholder = 'Pick a time', disabled, required, id, className, ...rest }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hh, mm] = /^\d{2}:\d{2}$/.test(value) ? value.split(':') : ['', ''];
  const hours = Array.from({ length: 24 }, (_, h) => pad(h));
  const stepped = Array.from({ length: Math.ceil(60 / step) }, (_, i) => pad(i * step));
  // An existing time that isn't on the step (e.g. 07:32) still shows as chosen.
  const minutes = mm && !stepped.includes(mm) ? [...stepped, mm].sort() : stepped;
  const listRef = React.useRef<HTMLDivElement>(null);

  // Scroll the chosen hour and minute into view when it opens.
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const chosen = listRef.current?.querySelectorAll<HTMLElement>('[aria-pressed="true"]');
      if (chosen?.length) chosen.forEach((el) => el.scrollIntoView({ block: 'center' }));
      // Nothing chosen yet: start at the beginning of the school day.
      else listRef.current?.querySelector<HTMLElement>('[data-value="07"]')?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const set = (h: string, m: string) => onChange(`${h}:${m}`);
  const column = (items: string[], current: string, onPick: (v: string) => void, label: string) => (
    <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin" role="listbox" aria-label={label}>
      {items.map((v) => (
        <Button key={v} type="button" variant="plain" role="option" aria-selected={v === current} aria-pressed={v === current} data-value={v}
          onClick={() => onPick(v)}
          className={cn(cellBase, 'h-9 w-14 shrink-0 font-medium tabular-nums', v === current ? 'bg-primary text-primary-foreground hover:bg-primary' : 'hover:bg-muted')}>
          {v}
        </Button>
      ))}
    </div>
  );

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PickerTrigger id={id} icon={Clock} text={value} placeholder={placeholder} disabled={disabled} aria-label={rest['aria-label']} />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div ref={listRef} className="flex gap-2">
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-medium text-muted-foreground">Hour</p>
              {column(hours, hh, (h) => set(h, mm || '00'), 'Hour')}
            </div>
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-medium text-muted-foreground">Minute</p>
              {column(minutes, mm, (m) => { set(hh || '08', m); setOpen(false); }, 'Minute')}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <RequiredShadow value={value} required={required} />
    </div>
  );
}
