import { SpinnerGap, FileText, Trophy, BookOpen } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { portalApi, type PortalReportCard } from '../../api/portalApi';
import { usePortalResource } from '../../hooks/usePortalResource';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const examName = (rc: PortalReportCard) => rc.examReg?.ex_no?.ex_name ?? 'Report Card';

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export default function ReportCardsTab() {
  const { data, loading, error } = usePortalResource(portalApi.getReportCards);

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

  const cards: PortalReportCard[] = data ?? [];
  const latestScore = cards[0]?.overallScore;
  const totalEvaluations = cards.reduce((acc, c) => acc + (c.marks?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Hairline Divided Summary KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
          <KPICell
            icon={FileText}
            iconClass="text-emerald-600 dark:text-emerald-400"
            label="Report Cards"
            value={String(cards.length)}
            sub="Official reports published"
          />
          <KPICell
            icon={Trophy}
            iconClass="text-sky-600 dark:text-sky-400"
            label="Latest Overall"
            value={typeof latestScore === 'number' ? latestScore.toFixed(1) : '—'}
            sub="Most recent examination"
          />
          <KPICell
            icon={BookOpen}
            iconClass="text-amber-600 dark:text-amber-400"
            label="Subject Marks"
            value={String(totalEvaluations)}
            sub="Evaluated subject criteria"
          />
        </div>
      </Card>

      {/* Main Content */}
      {cards.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Official Academic Report Cards</CardTitle>
            <CardDescription className="text-xs mt-0.5">Term and examination summary reports</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <FileText size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No report cards available</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                No report cards have been issued for you yet. They will appear here once term evaluations are finalized.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        cards.map((rc) => (
          <Card key={rc._id} className="border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">{examName(rc)}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{formatDate(rc.createdAt)}</CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-xs">
                  <FileText size={14} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    Overall: {typeof rc.overallScore === 'number' ? rc.overallScore.toFixed(1) : '—'}
                    {typeof rc.examReg?.total_marks === 'number' && (
                      <span className="text-muted-foreground font-normal"> / {rc.examReg.total_marks}</span>
                    )}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[420px]">
                  <TableHeader>
                    <TableRow className="border-b border-border/60">
                      <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Subject
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">
                        Score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rc.marks.map((m, i) => (
                      <TableRow
                        key={i}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-5 py-3 text-sm font-medium text-foreground">
                          {m.subject?.sub_name ?? '—'}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm font-semibold text-foreground text-right">
                          {m.score}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/* ─── KPI Strip Cell ─── */
function KPICell({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon size={15} className={iconClass} />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
