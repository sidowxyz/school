import { ClipboardText, Clock, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// The backend has no student assignment/homework model yet, so there is no real
// data to show here. Rather than display sample data, we surface a clear
// "not available" state until an assignments feature is built server-side.
export default function AssignmentsTab() {
  return (
    <div className="space-y-6">
      {/* Hairline Divided Summary KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
          <KPICell
            icon={ClipboardText}
            iconClass="text-primary"
            label="Total Assigned"
            value="0"
            sub="Active coursework"
          />
          <KPICell
            icon={Clock}
            iconClass="text-warning"
            label="Pending Review"
            value="0"
            sub="Awaiting submission"
          />
          <KPICell
            icon={CheckCircle}
            iconClass="text-success"
            label="Completed"
            value="0"
            sub="Submitted & reviewed"
          />
        </div>
      </Card>

      {/* Main Content Card */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold text-foreground">Coursework & Assignments</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Class homework tasks, project briefs, and due dates
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <div className="w-14 h-14 mx-auto rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center">
              <ClipboardText size={26} className="text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Assignments aren't available yet</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto mt-1">
                Homework and assignment tracking module is scheduled for an upcoming term release. Once enabled by your
                teachers, all coursework and submission prompts will appear here automatically.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 bg-muted/40 px-3 py-1 rounded-full border border-border/40">
              <WarningCircle size={13} /> Module currently in provisioning
            </div>
          </div>
        </CardContent>
      </Card>
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
