import type { ReactNode } from 'react';
import { CalendarCheck, Coins, Exam, UsersThree, type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { onLogoError, useSchoolIdentity } from '../../settings/hooks/useSchoolIdentity';

// What the app does, as tiles in the dashboard colours. Descriptions only, no
// figures, so nothing on the sign-in page looks like real school data.
const FEATURES: { icon: Icon; title: string; text: string; tile: string }[] = [
  { icon: CalendarCheck, title: 'Attendance', text: 'Mark a class in seconds', tile: 'bg-tile-green' },
  { icon: Exam, title: 'Exams & marks', text: 'Report cards in one click', tile: 'bg-tile-violet' },
  { icon: Coins, title: 'Fees', text: 'Receipts at the counter', tile: 'bg-tile-yellow' },
  { icon: UsersThree, title: 'Portals', text: 'Students and parents see their own', tile: 'bg-tile-pink' },
];

/** The school's logo and name, as shown above the sign-in form and on the side panel. */
export function SchoolMark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  const { schoolName, logoSrc } = useSchoolIdentity();
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border/60', size === 'lg' ? 'h-12 w-12' : 'h-10 w-10')}>
        <img src={logoSrc} alt="" onError={onLogoError} className={cn('object-contain', size === 'lg' ? 'h-9 w-9' : 'h-7 w-7')} />
      </span>
      <span className="text-sm font-semibold leading-tight text-foreground">{schoolName}</span>
    </div>
  );
}

/**
 * Two-panel layout for the sign-in pages: a pastel panel about the school and
 * the app on large screens, and the form on the right (the only panel on phones).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { schoolName } = useSchoolIdentity();
  return (
    <div className="flex min-h-dvh w-full bg-background">
      <aside className="hidden w-[46%] max-w-[720px] shrink-0 p-4 lg:block">
        <div className="relative flex h-full min-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-tile-green via-tile-blue to-tile-violet p-8 text-tile-foreground xl:p-10">
          {/* Soft shapes behind the content */}
          <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-card/25 blur-2xl" />
          <span aria-hidden className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-tile-yellow/40 blur-3xl" />

          <SchoolMark size="lg" className="relative" />

          <div className="relative mt-auto space-y-6 pt-10">
            <div className="max-w-md space-y-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">Everything your school runs on, in one place.</h2>
              <p className="text-sm opacity-80">Attendance, timetables, marks, report cards and fees, for staff, students and parents.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative row-span-2 min-h-[220px] overflow-hidden rounded-2xl shadow-sm ring-1 ring-card/40">
                <img src="/Images/Left%20side%20image.jpg" alt="Students reading in class" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              {FEATURES.slice(0, 2).map((f) => <FeatureCard key={f.title} {...f} />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.slice(2).map((f) => <FeatureCard key={f.title} {...f} />)}
            </div>
          </div>

          <p className="relative mt-8 text-xs opacity-70">{schoolName} · Staff, students and parents all sign in here.</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-5 py-8 sm:px-10">
        <SchoolMark className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {schoolName}</p>
      </main>
    </div>
  );
}

function FeatureCard({ icon: FeatureIcon, title, text, tile }: { icon: Icon; title: string; text: string; tile: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card/85 p-3.5 text-foreground shadow-sm backdrop-blur">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-tile-foreground', tile)}>
        <FeatureIcon size={18} weight="duotone" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
