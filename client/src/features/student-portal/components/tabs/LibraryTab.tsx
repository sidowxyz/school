import { SpinnerGap, BookOpen, BookBookmark, CheckSquare, WarningCircle } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '../shared';
import { portalApi, type PortalBookIssue } from '../../api/portalApi';
import { usePortalResource } from '../../hooks/usePortalResource';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const bookTitle = (i: PortalBookIssue) => i.book_id?.book_name ?? '—';
const authorName = (i: PortalBookIssue) => {
  const a = i.book_id?.author_id;
  return a ? (a.author_name ?? a.name ?? '—') : '—';
};
const STATUS_LABEL: Record<string, string> = { issued: 'Issued', returned: 'Returned', overdue: 'Overdue' };

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function LibraryTab() {
  const { data, loading, error } = usePortalResource(portalApi.getLibrary);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  const issues: PortalBookIssue[] = data?.issues ?? [];
  const summary = data?.summary ?? {};

  return (
    <div className="space-y-6">
      {/* Hairline Divided KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px">
          <KPICell icon={BookOpen} iconClass="text-sky-600 dark:text-sky-400" label="Total Borrowed" value={String(data?.total ?? 0)} sub="All time" />
          <KPICell icon={BookBookmark} iconClass="text-emerald-600 dark:text-emerald-400" label="Currently Out" value={String(summary.issued ?? 0)} sub="Active loans" />
          <KPICell icon={CheckSquare} iconClass="text-muted-foreground" label="Returned" value={String(summary.returned ?? 0)} sub="Completed" />
          <KPICell icon={WarningCircle} iconClass="text-rose-600 dark:text-rose-400" label="Overdue" value={String(summary.overdue ?? 0)} sub="Past due date" />
        </div>
      </Card>

      {/* Books Table */}
      {issues.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <BookOpen size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No books borrowed</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                You haven't borrowed any books yet. Visit the library to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Borrowing History</CardTitle>
            <CardDescription className="text-xs mt-0.5">Books issued to you and their current status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[620px]">
                <TableHeader>
                  <TableRow className="border-b border-border/60">
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Book</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Author</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Issued</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Due</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((i) => (
                    <TableRow key={i._id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                      <TableCell className="px-5 py-3 text-sm font-medium text-foreground">{bookTitle(i)}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">{authorName(i)}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">{formatDate(i.issue_date)}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">{formatDate(i.expected_return_date)}</TableCell>
                      <TableCell className="px-5 py-3"><StatusBadge status={STATUS_LABEL[i.status] ?? i.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── KPI Strip Cell ─── */
function KPICell({ icon: Icon, iconClass, label, value, sub }: { icon: React.ElementType; iconClass: string; label: string; value: string; sub: string }) {
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
