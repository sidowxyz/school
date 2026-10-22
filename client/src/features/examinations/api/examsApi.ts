import api from "../../../lib/axios";
import type {
  Exam,
  CreateExamFormData,
  CreateBulkExamFormData,
  UpdateExamFormData,
  ExamTimetableResult,
} from "../types";

export interface ExamListResult {
  total: number;
  page: number;
  limit: number;
  exams: Exam[];
}

export interface ExamListParams {
  ex_name?: string;
  class_id?: string;
  subject_id?: string;
  exam_type?: string;
  exam_period_id?: string;
  term_id?: string;
  academic_year_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// Thrown for a 409 from create/update: the exam clashes with exams already
// scheduled for the same class. Callers can show the clashes and retry with
// `allowConflicts` when staff decide to schedule it anyway.
export class ScheduleConflictError extends Error {
  conflicts: Exam[];

  constructor(message: string, conflicts: Exam[]) {
    super(message);
    this.name = "ScheduleConflictError";
    this.conflicts = conflicts;
  }
}

type ConflictResponse = {
  response?: { status?: number; data?: { message?: string; conflicts?: Exam[] } };
};

const rethrowConflicts = (err: unknown): never => {
  const res = (err as ConflictResponse)?.response;
  if (res?.status === 409) {
    throw new ScheduleConflictError(
      res.data?.message ?? "This examination clashes with an already scheduled examination",
      res.data?.conflicts ?? []
    );
  }
  throw err;
};

const conflictParams = (allowConflicts?: boolean) =>
  allowConflicts ? { allowConflicts: "true" } : undefined;

export const examsApi = {
  getAll: async (params?: ExamListParams): Promise<ExamListResult> =>
    (await api.get("/exams", { params })).data.data,

  getById: async (id: string): Promise<Exam> =>
    (await api.get(`/exams/${id}`)).data.data,

  // Date-ordered rows for the timetable views, plus the ids of rows that clash.
  getTimetable: async (params?: {
    exam_period_id?: string;
    class_id?: string;
    subject_id?: string;
    from?: string;
    to?: string;
  }): Promise<ExamTimetableResult> =>
    (await api.get("/exams/timetable", { params })).data.data,

  create: async (data: CreateExamFormData, allowConflicts?: boolean): Promise<Exam> =>
    (await api
      .post("/exams", data, { params: conflictParams(allowConflicts) })
      .catch(rethrowConflicts)).data.data,

  // Creates one Exam per class_id, sharing a batch_id — the "one exam
  // across multiple grades" flow.
  createBulk: async (data: CreateBulkExamFormData, allowConflicts?: boolean): Promise<Exam[]> =>
    (await api
      .post("/exams/bulk", data, { params: conflictParams(allowConflicts) })
      .catch(rethrowConflicts)).data.data,

  update: async (id: string, data: UpdateExamFormData, allowConflicts?: boolean): Promise<Exam> =>
    (await api
      .put(`/exams/${id}`, data, { params: conflictParams(allowConflicts) })
      .catch(rethrowConflicts)).data.data,

  delete: (id: string) => api.delete(`/exams/${id}`),
};
