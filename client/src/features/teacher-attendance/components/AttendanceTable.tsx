import { Eye, CheckCircle, XCircle, Clock, CalendarX } from '@phosphor-icons/react';
import { useState } from "react";
import TeacherAttendanceDetailModal from "./TeacherAttendanceDetailModal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
interface TeacherAttendance {
  id: number;
  staffId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: "Present" | "Absent" | "Late" | "Leave" | "unmarked";
}

const teachers: TeacherAttendance[] = [
  {
    id: 1,
    staffId: "EMP-T-001",
    name: "Dr. Hassan Ahmed Ali",
    email: "hassan@sms.edu",
    department: "Science",
    designation: "Senior Teacher",
    status: "Present",
  },
  {
    id: 2,
    staffId: "EMP-T-002",
    name: "Amina Yusuf",
    email: "amina@sms.edu",
    department: "Mathematics",
    designation: "Teacher",
    status: "Late",
  },
  {
    id: 3,
    staffId: "EMP-T-003",
    name: "Mohamed Noor",
    email: "mohamed@sms.edu",
    department: "ICT",
    designation: "Teacher",
    status: "Absent",
  },
  {
    id: 4,
    staffId: "EMP-T-004",
    name: "Fatima Ali",
    email: "fatima@sms.edu",
    department: "Languages",
    designation: "Assistant Teacher",
    status: "Leave",
  },
  {
    id: 5,
    staffId: "EMP-T-004",
    name: "asma ahmed",
    email: "asma@sms.edu",
    department: "Languages",
    designation: "Assistant Teacher",
    status: "unmarked",
  },
];


const getStatusBadge = (status: "Present" | "Absent" | "Late" | "Leave" | "unmarked") => {
  switch (status) {
    case "Present":
      return (
        <span className="inline-flex h-6 items-center rounded-full bg-green-100 px-3 text-xs font-semibold text-green-700">
          Present
        </span>
      );

   case "Absent":
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-red-100 px-3 text-xs font-semibold text-red-700">
      Absent
    </span>
  );

    case "Late":
      return (
        <span className="inline-flex h-6 items-center rounded-full bg-yellow-100 px-3 text-xs font-semibold text-yellow-700">
          Late
        </span>
      );

    case "Leave":
      return (
        <span className="inline-flex h-6 items-center rounded-full bg-purple-100 px-3 text-xs font-semibold text-purple-700">
          Leave
        </span>
      );
    case "unmarked":
      return (
        <span className="inline-flex h-6 items-center rounded-full bg-gray-100 px-3 text-xs font-semibold text-gray-700">
          Unmarked
        </span>
      );
  }
};

export default function AttendanceTable() {
  const [selectedTeacher, setSelectedTeacher] =
  useState<TeacherAttendance | null>(null);

const [showModal, setShowModal] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-normal font-semibold leading-tight text-gray-900">
              All Teachers â€” Monday, June 8, 2026
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              1 teacher not yet marked
            </p>
          </div>

          <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
            1 Unmarked
          </span>
        </div>
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="border-b border-gray-200">
              <TableHead className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Staff ID
              </TableHead>

              <TableHead className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Teacher
              </TableHead>

              <TableHead className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Department
              </TableHead>

              <TableHead className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Designation
              </TableHead>

              <TableHead className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </TableHead>

              <TableHead className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Mark Attendance
              </TableHead>

              <TableHead className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100">
            {teachers.map((teacher) => (
              <TableRow
                key={teacher.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Staff ID */}
                <TableCell className="px-6 py-3 whitespace-nowrap">
  <span className="font-semibold text-gray-900">
    {teacher.staffId}
  </span>
</TableCell>

                {/* Teacher */}
                <TableCell className="px-6 py-3">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700 text-sm">
                      {teacher.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">
                        {teacher.name}
                      </h3>

                      <p className="text-xs text-gray-500 truncate max-w-[170px]">
                        {teacher.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Department */}
                <TableCell className="px-6 py-3 text-gray-700 whitespace-nowrap">
                  {teacher.department}
                </TableCell>

                {/* Designation */}
                <TableCell className="px-6 py-3 text-gray-700 whitespace-nowrap">
                  {teacher.designation}
                </TableCell>

                {/* Status */}
                <TableCell className="px-6 py-3">{getStatusBadge(teacher.status)}</TableCell>

                {/* Attendance Actions */}
                <TableCell className="px-6 py-3">
                  <div className="flex justify-center gap-2">
                    <Button variant="plain"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                      title="Present"
                    >
                      <CheckCircle size={18} />
                    </Button>

                    <Button variant="plain"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      title="Absent"
                    >
                      <XCircle size={18} />
                    </Button>

                    <Button variant="plain"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                      title="Late"
                    >
                      <Clock size={18} />
                    </Button>

                    <Button variant="plain"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200"
                      title="Leave"
                    >
                      <CalendarX size={18} />
                    </Button>
                  </div>
                </TableCell>

                {/* View */}
                <TableCell className="px-6 py-3 text-center">
                  <Button variant="plain"
  onClick={() => {
    setSelectedTeacher(teacher);
    setShowModal(true);
  }}
  className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200"
>
  <Eye size={18} />
</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {showModal && selectedTeacher && (
  <TeacherAttendanceDetailModal
    teacher={selectedTeacher}
    onClose={() => setShowModal(false)}
  />
)}
    </div>
  );
}