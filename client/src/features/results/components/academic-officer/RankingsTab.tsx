
import { Trophy, Medal } from '@phosphor-icons/react';

import GradeBadge from '../shared/GradeBadge';
import { SkeletonTable } from '../shared/Skeleton';
import type { ClassResults } from '../../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={16} className="text-amber-500" />;
  if (rank === 2) return <Medal size={16} className="text-slate-400" />;
  if (rank === 3) return <Trophy size={16} className="text-amber-700" />;
  return null;
}

interface Props {
  examName: string;
  className: string;
  results: ClassResults | null;
  loading: boolean;
}

export default function RankingsTab({ examName, className, results, loading }: Props) {
  if (loading) return <SkeletonTable rows={8} />;

  const rows = results?.results ?? [];

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">
          Class Rankings{className ? ` · ${className}` : ''}
        </h3>
        {examName && (
          <Badge variant="outline" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
            {examName}
          </Badge>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 ring-1 ring-border/60">
            <Trophy className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">No published results yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Rankings appear once marks for this examination have been published.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[760px] text-sm">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30">
                <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Rank</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Roll No.</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Name</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Total Marks</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Percentage</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.student.id}
                  className={`border-b border-border/60 hover:bg-muted/40 transition-colors ${
                    r.rank <= 3 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                  }`}
                >
                  <TableCell className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                      <RankCell rank={r.rank} />#{r.rank}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-xs font-mono text-muted-foreground font-medium">
                    {r.student.rollNo}
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-foreground tracking-tight">{r.student.name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.student.className}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-center text-xs font-medium text-foreground">
                    {r.totalObtained}/{r.totalMax}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {r.percentage}%
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-center">
                    <GradeBadge grade={r.grade} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
