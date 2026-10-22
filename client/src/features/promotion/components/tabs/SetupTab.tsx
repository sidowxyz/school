import { useEffect, useState } from 'react';
import { ArrowRight, Users, GraduationCap, Warning, Shuffle, SpinnerGap } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { promotionApi } from '../../api/promotionApi';
import SpecialPromotionModal from '../modals/SpecialPromotionModal';
import type { LadderClass } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  onSelectClass: (classId: string) => void;
}

export default function SetupTab({ onSelectClass }: Props) {
  const [ladder, setLadder] = useState<LadderClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialOpen, setSpecialOpen] = useState(false);

  const load = () => {
    setLoading(true);
    promotionApi
      .getLadder()
      .then(setLadder)
      .catch(() => setError('Failed to load the class hierarchy.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  const unordered = ladder.Funnel((c) => c.promotion_order === null);

  return (
    <div className="space-y-6">
      {/* Promotion Ladder Info Card */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Promotion Ladder</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Students advance to the next class in the academic hierarchy. The progression is determined by the
                ladder below.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSpecialOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
            >
              <Shuffle size={13} /> Special Promotion / Change Class
            </Button>
          </div>
        </CardHeader>
        {unordered.length > 0 && (
          <CardContent className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Warning size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {unordered.map((c) => c.cl_name).join(', ')} {unordered.length === 1 ? 'has' : 'have'} no position in
              the hierarchy. Set a promotion order on {unordered.length === 1 ? 'it' : 'them'} to make{' '}
              {unordered.length === 1 ? 'it' : 'them'} promotable.
            </span>
          </CardContent>
        )}
      </Card>

      {/* Class Cards Grid */}
      {ladder.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-16 text-center space-y-2 text-muted-foreground">
            <GraduationCap size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No classes configured</p>
            <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
              No academic classes have been set up in the system yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ladder.map((c) => {
            const graduating = c.next_class === null;
            const promotable = c.promotion_order !== null || graduating;

            return (
              <Card
                key={c._id}
                className="border-border/80 shadow-2xs hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{c.cl_name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Users size={13} className="text-muted-foreground" /> {c.student_count} student
                        {c.student_count === 1 ? '' : 's'}
                        {c.has_sections && ` · ${c.sections.length} section${c.sections.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    {graduating && (
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                      >
                        <GraduationCap size={12} /> Final Class
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50 text-xs">
                    <span className="font-medium text-foreground">{c.cl_name}</span>
                    <ArrowRight size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-semibold text-primary">
                      {c.next_class ? c.next_class.cl_name : 'Graduated Alumni'}
                    </span>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => onSelectClass(c._id)}
                      disabled={!promotable || c.student_count === 0}
                      title={
                        !promotable
                          ? 'This class has no position in the hierarchy yet.'
                          : c.student_count === 0
                          ? 'No students enrolled in this class.'
                          : undefined
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      Start Review <ArrowRight size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {specialOpen && (
        <SpecialPromotionModal
          ladder={ladder}
          onClose={() => setSpecialOpen(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
