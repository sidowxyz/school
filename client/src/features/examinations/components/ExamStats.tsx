import { FileText, CalendarBlank, Clock, CheckCircle } from '@phosphor-icons/react';

import type { Exam } from "../types";
import { deriveExamStatus } from "../utils/examStatus";
import StatStrip from "@/components/shared/StatStrip";

type Props = {
  exams: Exam[];
};

export default function ExamStats({ exams }: Props) {
  const counts = exams.reduce(
    (acc, exam) => {
      acc[deriveExamStatus(exam)] += 1;
      return acc;
    },
    { scheduled: 0, ongoing: 0, completed: 0 }
  );

  return (
    <StatStrip
      items={[
        { label: "Total exams", value: exams.length, icon: FileText, tone: "sky", hint: "Configured exams" },
        { label: "Scheduled", value: counts.scheduled, icon: CalendarBlank, tone: "violet", hint: "Upcoming assessments" },
        { label: "Ongoing", value: counts.ongoing, icon: Clock, tone: "amber", hint: "In progress today" },
        { label: "Completed", value: counts.completed, icon: CheckCircle, tone: "emerald", hint: "Graded & submitted" },
      ]}
    />
  );
}