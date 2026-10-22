import type { Student } from '../../students/types';
import { fullName, initialsOf, classSectionLabel } from '../utils/portalStudent';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, ShieldCheck } from '@phosphor-icons/react';

interface Props {
  student: Student | null;
}

/**
 * The single profile hero banner at the top of the portal.
 * Matches the refined, eye-comfortable shadcn design system with no top tail border.
 */
export default function ProfileContextBanner({ student }: Props) {
  if (!student) {
    return (
      <Card className="border-border/80 shadow-2xs overflow-hidden print:hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-muted/60" />
              <div className="h-3.5 w-56 rounded bg-muted/40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isStatusActive = student.status?.toLowerCase() === 'active';

  return (
    <Card className="border-border/80 shadow-2xs overflow-hidden print:hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-xl shadow-xs">
              {initialsOf(student)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                  {fullName(student)}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    isStatusActive
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isStatusActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {student.status || 'Active'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono font-medium text-foreground">{student.admissionNumber}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <GraduationCap size={13} className="text-muted-foreground" />
                  {classSectionLabel(student)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2 text-right">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                Portal Access
              </span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5 justify-end">
                <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                Verified Student
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
