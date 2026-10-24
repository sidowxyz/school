import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { onLogoError, useSchoolIdentity } from '../../settings/hooks/useSchoolIdentity';

/** The school's logo and name, as shown above the sign-in form. */
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
 * Two-panel layout for the sign-in pages: a photo on large screens, with no
 * text over it, and the form on the right (the only panel on phones).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { schoolName } = useSchoolIdentity();
  return (
    <div className="flex min-h-dvh w-full bg-background">
      <aside className="hidden w-[46%] max-w-[720px] shrink-0 p-4 lg:block">
        <div className="relative h-full min-h-[calc(100dvh-2rem)] overflow-hidden rounded-[2rem] bg-gradient-to-br from-tile-green via-tile-blue to-tile-violet">
          <img src="/Images/Left%20side%20image.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* A soft wash in the dashboard colours so the photo sits with the rest of the app. */}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-tile-green/25 via-transparent to-tile-violet/30" />
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-5 py-8 sm:px-10">
        <SchoolMark />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {schoolName}</p>
      </main>
    </div>
  );
}
