import type { ReactNode } from 'react';
import { ArrowLeft, type Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Shared pieces for the person profile pages (student, teacher): a pastel
// header with who they are, and a label/value grid for their details. Sections
// use SettingsSection, the same titled cards as Settings.
export { SettingsSection as ProfileSection } from '@/features/settings/components/SettingsSection';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-tile-green',
  'on leave': 'bg-tile-yellow',
  suspended: 'bg-tile-pink',
  graduated: 'bg-tile-violet',
};

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

export interface ProfileChip { icon: Icon; label: ReactNode }

/** Back button, initials (or photo), name, status, quick facts and the page's actions. */
export function ProfileHero({ name, kind, status, photo, chips, actions, onBack, backLabel }: {
  name: string;
  /** What this person is, e.g. "Student" or "Teacher · Science". */
  kind: string;
  status?: string;
  photo?: string;
  chips: ProfileChip[];
  actions?: ReactNode;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-tile-blue via-tile-violet to-tile-green p-5 text-tile-foreground sm:p-6">
      <span aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-card/25 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <Button variant="plain" type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-card/80">
          <ArrowLeft size={14} /> {backLabel}
        </Button>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="relative mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card text-2xl font-bold shadow-sm ring-4 ring-card/40">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
        </span>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
            {status && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-card/60', STATUS_TONE[status.toLowerCase()] ?? 'bg-card/70')}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {status}
              </span>
            )}
          </div>
          <p className="text-sm opacity-80">{kind}</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map(({ icon: ChipIcon, label }, i) => (
              <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
                <ChipIcon size={13} className="shrink-0 opacity-70" />
                <span className="truncate">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export interface InfoItem { label: string; value?: ReactNode; icon?: Icon; wide?: boolean; empty?: string }

/** Label over value, in a responsive grid. Missing values read "Not recorded". */
export function InfoGrid({ items, columns = 2 }: { items: InfoItem[]; columns?: 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>
      {items.map(({ label, value, icon: ItemIcon, wide, empty = 'Not recorded' }) => {
        const missing = value === undefined || value === null || value === '' || value === '—';
        return (
          <div key={label} className={cn('min-w-0', wide && 'sm:col-span-2', wide && columns === 3 && 'lg:col-span-3')}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {ItemIcon && <ItemIcon size={13} className="shrink-0" />}
              {label}
            </dt>
            <dd className={cn('mt-1 break-words text-sm', missing ? 'italic text-muted-foreground/70' : 'font-medium text-foreground')}>
              {missing ? empty : value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
