import { useEffect, useMemo, useState } from 'react';
import { WarningCircle, CheckCircle, SpinnerGap, FloppyDisk } from '@phosphor-icons/react';
import type { TeacherAssignment } from '@/features/teachers/types';
import {
  ATTENDANCE_STATUSES,
  attendanceService,
  type AttendanceStatusName,
  type Student,
} from '@/services/attendance.service';
import {
  Select,
  teachingSessionLabel,
  teachingSessionsForDate,
  weekdayForDate,
} from './portalData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

type MarkedRecord = { status: AttendanceStatusName | null; remarks: string };

export default function AttendanceTab({
  assignments,
  assignmentsLoading = false,
  readOnly = false,
}: {
  assignments: TeacherAssignment[];
  assignmentsLoading?: boolean;
  readOnly?: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionKey, setSessionKey] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, MarkedRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sessions = useMemo(() => teachingSessionsForDate(assignments, date), [assignments, date]);
  const selectedSession = sessions.find((session) => session.key === sessionKey);

  useEffect(() => {
    if (!sessions.some((session) => session.key === sessionKey)) {
      setSessionKey('');
      setStudents([]);
      setMarks({});
    }
  }, [sessionKey, sessions]);

  useEffect(() => {
    if (!selectedSession) return;
    let cancelled = false;

    async function loadRegister() {
      setLoading(true);
      setMessage(null);
      try {
        const assignment = selectedSession!.assignment;
        const [roster, existing] = await Promise.all([
          attendanceService.getEnrolledStudents(assignment.classId._id, assignment.sectionId._id),
          attendanceService.getStudentAttendance({
            classId: assignment.classId._id,
            sectionId: assignment.sectionId._id,
            periodId: selectedSession!.periodId,
            date,
            limit: 200,
          }),
        ]);
        if (cancelled) return;

        const existingByStudent = new Map(existing.map((record) => {
          const studentId = typeof record.studentId === 'string' ? record.studentId : record.studentId._id;
          return [studentId, record] as const;
        }));
        setStudents(roster);
        setMarks(Object.fromEntries(roster.map((student) => {
          const record = existingByStudent.get(student._id);
          return [student._id, {
            status: record?.status || (readOnly ? null : 'Present'),
            remarks: record?.remarks || '',
          }];
        })));
      } catch (error: any) {
        if (cancelled) return;
        setStudents([]);
        setMarks({});
        setMessage({
          type: 'error',
          text: error?.response?.data?.message || 'Unable to load the attendance register.',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRegister();
    return () => { cancelled = true; };
  }, [date, readOnly, selectedSession?.key]);

  const updateStatus = (studentId: string, status: AttendanceStatusName) => {
    setMarks((current) => ({
      ...current,
      [studentId]: { status, remarks: current[studentId]?.remarks || '' },
    }));
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setMarks((current) => ({
      ...current,
      [studentId]: { status: current[studentId]?.status || 'Present', remarks },
    }));
  };

  const saveAttendance = async () => {
    if (!selectedSession || students.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await attendanceService.saveStudentAttendance({
        periodId: selectedSession.periodId,
        att_date: date,
        attendance: students.map((student) => ({
          studentId: student._id,
          status: marks[student._id]?.status || 'Present',
          remarks: marks[student._id]?.remarks || undefined,
        })),
      });
      setMessage({ type: 'success', text: 'Attendance saved successfully.' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to FloppyDisk attendance.',
      });
    } finally {
      setSaving(false);
    }
  };

  const counts = ATTENDANCE_STATUSES.reduce<Record<AttendanceStatusName, number>>(
    (result, status) => {
      result[status] = Object.values(marks).Funnel((mark) => mark.status === status).length;
      return result;
    },
    { Present: 0, Absent: 0, Late: 0, Excused: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Mark Attendance</h2>
            <p className="text-sm text-gray-400 mb-4">
              Only your scheduled periods from Academic Structure are available.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lesson Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
              <Select
                label="Scheduled Period"
                value={sessionKey}
                onChange={setSessionKey}
                placeholder={assignmentsLoading ? 'Loading your timetable...' : `Choose a ${weekdayForDate(date)} session`}
                disabled={assignmentsLoading || sessions.length === 0}
                options={sessions.map((session) => ({
                  value: session.key,
                  label: teachingSessionLabel(session),
                }))}
              />
            </div>
            {!assignmentsLoading && sessions.length === 0 && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                No assigned teaching period is scheduled for {weekdayForDate(date) || 'this date'}.
              </p>
            )}
          </div>
          {!readOnly && (
            <Button variant="plain"
              onClick={saveAttendance}
              disabled={!selectedSession || students.length === 0 || loading || saving}
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              {saving ? <SpinnerGap size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={17} /> : <WarningCircle size={17} />}
          {message.text}
        </div>
      )}

      {selectedSession && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Summary label="Students" value={students.length} color="text-gray-900" />
          <Summary label="Present" value={counts.Present} color="text-green-600" />
          <Summary label="Absent" value={counts.Absent} color="text-red-600" />
          <Summary label="Late" value={counts.Late} color="text-orange-500" />
          <Summary label="Excused" value={counts.Excused} color="text-sky-600" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Class Register</h2>
          <p className="text-sm text-gray-400">
            {selectedSession ? teachingSessionLabel(selectedSession) : 'Select a scheduled period to load the real class roster.'}
          </p>
        </div>

        {loading ? (
          <div className="py-14 flex flex-col items-center gap-2 text-sm text-gray-400">
            <SpinnerGap size={28} className="animate-spin text-green-600" />
            Loading enrolled students and existing attendance...
          </div>
        ) : !selectedSession ? (
          <div className="py-14 text-center text-sm text-gray-400">No period selected.</div>
        ) : students.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">No active students are enrolled in this class and section.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[820px]">
              <TableHeader className="bg-gray-50/70">
                <TableRow>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Admission No.</TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Student</TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Attendance Status</TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id} className="border-t border-gray-100">
                    <TableCell className="px-5 py-3 text-sm text-gray-500">{student.admissionNumber}</TableCell>
                    <TableCell className="px-5 py-3 text-sm font-medium text-gray-900">{student.firstName} {student.lastName}</TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ATTENDANCE_STATUSES.map((status) => {
                          const active = marks[student._id]?.status === status;
                          return (
                            <Button variant="plain"
                              key={status}
                              type="button"
                              disabled={readOnly}
                              onClick={() => updateStatus(student._id, status)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:cursor-default ${
                                active
                                  ? 'bg-green-600 border-green-600 text-white'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                              }`}
                            >
                              {status}
                            </Button>
                          );
                        })}
                        {readOnly && !marks[student._id]?.status && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 bg-gray-50 text-gray-500">
                            Not recorded
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <Input
                        value={marks[student._id]?.remarks || ''}
                        disabled={readOnly}
                        onChange={(event) => updateRemarks(student._id, event.target.value)}
                        placeholder="Optional note"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
