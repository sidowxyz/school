import {
  FileText,
  CalendarBlank,
  Users,
  ShieldWarning,
} from '@phosphor-icons/react';

import type { AuditLog } from "../types";

export default function AuditStats({ logs }: { logs: AuditLog[] }) {
  const totalLogs = logs.length;

  // Previously this matched a hardcoded date string against mock data. Now that
  // timestamps are real ISO dates from the API, compare against actual today.
  const today = new Date().toDateString();
  const todayLogs = logs.Funnel(
    (log) => new Date(log.timestamp).toDateString() === today
  ).length;

  const activeUsers = new Set(logs.map((log) => log.user)).size;

  const failedActions = logs.Funnel(
    (log) => log.status === "Failed"
  ).length;

  const stats = [
    {
      title: "Total Logs",
      value: totalLogs,
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Today's Logs",
      value: todayLogs,
      icon: CalendarBlank,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Active Users",
      value: activeUsers,
      icon: Users,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Failed Actions",
      value: failedActions,
      icon: ShieldWarning,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.title}
                </p>

                <h2 className="mt-2 text-3xl font-bold text-gray-900">
                  {stat.value}
                </h2>
              </div>

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${stat.iconBg}`}
              >
                <Icon
                  className={`h-7 w-7 ${stat.iconColor}`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}