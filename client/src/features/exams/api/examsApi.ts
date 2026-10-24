import api from '../../../lib/axios';
import type { ClassResults, ExamInput, ExamItem, Marksheet, MarkingOptions, ReportCardResponse } from '../types';

export interface SheetKey { classId: string; sectionId?: string | null; subjectId: string }

export const examsApi = {
  list: async (params: { termId?: string } = {}): Promise<ExamItem[]> => (await api.get('/exams', { params })).data.data,
  create: async (data: ExamInput) => (await api.post('/exams', data)).data.data,
  update: async (id: string, data: ExamInput) => (await api.put(`/exams/${id}`, data)).data.data,
  remove: (id: string) => api.delete(`/exams/${id}`),
  publish: async (id: string, published: boolean) => (await api.patch(`/exams/${id}/publish`, { published })).data,

  options: async (id: string): Promise<MarkingOptions> => (await api.get(`/exams/${id}/options`)).data.data,
  marksheet: async (id: string, key: SheetKey): Promise<Marksheet> =>
    (await api.get(`/exams/${id}/marksheet`, { params: { ...key, sectionId: key.sectionId || undefined } })).data.data,
  saveMarks: async (id: string, key: SheetKey, marks: { studentId: string; score: number | null; absent: boolean; remark: string }[]) =>
    (await api.put(`/exams/${id}/marks`, { ...key, sectionId: key.sectionId || null, marks })).data,

  results: async (params: { termId: string; classId: string; sectionId?: string }): Promise<ClassResults> =>
    (await api.get('/exams/results', { params: { ...params, sectionId: params.sectionId || undefined } })).data.data,
  reportCard: async (studentId: string, termId?: string): Promise<ReportCardResponse> =>
    (await api.get(`/exams/report-card/${studentId}`, { params: { termId } })).data.data,

  // Portals: a student's own results, or a staff member viewing that portal.
  studentPortalResults: async (studentId?: string, termId?: string): Promise<ReportCardResponse> =>
    (await api.get(studentId ? `/portal/student/${studentId}/results` : '/portal/student/results', { params: { termId } })).data.data,
  parentPortalResults: async (studentId: string, guardianId?: string, termId?: string): Promise<ReportCardResponse> =>
    (await api.get(guardianId ? `/portal/parent/${guardianId}/children/${studentId}/results` : `/portal/parent/children/${studentId}/results`, { params: { termId } })).data.data,
};

export const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
