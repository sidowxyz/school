import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CalendarX,
  TrendUp,
} from '@phosphor-icons/react';

const stats = [
  {
    title: "Total Teachers",
    value: "12",
    icon: Users,
    bg: "bg-blue-100",
    color: "text-blue-600",
  },
  {
    title: "Present",
    value: "8",
    icon: CheckCircle,
    bg: "bg-green-100",
    color: "text-green-600",
  },
  {
    title: "Absent",
    value: "1",
    icon: XCircle,
    bg: "bg-red-100",
    color: "text-red-600",
  },
  {
    title: "Late",
    value: "1",
    icon: Clock,
    bg: "bg-yellow-100",
    color: "text-yellow-600",
  },
  {
    title: "On Leave",
    value: "1",
    icon: CalendarX,
    bg: "bg-purple-100",
    color: "text-purple-600",
  },
  {
    title: "Attendance Rate",
    value: "83.3%",
    icon: TrendUp,
    bg: "bg-emerald-100",
    color: "text-emerald-600",
  },
];

export default function AttendanceStats() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {stat.title}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {stat.value}
                </h2>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <Icon size={20} className={stat.color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}