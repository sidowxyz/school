import {
  TrendUp,
  CalendarX,
  Trophy,
} from '@phosphor-icons/react';
import {
  ChartPie,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const monthlyTrend = [
  { month: "Jan", value: 97.0 },
  { month: "Feb", value: 96.7 },
  { month: "Mar", value: 97.8 },
  { month: "Apr", value: 97.3 },
  { month: "May", value: 98.4 },
  { month: "Jun", value: 97.6 },
];
const attendanceDistribution = [
  { name: "Present", value: 65, color: "#16A34A" },
  { name: "Late", value: 20, color: "#F59E0B" },
  { name: "Leave", value: 10, color: "#3B82F6" },
  { name: "Absent", value: 5, color: "#EF4444" },
];

const lateTrend = [
  { month: "Jan", value: 8 },
  { month: "Feb", value: 6 },
  { month: "Mar", value: 4 },
  { month: "Apr", value: 7 },
  { month: "May", value: 3 },
  { month: "Jun", value: 5 },
];

const weeklyPattern = [
  { day: "Mon", value: 95 },
  { day: "Tue", value: 99 },
  { day: "Wed", value: 96 },
  { day: "Thu", value: 93 },
  { day: "Fri", value: 95 },
];
export default function Analytics() {
  return (
    <div className="space-y-6">

      {/* Top Stats */}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {/* Monthly Avg */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-sm text-gray-500">
            Monthly Avg Rate
          </p>

          <h2 className="mt-2 text-5xl font-bold text-gray-900">
            97.3%
          </h2>

          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <TrendUp size={16} />
            +0.5% vs last month
          </div>

        </div>

        {/* Late Arrivals */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-sm text-gray-500">
            Total Late Arrivals
          </p>

          <h2 className="mt-2 text-5xl font-bold text-gray-900">
            33
          </h2>

          <p className="mt-3 text-sm text-gray-500">
            Janâ€“Jun 2026
          </p>

        </div>

        {/* Leave */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-sm text-gray-500">
            Total Leave Days
          </p>

          <h2 className="mt-2 text-5xl font-bold text-gray-900">
            100
          </h2>

          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <CalendarX size={16} />
            Across all staff
          </div>

        </div>

        {/* Perfect Attendance */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-sm text-gray-500">
            Perfect Attendance
          </p>

          <h2 className="mt-2 text-5xl font-bold text-gray-900">
            2
          </h2>

          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <Trophy size={16} />
            Teachers this term
          </div>

        </div>

      </div>

      {/* Charts Row */}

      <div className="grid gap-6 xl:grid-cols-12">

        {/* Monthly Trend */}

        <div className="xl:col-span-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-bold text-gray-900">
            Monthly Attendance Trend
          </h2>

          <p className="mt-2 text-gray-500">
            6-month attendance rate overview
          </p>

          <div className="mt-8 h-[320px]">

            <ResponsiveContainer width="100%" height="100%">

              <AreaChart data={monthlyTrend}>

                <defs>

                  <linearGradient
                    id="attendance"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="0%"
                      stopColor="#16A34A"
                      stopOpacity={0.30}
                    />

                    <stop
                      offset="100%"
                      stopColor="#16A34A"
                      stopOpacity={0}
                    />

                  </linearGradient>

                </defs>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis domain={[95, 99]} />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#16A34A"
                  strokeWidth={3}
                  fill="url(#attendance)"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </div>
                {/* Department Comparison */}

        <div className="xl:col-span-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-bold text-gray-900">
            Department Comparison
          </h2>

          <p className="mt-2 text-gray-500">
            Attendance rate by department
          </p>

          <div className="mt-8 space-y-6">

            {[
              { name: "Sci & Math", value: 98, color: "bg-green-600" },
              { name: "Languages", value: 97, color: "bg-blue-600" },
              { name: "Humanities", value: 95, color: "bg-orange-500" },
              { name: "Islamic", value: 99, color: "bg-violet-500" },
              { name: "Arts", value: 96, color: "bg-pink-500" },
              { name: "Phys Ed", value: 97.5, color: "bg-cyan-500" },
            ].map((dept) => (

              <div
                key={dept.name}
                className="grid grid-cols-[90px_1fr_40px] items-center gap-4"
              >

                {/* Department */}
                <span className="text-sm text-gray-600">
                  {dept.name}
                </span>

                {/* Progress */}
                <div className="h-5 rounded-full bg-gray-100">

                  <div
                    className={`h-5 rounded-full ${dept.color}`}
                    style={{
                      width: `${dept.value}%`,
                    }}
                  />

                </div>

                {/* Value */}
                <span className="text-sm font-semibold text-gray-700">
                  {dept.value}
                </span>

              </div>

            ))}

          </div>

        </div>

      </div>
            {/* Bottom Charts */}
      <div className="grid gap-6 xl:grid-cols-12">

        {/* Attendance Distribution */}
        <div className="xl:col-span-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Attendance Distribution
          </h2>

          <p className="mt-1 text-gray-500">
            Overall status breakdown
          </p>

          <div className="mt-6 h-[250px]">

            <ResponsiveContainer>

              <ChartPie>

                <Pie
                  data={attendanceDistribution}
                  dataKey="value"
                  outerRadius={80}
                >
                  {attendanceDistribution.map((item) => (
                    <Cell
                      key={item.name}
                      fill={item.color}
                    />
                  ))}
                </Pie>

                <Tooltip />

              </ChartPie>

            </ResponsiveContainer>

          </div>

        </div>

        {/* Late Arrival Trend */}
        <div className="xl:col-span-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Late Arrival Trend
          </h2>

          <p className="mt-1 text-gray-500">
            Monthly late arrivals count
          </p>

          <div className="mt-6 h-[250px]">

            <ResponsiveContainer>

              <LineChart data={lateTrend}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#F59E0B"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* Leave Distribution */}
        <div className="xl:col-span-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Leave Distribution
          </h2>

          <p className="mt-1 text-gray-500">
            Types of leave taken
          </p>

          <div className="mt-8 space-y-5">

            {[
              ["Sick Leave",38,"bg-red-500"],
              ["Annual Leave",28,"bg-blue-500"],
              ["Emergency",18,"bg-orange-500"],
              ["Study Leave",10,"bg-purple-500"],
              ["Other",6,"bg-gray-500"],
            ].map(([name,value,color])=>(
              <div key={String(name)}>

                <div className="mb-2 flex justify-between text-sm">

                  <span>{name}</span>

                  <span>{value}%</span>

                </div>

                <div className="h-2 rounded-full bg-gray-200">

                  <div
                    className={`h-2 rounded-full ${color}`}
                    style={{
                      width:`${value}%`
                    }}
                  />

                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

      {/* Weekly Pattern */}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-bold">
          Weekly Attendance Pattern
        </h2>

        <p className="mt-1 text-gray-500">
          Average attendance rate by day of week
        </p>

        <div className="mt-8 h-[320px]">

          <ResponsiveContainer>

            <BarChart data={weeklyPattern}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="day" />

              <YAxis domain={[85,100]} />

              <Tooltip />

              <Bar
                dataKey="value"
                fill="#16A34A"
                radius={[6,6,0,0]}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}