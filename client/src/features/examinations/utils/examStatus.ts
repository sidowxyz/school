import type { Exam } from "../types";

// Nothing transitions Exam.status automatically once set, so it goes stale.
// Derive the live status from exam_date/start_time/end_time instead — this
// is the single source of truth used by both the stats cards and exam cards.
export type LiveExamStatus = "scheduled" | "ongoing" | "completed";

const atTime = (dateStr: string, timeStr: string | undefined): Date => {
  const date = new Date(dateStr);
  const [hours, minutes] = (timeStr ?? "").split(":").map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

// exam_date/start_time/end_time are required at creation, but records
// inserted outside the API (manual seeding, older data) can still lack
// them — fall back to "scheduled" rather than crashing the page.
export const deriveExamStatus = (exam: Exam, now: Date = new Date()): LiveExamStatus => {
  if (!exam.exam_date) return "scheduled";
  const start = atTime(exam.exam_date, exam.start_time);
  const end = atTime(exam.exam_date, exam.end_time);
  if (now < start) return "scheduled";
  if (now > end) return "completed";
  return "ongoing";
};
