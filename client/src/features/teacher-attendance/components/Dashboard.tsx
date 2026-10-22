
import {
  Info,
  Zap,
  ClipboardText,
  FileText,
  DownloadSimple,
  ChartBar,
  Clock,
} from '@phosphor-icons/react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import AttendanceStats from "./AttendanceStats";
import { Button } from '@/components/ui/button';

const weeklyData = [
  { day: "Mon", present: 8, absent: 1, late: 1, leave: 0 },
  { day: "Tue", present: 9, absent: 0, late: 1, leave: 0 },
  { day: "Wed", present: 8, absent: 1, late: 2, leave: 0 },
  { day: "Thu", present: 10, absent: 0, late: 1, leave: 0 },
  { day: "Fri", present: 8, absent: 1, late: 1, leave: 1 },
];

const monthlyData = [
  { month: "Jan", rate: 95 },
  { month: "Feb", rate: 96 },
  { month: "Mar", rate: 97 },
  { month: "Apr", rate: 98 },
  { month: "May", rate: 97 },
  { month: "Jun", rate: 99 },
];

const recentActivity = [
  {
    id: 1,
    initials: "DH",
    teacher: "Dr. Hassan Ahmed Ali",
    action: "Marked present",
    time: "07:55 AM",
    status: "Present",
    avatarColor: "bg-green-100 text-green-700",
    badgeColor: "bg-green-600",
  },
  {
    id: 2,
    initials: "AY",
    teacher: "Amina Yusuf",
    action: "Marked late",
    time: "08:12 AM",
    status: "Late",
    avatarColor: "bg-yellow-100 text-yellow-700",
    badgeColor: "bg-yellow-500",
  },
  {
    id: 3,
    initials: "MN",
    teacher: "Mohamed Noor",
    action: "Marked absent",
    time: "08:20 AM",
    status: "Absent",
    avatarColor: "bg-red-100 text-red-700",
    badgeColor: "bg-red-500",
  },
  {
    id: 4,
    initials: "FA",
    teacher: "Fatima Ali",
    action: "Approved leave",
    time: "08:35 AM",
    status: "Leave",
    avatarColor: "bg-blue-100 text-blue-700",
    badgeColor: "bg-blue-500",
  },
  {
    id: 5,
    initials: "AA",
    teacher: "Asma Ahmed",
    action: "Attendance pending",
    time: "--",
    status: "Unmarked",
    avatarColor: "bg-gray-100 text-gray-700",
    badgeColor: "bg-gray-500",
  },
];


const leaveTeachers = [
  {
    id: 1,
    name: "Mr. Mohamed Jama Hussein",
    department: "Humanities",
    status: "Leave",
  },
];

