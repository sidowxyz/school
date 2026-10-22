import api from '../../../lib/axios';
import type {
  Teacher,
  TeacherDetail,
  TeacherAssignment,
  CreateAssignmentPayload,
  CreateTeacherPayload,
  CreateTeacherResult,
} from '../types';

export const teachersApi = {
  getAll:  async (params?: unknown): Promise<Teacher[]> =>
    (await api.get('/teachers', { params })).data.data,
  getById: async (id: string): Promise<TeacherDetail> =>
    (await api.get(`/teachers/${id}`)).data.data,
  create:  async (data: CreateTeacherPayload): Promise<CreateTeacherResult> =>
    (await api.post('/teachers', data)).data.data,
  update:  (id: string, data: unknown) => api.put(`/teachers/${id}`, data),

  addAssignment:    async (teacherId: string, data: CreateAssignmentPayload): Promise<TeacherAssignment> =>
    (await api.post(`/teachers/${teacherId}/assignments`, data)).data.data,
  updateAssignment: async (teacherId: string, assignmentId: string, data: CreateAssignmentPayload): Promise<TeacherAssignment> =>
    (await api.put(`/teachers/${teacherId}/assignments/${assignmentId}`, data)).data.data,
  removeAssignment: (teacherId: string, assignmentId: string) =>
    api.delete(`/teachers/${teacherId}/assignments/${assignmentId}`),
  getTimetable:     async (teacherId: string): Promise<TeacherAssignment[]> =>
    (await api.get(`/teachers/${teacherId}/timetable`)).data.data,
  // Every assignment across every teacher, teacher name attached — used to
  // resolve "who teaches this class/subject/section/term" from the outside.
  getAllAssignments: async (): Promise<TeacherAssignment[]> =>
    (await api.get('/teacher-assignments')).data.data,
};
