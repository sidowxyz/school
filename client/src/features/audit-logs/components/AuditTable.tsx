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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-gray-50">
            <TableRow className="border-b border-gray-200">
              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Performed By
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Module
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Action
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Status
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                IP Address
              </TableHead>

              <TableHead className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Date & Time
              </TableHead>

              <TableHead className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-b border-gray-100 transition hover:bg-gray-50"
              >
                {/* User */}
                <TableCell className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {log.user}
                    </p>

                  </div>
                </TableCell>

                {/* Module */}
                <TableCell className="px-6 py-4 text-gray-700">
                  {log.module}
                </TableCell>

                {/* Action */}
                <TableCell className="px-6 py-4">
                  <span className="font-medium text-gray-800">
                    {log.action}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      log.status === "Success"
                        ? "bg-green-100 text-green-700"
                        : log.status === "Warning"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </TableCell>

                {/* IP */}
                <TableCell className="px-6 py-4 font-mono text-sm text-gray-600">
                  {log.ip}
                </TableCell>

                {/* Time */}
                <TableCell className="px-6 py-4 text-sm text-gray-600">
                  {log.timestamp}
                </TableCell>

                {/* View */}
                <TableCell className="px-6 py-4 text-center">
                  <Button variant="plain" onClick={() => {
  setSelectedLog(log);
  setOpen(true);
}}
                    className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
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
                  className="py-12 text-center text-gray-500"
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