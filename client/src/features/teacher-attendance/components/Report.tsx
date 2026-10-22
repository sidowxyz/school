import {
  Users,
  ChartBar,
  Trophy,
  TrendDown,
  CheckCircle,
  XCircle,
  Clock,
  CalendarX,
  DownloadSimple,
  FileText,
  Printer,
  Star,
WarningCircle,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const reportData = [
  {
    id: 1,
    teacher: "Dr. Hassan Ahmed Ali",
    department: "Science & Mathematics",
    present: 5,
    absent: 2,
    late: 3,
    leave: 2,
    attendance: "95.7%",
  },
  {
    id: 2,
    teacher: "Ms. Amina Yusuf Mohamed",
    department: "Languages",
    present: 6,
    absent: 1,
    late: 2,
    leave: 2,
    attendance: "97.4%",
  },
  {
    id: 3,
    teacher: "Mr. Omar Hassan Aden",
    department: "Science & Mathematics",
    present: 4,
    absent: 3,
    late: 5,
    leave: 2,
    attendance: "94.8%",
  },
  {
    id: 4,
    teacher: "Ms. Fatima Ali Abdi",
    department: "Science & Mathematics",
    present: 7,
    absent: 1,
    late: 2,
    leave: 3,
    attendance: "96.5%",
  },
];

export default function Reports() {
  const bestTeacher = [...reportData].sort(
  (a, b) =>
    parseFloat(b.attendance) -
    parseFloat(a.attendance)
)[0];

const lowestTeacher = [...reportData].sort(
  (a, b) =>
    parseFloat(a.attendance) -
    parseFloat(b.attendance)
)[0];

const averageAttendance =
  (
    reportData.reduce(
      (sum, teacher) =>
        sum + parseFloat(teacher.attendance),
      0
    ) / reportData.length
  ).toFixed(1);
  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Teachers
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                12
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
              <Users size={28} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Average Attendance
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                96.8%
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-50">
              <ChartBar size={28} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Highest Dept
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Islamic Studies
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
              <Trophy size={28} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Lowest Dept
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Humanities
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50">
              <TrendDown size={28} className="text-orange-500" />
            </div>
          </div>
        </div>

      </div>
            {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">

          {/* From Date */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              From Date
            </label>

            <Input
              type="date"
              defaultValue="2026-01-01"
              className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* To Date */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              To Date
            </label>

            <Input
              type="date"
              defaultValue="2026-06-30"
              className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Academic Year */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Academic Year
            </label>

            <NativeSelect className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500">
              <option>2025â€“2026</option>
              <option>2024â€“2025</option>
            </NativeSelect>
          </div>

          {/* Department */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Department
            </label>

            <NativeSelect className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500">
              <option>All Departments</option>
              <option>Science</option>
              <option>Mathematics</option>
              <option>Languages</option>
              <option>ICT</option>
            </NativeSelect>
          </div>

          {/* Status */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>

            <NativeSelect className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500">
              <option>All Status</option>
              <option>Present</option>
              <option>Absent</option>
              <option>Late</option>
              <option>Leave</option>
            </NativeSelect>
          </div>

          {/* Export Buttons */}
          <div className="xl:col-span-2 flex items-end justify-end gap-2">

            <Button variant="plain" className="flex h-11 min-w-[90px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 transition hover:bg-gray-50">
              <DownloadSimple size={18} />
              PDF
            </Button>

            <Button variant="plain" className="flex h-11 min-w-[90px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 transition hover:bg-gray-50">
              <FileText size={18} />
              Excel
            </Button>

            <Button variant="plain" className="flex h-11 min-w-[90px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 transition hover:bg-gray-50">
              <Printer size={18} />
              Print
            </Button>

          </div>

        </div>
      </div>
            {/* Report Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Teacher Attendance Report
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Attendance summary for the selected period.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-sm">

            <TableHeader className="bg-gray-50">
              <TableRow className="border-b border-gray-200">

                <TableHead className="px-6 py-3 text-left font-semibold text-gray-700">
                  Teacher
                </TableHead>

                <TableHead className="px-6 py-3 text-left font-semibold text-gray-700">
                  Department
                </TableHead>

                <TableHead className="px-6 py-3 text-center text-gray-700 font-semibold">
  <div className="flex flex-col items-center gap-1">
    <span>Present Days</span>
  
  </div>
</TableHead>

                <TableHead className="px-6 py-3 text-center font-semibold text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <span>Absent Days</span>
                  </div>
                </TableHead>

                <TableHead className="px-6 py-3 text-center font-semibold text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <span> Late Days</span>
                  
                  </div>
                </TableHead>

                <TableHead className="px-6 py-3 text-center font-semibold text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <span> Leave Days</span>
                    
                  </div>
                </TableHead>

                <TableHead className="px-6 py-3 text-center font-semibold text-gray-700">
                  Attendance rate
                </TableHead>

              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100">

              {reportData.map((teacher) => (
                <TableRow
                  key={teacher.id}
                  className="transition hover:bg-gray-50"
                >

                  {/* Teacher */}
                  <TableCell className="px-6 py-3">
                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                        {teacher.teacher
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">
                          {teacher.teacher}
                        </p>
                      </div>

                    </div>
                  </TableCell>

                  {/* Department */}
                  <TableCell className="whitespace-nowrap px-6 py-3 text-gray-700">
                    {teacher.department}
                  </TableCell>

                  {/* Present */}
                  {/* Present */}
<TableCell className="px-6 py-3">
  <div className="flex items-center justify-center gap-1 text-green-600 font-semibold">
    <CheckCircle size={15} />
    <span>{teacher.present}</span>
  </div>
</TableCell>

                  {/* Absent */}
                  <TableCell className="px-6 py-3">
  <div className="flex items-center justify-center gap-1 text-red-600 font-semibold">
    <XCircle size={15} />
    <span>{teacher.absent}</span>
  </div>
</TableCell>

                  {/* Late */}
                 <TableCell className="px-6 py-3">
  <div className="flex items-center justify-center gap-1 text-yellow-600 font-semibold">
    <Clock size={15} />
    <span>{teacher.late}</span>
  </div>
</TableCell>

                  {/* Leave */}
                  <TableCell className="px-6 py-3">
  <div className="flex items-center justify-center gap-1 text-sky-500 font-semibold">
    <CalendarX size={15} />
    <span>{teacher.leave}</span>
  </div>
</TableCell>

                  {/* Attendance */}
                  <TableCell className="px-6 py-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {teacher.attendance}
                    </span>
                  </TableCell>

                </TableRow>
              ))}

            </TableBody>

          </Table>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

     
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between">

    <div>

      <p className="text-gray-500 text-sm">
        Best Attendance
      </p>

      <h3 className="mt-2 text-xl font-bold text-gray-900">
        {bestTeacher.teacher}
      </h3>

      <p className="mt-1 text-lg font-semibold text-green-600">
        {bestTeacher.attendance}
      </p>

    </div>

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
      <Star className="text-green-600" size={30}/>
    </div>

  </div>
</div>
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between">

    <div>

      <p className="text-gray-500 text-sm">
        Needs Attention
      </p>

      <h3 className="mt-2 text-2xl font-bold text-gray-900">
        {lowestTeacher.teacher}
      </h3>

      <p className="mt-1 text-lg font-semibold text-orange-500">
        {lowestTeacher.attendance}
      </p>

    </div>

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
      <WarningCircle className="text-orange-500" size={30}/>
    </div>

  </div>
</div>
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between">

    <div>

      <p className="text-gray-500 text-sm">
        Buildings Average
      </p>

      <h3 className="mt-2 text-3xl font-bold text-gray-900">
        {averageAttendance}%
      </h3>

      <p className="text-gray-500">
        All departments
      </p>

    </div>

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
      <ChartBar className="text-green-600" size={30}/>
    </div>

  </div>
</div>
 </div>
    </div>
  );
}