import { DownloadSimple, ArrowsClockwise } from '@phosphor-icons/react';
import { useMemo, useState } from "react";

import PageHeader from "../../../components/common/PageHeader";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

import AuditStats from "../components/AuditStats";
import AuditFilters from "../components/AuditFilters";
import AuditTable from "../components/AuditTable";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { Button } from '@/components/ui/button';

/** Lives as a tab in Settings (embedded); kept usable on its own too. */
export default function AuditLogsPage({ embedded = false }: { embedded?: boolean }) {
const { logs: auditLogs, loading, error, reload } = useAuditLogs();

const [search, setSearch] = useState("");
const [user, setUser] = useState("All Users");
const [action, setAction] = useState("All Actions");
const [date, setDate] = useState("");

const filteredLogs = useMemo(() => {
  return auditLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());

    const matchesUser =
      user === "All Users" || log.user === user;

    const matchesAction =
      action === "All Actions" || log.action === action;

    const matchesDate =
      !date || log.timestamp.includes(date);

    return (
      matchesSearch &&
      matchesUser &&
      matchesAction &&
      matchesDate
    );
  });
}, [auditLogs, search, user, action, date]);

// Filter choices come from the entries themselves, so they always match.
const userOptions = useMemo(() => [...new Set(auditLogs.map((l) => l.user))].sort(), [auditLogs]);
const actionOptions = useMemo(() => [...new Set(auditLogs.map((l) => l.action))].sort(), [auditLogs]);
const handleExportCSV = () => {
  const headers = [
    "Performed By",
    "Role",
    "Module",
    "Action",
    "Status",
    "IP Address",
    "Date & Time",
  ];

  const rows = filteredLogs.map((log) => [
    log.user,
    log.role,
    log.module,
    log.action,
    log.status,
    log.ip,
    log.timestamp,
  ]);

  // Quote every cell so commas and quotes inside values don't break the columns.
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(cell).join(","),
    ...rows.map((row) => row.map(cell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "audit-logs.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
  return (
    <div className="space-y-6">
      {(() => {
        const actions = (
          <div className="flex items-center gap-2">
            <Button variant="outline"
              onClick={reload}
              disabled={loading}>
              <ArrowsClockwise size={18} className={loading ? "animate-spin" : undefined} />
              Refresh
            </Button>
            <Button variant="default"
             onClick={handleExportCSV}>
              <DownloadSimple size={18} />
              Export CSV
            </Button>
          </div>
        );
        return embedded
          ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Every change made in the system, newest first.</p>{actions}</div>
          : <PageHeader title="Audit Logs" subtitle="Every change made in the system, newest first." action={actions} />;
      })()}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <AuditStats logs={auditLogs} />

      <AuditFilters
  search={search}
  setSearch={setSearch}
  user={user}
  setUser={setUser}
  action={action}
  setAction={setAction}
  date={date}
  setDate={setDate}
  userOptions={userOptions}
  actionOptions={actionOptions}
/>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <AuditTable logs={filteredLogs} />
      )}
    </div>
  );
}