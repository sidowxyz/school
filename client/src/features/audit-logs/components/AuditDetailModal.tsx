import { ClockCounterClockwise } from "@phosphor-icons/react";
import { AuditLog } from "../types";
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

interface Props {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

export default function AuditDetailModal({
  open,
  log,
  onClose,
}: Props) {
  if (!open || !log) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader icon={ClockCounterClockwise} tint="violet">
          <div className="flex items-center gap-2 mb-1">
            <DialogTitle>Audit Log Details</DialogTitle>
            <Badge
              variant={
                log.status === "Success"
                  ? "default"
                  : log.status === "Warning"
                  ? "secondary"
                  : "destructive"
              }
            >
              {log.status}
            </Badge>
          </div>
          <DialogDescription>
            Review activity history, timestamp, and metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-lg border bg-muted/30 p-4">
            <Info title="Performed By" value={log.user} />
            <Info title="Role" value={log.role} />
            <Info title="Module" value={log.module} />
            <Info title="Action" value={log.action} />
            <Info title="IP Address" value={log.ip} />
            <Info title="Date" value={new Date(log.timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })} />
          </div>

          {/* Before / After Diff */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Before */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive">
                Before Changes
              </h4>

              {Object.keys(log.before).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No previous values recorded.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {Object.entries(log.before).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between border-b pb-1.5"
                    >
                      <span className="font-medium text-muted-foreground">{key}</span>
                      <span className="font-mono text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* After */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                After Changes
              </h4>

              {Object.keys(log.after).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No updated values recorded.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {Object.entries(log.after).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between border-b pb-1.5"
                    >
                      <span className="font-medium text-muted-foreground">{key}</span>
                      <span className="font-mono text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-foreground truncate">
        {value}
      </p>
    </div>
  );
}