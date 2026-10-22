import {
  CalendarBlank,
  MagnifyingGlass,
  DownloadSimple,
  FloppyDisk,
  ClipboardText,
} from '@phosphor-icons/react';
import { useState } from "react";
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

export default function AttendanceFilters() {
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          {/* Date */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date
            </label>

            <div className="relative">
              <CalendarBlank
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <Input
                type="date"
                className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Department */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Department
            </label>

            <NativeSelect className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-green-500">
              <option>All Departments</option>
              <option>Science</option>
              <option>Mathematics</option>
              <option>Languages</option>
              <option>ICT</option>
            </NativeSelect>
          </div>

          {/* Designation */}
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Designation
            </label>

            <NativeSelect className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-green-500">
              <option>All Designations</option>
              <option>Senior Teacher</option>
              <option>Teacher</option>
              <option>Assistant Teacher</option>
            </NativeSelect>
          </div>

          {/* MagnifyingGlass */}
          <div className="xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              MagnifyingGlass Teacher
            </label>

            <div className="relative">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <Input
                type="text"
                placeholder="Search by name or staff ID..."
                className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Export */}
          <div className="xl:col-span-1 flex items-end">
            <Button variant="plain" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 transition hover:bg-gray-50">
              <DownloadSimple size={18} />
              Export
            </Button>
          </div>

          {/* FloppyDisk */}
          <div className="xl:col-span-2 flex items-end">
            <Button variant="plain"
              onClick={() => {
                setShowSuccess(true);

                setTimeout(() => {
                  setShowSuccess(false);
                }, 3000);
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-white transition hover:bg-green-700"
            >
              <FloppyDisk size={18} />
              FloppyDisk Attendance
            </Button>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center school-overlay">
          <div className="w-[420px] rounded-lg bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <ClipboardText className="h-8 w-8 text-green-600" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              Attendance Saved
            </h2>

            <p className="mt-2 text-gray-500">
              Teacher attendance has been saved successfully.
            </p>

            <Button variant="plain"
              onClick={() => setShowSuccess(false)}
              className="mt-6 h-11 w-full rounded-lg bg-green-600 font-semibold text-white hover:bg-green-700"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  );
}