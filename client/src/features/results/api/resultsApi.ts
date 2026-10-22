import api from '../../../lib/axios';
import type {
  ClassResults,
  MarkSubmission,
  ResultAnalytics,
  SaveSubmissionPayload,
  StudentResultsPayload,
} from '../types';

/**
 * Marks entry and published results, backed by real records:
 * /api/exam-marks   — the teacher's sheet and the review workflow
 * /api/exam-results — aggregated, ranked results and dashboard analytics
 */
export const resultsApi = {
  /**
   * The marks sheet for one exam/class/subject. When no marks have been
   * entered yet the server returns a blank sheet built from the live class
   * roster (id === null), so the table is never empty for a real class.
   */
  getSubmission: async (params: {
    exam_id: string;
    class_id: string;
    subject_id: string;
    section_id?: string;
  }): Promise<MarkSubmission> => (await api.get('/exam-marks/for', { params })).data.data,

  listSubmissions: async (params?: {
    status?: string;
    exam_id?: string;
    class_id?: string;
    subject_id?: string;
  }): Promise<MarkSubmission[]> => (await api.get('/exam-marks', { params })).data.data,

  save: async (payload: SaveSubmissionPayload): Promise<MarkSubmission> =>
    (await api.put('/exam-marks', payload)).data.data,

  approve: async (id: string): Promise<MarkSubmission> =>
    (await api.post(`/exam-marks/${id}/approve`)).data.data,

  return: async (id: string, reason: string): Promise<MarkSubmission> =>
    (await api.post(`/exam-marks/${id}/return`, { reason })).data.data,

  publish: async (id: string): Promise<MarkSubmission> =>
    (await api.post(`/exam-marks/${id}/publish`)).data.data,

  publishAllApproved: async (scope?: { exam_id?: string; class_id?: string }): Promise<{ published: number }> =>
    (await api.post('/exam-marks/publish-all', scope ?? {})).data.data,

  getClassResults: async (params: { exam_id?: string; batch_id?: string; class_id?: string }): Promise<ClassResults> =>
    (await api.get('/exam-results', { params })).data.data,

  getAnalytics: async (params: { exam_id?: string; class_id?: string }): Promise<ResultAnalytics> =>
    (await api.get('/exam-results/analytics', { params })).data.data,

  getStudentResults: async (studentId: string): Promise<StudentResultsPayload> =>
    (await api.get(`/exam-results/student/${studentId}`)).data.data,
};
