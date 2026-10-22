export type TeachingLogStatus = 'draft' | 'completed';

export interface CreatorInfo {
  name: string;
  email: string;
}

export interface TeachingLog {
  _id: string;
  assignmentId?: string;
  periodId?: string;
  date: string;
  subject: string;
  classId: string;
  section: string;
  period: string; // e.g. "Period 1 (08:00 - 09:00)"
  topicTaught: string;
  lessonObjective: string;
  teachingSummary: string;
  learningOutcomes: string;
  studentParticipation: string;
  challengesFaced: string;
  extraNotes?: string;
  homeworkGiven?: string;
  submissionDeadline?: string;
  status: TeachingLogStatus;
  createdBy: CreatorInfo;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingLogFilters {
  teacherId?: string;
  search?: string;
  classId?: string;
  subject?: string;
  status?: TeachingLogStatus | '';
  date?: string;
}

export interface PaginatedLogs {
  logs: TeachingLog[];
  total: number;
  page: number;
  limit: number;
}
