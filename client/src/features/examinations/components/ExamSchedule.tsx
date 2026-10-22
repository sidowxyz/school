import { useEffect, useState } from "react";
import { Clock, BookOpen, User } from '@phosphor-icons/react';

import { teachersApi } from "../../teachers/api/teachersApi";
import type { TeacherAssignment } from "../../teachers/types";
import type { Exam } from "../types";
import { examDuration, formatDuration, formatTime } from "../utils/examDuration";

type Props = {
  exams: Exam[];
};

const refId = (value: string | { _id: string } | undefined): string =>
  typeof value === "object" && value !== null ? value._id : value ?? "";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const teacherName = (assignment: TeacherAssignment): string => {
  const teacher = assignment.teacherId;
  if (typeof teacher !== "object" || !teacher.userId) return "Unassigned";
  return `${teacher.userId.firstName} ${teacher.userId.lastName}`.trim() || "Unassigned";
};

export default function ExamSchedule({ exams }: Props) {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  useEffect(() => {
    teachersApi.getAllAssignments().then(setAssignments).catch(() => setAssignments([]));
  }, []);

  const resolveTeacher = (exam: Exam): string => {
    const match = assignments.find(
      (a) =>
        refId(a.classId) === refId(exam.class_id) &&
        refId(a.subjectId) === refId(exam.subject_id) &&
        (!exam.section_id || refId(a.sectionId) === refId(exam.section_id)) &&
        (!exam.term_id || refId(a.termId) === exam.term_id)
    );
    return match ? teacherName(match) : "Unassigned";
  };

  const sorted = [...exams].sort(
    (a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-900">Exam Schedule</h2>
      </div>

      {/* Schedule List */}
      {sorted.length === 0 ? (
        <p className="text-gray-500">No exams scheduled yet.</p>
      ) : (
        <div className="space-y-4">
          {sorted.map((exam) => {
            const date = new Date(exam.exam_date);
            const subjectName =
              typeof exam.subject_id === "object" ? exam.subject_id.sub_name : "â€”";
            const className =
              typeof exam.class_id === "object" ? exam.class_id.cl_name : exam.class_id;
            const sectionName =
              typeof exam.section_id === "object" ? exam.section_id.name : undefined;
            const examTypeName =
              typeof exam.exam_type === "object" ? exam.exam_type.type_name : exam.exam_type;

            return (
              <div
                key={exam._id}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-5">
                    {/* Date Box */}
                    <div className="w-16 h-16 rounded-xl bg-green-50 flex flex-col items-center justify-center">
                      <span className="text-xs text-green-600 font-medium">
                        {MONTHS[date.getMonth()]}
                      </span>
                      <span className="text-3xl font-bold text-green-600 leading-none">
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">
                        {exam.name}
                      </h3>

                      <p className="text-gray-500 mt-1">
                        {subjectName} â€¢ {className}
                        {sectionName ? ` - ${sectionName}` : ""}
                      </p>

                      <div className="flex flex-wrap gap-6 mt-4 text-gray-500 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          {formatTime(exam.start_time)} - {formatTime(exam.end_time)}
                          <span className="text-gray-400">
                            ({formatDuration(examDuration(exam))})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <BookOpen size={16} />
                          {examTypeName}
                        </div>

                        <div className="flex items-center gap-2">
                          <User size={16} />
                          {resolveTeacher(exam)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marks */}
                  <span className="px-3 py-1 text-sm rounded-full bg-green-50 text-green-600 font-medium">
                    {exam.total_marks} Marks
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}