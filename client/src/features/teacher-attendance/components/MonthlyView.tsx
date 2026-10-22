import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  XCircle,
  Clock,
  CalendarX,
  DownloadSimple,
} from '@phosphor-icons/react';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

const weekDays = ["Sat", "Sun", "Tue", "Wed", "Fri", "Thu", "Fri"];

const calendar = [
  { day: 1, status: "P" },
  { day: 2, status: "P" },
  { day: 3, status: "P" },
  { day: 4, status: "P" },
  { day: 5, status: "P" },
  { day: 6, status: "" },
  { day: 7, status: "" },

  { day: 8, status: "P" },
  { day: 9, status: "P" },
  { day: 10, status: "P" },
  { day: 11, status: "L" },
  { day: 12, status: "P" },
  { day: 13, status: "" },
  { day: 14, status: "" },

  { day: 15, status: "P" },
  { day: 16, status: "P" },
  { day: 17, status: "P" },
  { day: 18, status: "A" },
  { day: 19, status: "P" },
  { day: 20, status: "" },
  { day: 21, status: "" },

  { day: 22, status: "P" },
  { day: 23, status: "P" },
  { day: 24, status: "LV" },
  { day: 25, status: "P" },
  { day: 26, status: "P" },
  { day: 27, status: "" },
  { day: 28, status: "" },

  { day: 29, status: "P" },
  { day: 30, status: "P" },
];

const getColor = (status: string) => {
  switch (status) {
    case "P":
      return "bg-green-100 border-green-200";

    case "A":
      return "bg-red-100 border-red-200";

    case "L":
      return "bg-yellow-100 border-yellow-200";

    case "LV":
      return "bg-blue-100 border-blue-200";

    default:
      return "bg-gray-50 border-gray-200";
  }
};

export default function MonthlyView() {
  return (
    <div className="grid gap-6 xl:grid-cols-12">

      {/* Calendar */}
      <div className="xl:col-span-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="flex items-start justify-between">

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              June 2026
            </h2>

            <p className="mt-1 text-gray-500">
              Individual teacher attendance calendar
            </p>
          </div>

          <div className="flex items-center gap-3">

            <NativeSelect className="rounded-xl border border-gray-300 px-4 py-3 outline-none">
              <option>Dr. Hassan Ahmed Ali</option>
              <option>Amina Yusuf</option>
              <option>Mohamed Noor</option>
            </NativeSelect>

            <Button variant="plain" className="rounded-xl border p-3 hover:bg-gray-50">
              <CaretLeft size={18} />
            </Button>

            <Button variant="plain" className="rounded-xl border p-3 hover:bg-gray-50">
              <CaretRight size={18} />
            </Button>

          </div>

        </div>

        {/* Legend */}

        <div className="mt-8 flex flex-wrap gap-5 text-sm">

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-green-500"></span>
            P - Present
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-red-500"></span>
            A - Absent
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-yellow-500"></span>
            L - Late
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-500"></span>
            LV - Leave
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-gray-300"></span>
            Weekend
          </div>

        </div>

        {/* Week Days */}

        <div className="mt-8 grid grid-cols-7 gap-2">

          {weekDays.map((day) => (
            <div
              key={day}
              className="pb-2 text-center font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}

          {calendar.map((item) => (
            <div
              key={item.day}
              className={`rounded-xl border p-4 text-center ${getColor(
                item.status
              )}`}
            >
              <div className="text-xs text-gray-500">
                {item.day}
              </div>

              <div className="mt-1 font-bold text-gray-800">
                {item.status}
              </div>
            </div>
          ))}
        </div>

      </div>
            {/* Right Side */}
      <div className="xl:col-span-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-2xl font-bold text-gray-900">
          Month Summary
        </h2>

        <p className="mt-1 text-gray-500">
          June 2026
        </p>

        {/* Summary Cards */}
        <div className="mt-8 space-y-4">

          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-5">
            <div className="flex items-center gap-3">
              <CalendarBlank className="text-gray-500" size={20} />
              <span className="font-medium">Working Days</span>
            </div>

            <span className="text-3xl font-bold text-gray-900">
              22
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <span className="font-medium text-green-700">
                Days Present
              </span>
            </div>

            <span className="text-3xl font-bold text-green-600">
              20
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <XCircle className="text-red-600" size={20} />
              <span className="font-medium text-red-700">
                Days Absent
              </span>
            </div>

            <span className="text-3xl font-bold text-red-600">
              1
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-yellow-50 p-5">
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-600" size={20} />
              <span className="font-medium text-yellow-700">
                Late Arrivals
              </span>
            </div>

            <span className="text-3xl font-bold text-yellow-600">
              1
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-blue-50 p-5">
            <div className="flex items-center gap-3">
              <CalendarX className="text-blue-600" size={20} />
              <span className="font-medium text-blue-700">
                Leave Days
              </span>
            </div>

            <span className="text-3xl font-bold text-blue-600">
              0
            </span>
          </div>

        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-200"></div>

        {/* Attendance Rate */}
        <div>

          <div className="mb-3 flex items-center justify-between">

            <h3 className="text-xl font-semibold text-gray-900">
              Attendance Rate
            </h3>

            <span className="text-4xl font-bold text-green-600">
              95.5%
            </span>

          </div>

          <div className="h-3 rounded-full bg-gray-200">
            <div className="h-3 w-[95.5%] rounded-full bg-green-600"></div>
          </div>

        </div>

        {/* DownloadSimple */}
        <Button variant="plain" className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-4 font-semibold transition hover:bg-gray-50">
          <DownloadSimple size={20} />
          DownloadSimple Monthly Report
        </Button>

      </div>

    </div>
  );
}