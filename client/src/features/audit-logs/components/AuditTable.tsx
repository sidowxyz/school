import { Eye } from '@phosphor-icons/react';
import { useState } from "react";
import AuditDetailModal from "./AuditDetailModal";


import { AuditLog } from "../types";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface AuditTableProps {
  logs: AuditLog[];
}

export default function AuditTable({ logs }: AuditTableProps) {
const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-muted/50">
            <TableRow className="border-b border-border">
              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground/80">
                Performed By
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground/80">
                Module
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground/80">
                Action
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground/80">
                Status
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground/80">
                IP Address
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground/80">
                Date & Time
              </TableHead>

              <TableHead className="px-6 py-4 text-center text-sm font-semibold text-foreground/80">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-b border-border transition hover:bg-muted/50"
              >
                {/* User */}
                <TableCell className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {log.user}
                    </p>

                  </div>
                </TableCell>

                {/* Module */}
                <TableCell className="px-6 py-4 text-foreground/80">
                  {log.module}
                </TableCell>

                {/* Action */}
                <TableCell className="px-6 py-4">
                  <span className="font-medium text-foreground">
                    {log.action}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      log.status === "Success"
                        ? "bg-primary/15 text-primary"
                        : log.status === "Warning"
                        ? "bg-warning/15 text-warning"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {log.status}
                  </span>
                </TableCell>

                {/* IP */}
                <TableCell className="px-6 py-4 font-mono text-sm text-muted-foreground">
                  {log.ip}
                </TableCell>

                {/* Time */}
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {log.timestamp}
                </TableCell>

                {/* View */}
                <TableCell className="px-6 py-4 text-center">
                  <Button variant="plain" onClick={() => {
  setSelectedLog(log);
  setOpen(true);
}}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                  >
                    <Eye size={16} />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {logs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AuditDetailModal
  open={open}
  log={selectedLog}
  onClose={() => setOpen(false)}
/>
    </div>
  );
}