import api from "../../../lib/axios";
import type { ExamPeriod, ExamPeriodFormData } from "../types";

export const examPeriodsApi = {
  getAll: async (params?: { status?: string; academic_year_id?: string; term_id?: string }): Promise<ExamPeriod[]> =>
    (await api.get("/exam-periods", { params })).data.data,

  getById: async (id: string): Promise<ExamPeriod> =>
    (await api.get(`/exam-periods/${id}`)).data.data,

  create: async (data: ExamPeriodFormData): Promise<ExamPeriod> =>
    (await api.post("/exam-periods", data)).data.data,

  update: async (id: string, data: Partial<ExamPeriodFormData>): Promise<ExamPeriod> =>
    (await api.put(`/exam-periods/${id}`, data)).data.data,

  delete: (id: string) => api.delete(`/exam-periods/${id}`),

  // Makes the period's timetable available to teachers, students and parents.
  // Rejected (400) when the period is empty or holds out-of-range exams.
  publish: async (id: string): Promise<ExamPeriod> =>
    (await api.post(`/exam-periods/${id}/publish`)).data.data,

  unpublish: async (id: string): Promise<ExamPeriod> =>
    (await api.post(`/exam-periods/${id}/unpublish`)).data.data,
};