export default function Dashboard() {
const navigate = useNavigate();
  return (
    <div className="space-y-6">

      {/* Stats */}
      <AttendanceStats />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">

        {/* Weekly Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

          <h2 className="text-xl font-semibold">
            Weekly Attendance
          </h2>

          <p className="mt-1 text-gray-500">
            Daily attendance overview
          </p>
          <p className="mt-2 text-lg text-gray-500">
  Present / Absent / Late / Leave per day
</p>


          <div className="mt-5 h-72">

            <ResponsiveContainer width="100%" height="100%">

              <BarChart data={weeklyData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="day" />

                <YAxis />

                <Tooltip />


<Legend
  verticalAlign="bottom"
  align="center"
  iconType="square"
  wrapperStyle={{ paddingTop: 20 }}
/>

<Bar
  dataKey="present"
  name="Present"
  fill="#22c55e"
  radius={[4, 4, 0, 0]}
/>

<Bar
  dataKey="absent"
  name="Absent"
  fill="#ef4444"
  radius={[4, 4, 0, 0]}
/>

<Bar
  dataKey="late"
  name="Late"
  fill="#f59e0b"
  radius={[4, 4, 0, 0]}
/>

<Bar
  dataKey="leave"
  name="Leave"
  fill="#3b82f6"
  radius={[4, 4, 0, 0]}
/>
              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>


        {/* Monthly Chart */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Monthly Attendance Rate
          </h2>

          <p className="mt-1 text-gray-500">
            Attendance performance
          </p>

          <div className="mt-5 h-72">

            <ResponsiveContainer width="100%" height="100%">

              <LineChart data={monthlyData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis domain={[90, 100]} />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#22c55e"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>
            {/* Bottom Section */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* Today's Summary */}
        <div className=" rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Today's Summary
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Monday, June 8, 2026
          </p>

          <div className="mt-6 space-y-5">

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Present</span>
                <span className="font-medium">8/12</span>
              </div>

              <div className="h-2 rounded-full bg-gray-200">
                <div className="h-2 w-[67%] rounded-full bg-green-500"></div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Absent</span>
                <span className="font-medium">1/12</span>
              </div>

              <div className="h-2 rounded-full bg-gray-200">
                <div className="h-2 w-[10%] rounded-full bg-red-500"></div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Late</span>
                <span className="font-medium">1/12</span>
              </div>

              <div className="h-2 rounded-full bg-gray-200">
                <div className="h-2 w-[10%] rounded-full bg-yellow-500"></div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>On Leave</span>
                <span className="font-medium">1/12</span>
              </div>

              <div className="h-2 rounded-full bg-gray-200">
                <div className="h-2 w-[10%] rounded-full bg-blue-500"></div>
              </div>
            </div>

          </div>

        </div>

        {/* Recent Activity */}
        <div className=" rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

  <div className="flex items-center gap-2">
    <Clock className="h-5 w-5 text-blue-500" />
    <h2 className="text-xl font-semibold text-gray-900">
      Recent Activity
    </h2>
  </div>

  <div className="mt-6 space-y-5">

    {recentActivity.map((item) => (

      <div
        key={item.id}
        className="flex items-center justify-between"
      >

        <div className="flex items-center gap-4">

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full font-semibold ${item.avatarColor}`}
          >
            {item.initials}
          </div>

          <div>

            <h3 className="font-medium text-gray-900">
              {item.teacher}
            </h3>

            <p className="text-sm text-gray-500">
              {item.action}
              {item.time !== "--" && (
                <span className="text-gray-400">
                  {" â€¢ "}{item.time}
                </span>
              )}
            </p>

          </div>

        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${item.badgeColor}`}
        >
          {item.status}
        </span>

      </div>

    ))}

  </div>

  <div className="mt-6 text-center">
    <Button variant="plain" className="font-medium text-green-600 transition hover:text-green-700">
      View All â†’
    </Button>
  </div>

</div>
                
{/* Right Side */}
<div className="flex flex-col gap-6">
{/* Currently On Leave */}
  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

  {/* Header */}
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">    <Info className="h-5 w-5 text-sky-500" />
    <h2 className="text-xl font-semibold text-gray-900">
      Currently On Leave
    </h2>
  </div>

  {/* Content */}
  <div className="mt-5">

    {leaveTeachers.map((teacher) => (

      <div
        key={teacher.id}
        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
      >

        <div className="flex items-center gap-4">

          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
            {teacher.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </div>

          {/* Teacher */}
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {teacher.name}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {teacher.department}
            </p>
          </div>

        </div>

        {/* Badge */}
        <span className="rounded-full bg-sky-500 px-3 py-1 text-sm font-semibold text-white">
          {teacher.status}
        </span>

      </div>

    ))}

  </div>
</div>

{/* Quick Actions */}

  {/* Header */}
  <div className="flex items-center gap-3">
    <Zap className="h-5 w-5 text-amber-500" />
    <h2 className="text-2xl font-semibold text-gray-900">
      Quick Actions
    </h2>
  </div>

  {/* Buttons */}
  <div className="mt-6 grid grid-cols-2 gap-4">

<Button variant="plain"
  onClick={() => navigate("/teacher-attendance?tab=mark")}
  className="flex h-24 flex-col items-center justify-center rounded-2xl border border-gray-200 transition hover:border-green-300 hover:bg-green-50"
>      <ClipboardText className="h-7 w-7 text-green-600" />
      <span className="mt-3 font-medium text-gray-800">
        Mark Attendance
      </span>
    </Button>

    <Button variant="plain"
  onClick={() => navigate("/teacher-attendance?tab=reports")}
  className="flex h-28 flex-col items-center justify-center rounded-2xl border border-gray-200 transition hover:border-green-300 hover:bg-green-50"
>
  <FileText className="h-7 w-7 text-green-600" />
  <span className="mt-3 font-medium text-gray-800">
    View Reports
  </span>
</Button>

    <Button variant="plain" className="flex h-28 flex-col items-center justify-center rounded-2xl border border-gray-200 transition hover:border-green-300 hover:bg-green-50">
      <DownloadSimple className="h-7 w-7 text-green-600" />
      <span className="mt-3 font-medium text-gray-800">
        Export Data
      </span>
    </Button>

    <Button variant="plain"
  onClick={() => navigate("/teacher-attendance?tab=analytics")}
  className="flex h-28 flex-col items-center justify-center rounded-2xl border border-gray-200 transition hover:border-green-300 hover:bg-green-50"
>
  <ChartBar className="h-7 w-7 text-green-600" />
  <span className="mt-3 font-medium text-gray-800">
    Analytics
  </span>
</Button>

  </div>



</div>
      </div>

      {/* Quick Actions */}

      

    </div>
  );
}