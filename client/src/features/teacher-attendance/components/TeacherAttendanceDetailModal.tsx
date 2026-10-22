import {
  Phone,
  Envelope,
  Briefcase,
  GraduationCap,
  DownloadSimple,
} from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface TeacherAttendance {
  id: number;
  staffId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: "Present" | "Absent" | "Late" | "Leave" | "unmarked";
}

interface Props {
  teacher: TeacherAttendance;
  onClose: () => void;
}

export default function TeacherAttendanceDetailModal({
  teacher,
  onClose,
}: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teacher Attendance Detail</DialogTitle>
          <DialogDescription>
            Full attendance profile for {teacher.name} ({teacher.staffId})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Teacher Profile Card */}
          <div className="rounded-xl border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground shrink-0">
              {teacher.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  {teacher.name}
                </h3>
                <Badge variant={teacher.status === "Present" ? "default" : teacher.status === "Late" ? "secondary" : "destructive"}>
                  {teacher.status}
                </Badge>
                <Badge variant="outline">{teacher.department}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {teacher.staffId} â€¢ {teacher.designation} â€¢ Full-Time Faculty
              </p>
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border p-4 text-xs">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <span>+252-61-7890123</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Envelope className="h-4 w-4 text-primary shrink-0" />
              <span>{teacher.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Briefcase className="h-4 w-4 text-primary shrink-0" />
              <span>Department: {teacher.department}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-primary shrink-0" />
              <span>Role: {teacher.designation}</span>
            </div>
          </div>

          {/* Attendance Stat Cards */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Attendance Summary (Janâ€“Jun 2026)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-primary">5</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Present Days</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-destructive">3</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Absent Days</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">1</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Late Arrivals</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-muted-foreground">0</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">On Leave</div>
              </div>
            </div>
          </div>

          {/* Attendance Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-foreground">Attendance Rate</span>
              <span className="text-primary font-bold">96%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: "96%" }} />
            </div>
          </div>

          {/* Recent Records Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Attendance Log
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-xs">08 Jun 2026</TableCell>
                    <TableCell className="text-xs">07:55 AM</TableCell>
                    <TableCell className="text-xs">02:00 PM</TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-[10px]">Present</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">07 Jun 2026</TableCell>
                    <TableCell className="text-xs">08:10 AM</TableCell>
                    <TableCell className="text-xs">02:00 PM</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">Late</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">06 Jun 2026</TableCell>
                    <TableCell className="text-xs">â€”</TableCell>
                    <TableCell className="text-xs">â€”</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-[10px]">Absent</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">05 Jun 2026</TableCell>
                    <TableCell className="text-xs">07:58 AM</TableCell>
                    <TableCell className="text-xs">02:00 PM</TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-[10px]">Present</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3">
          <Button variant="outline" className="gap-2">
            <DownloadSimple size={14} /> DownloadSimple Report
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}