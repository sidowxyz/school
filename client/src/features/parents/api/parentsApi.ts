import api from '../../../lib/axios';
import type {
  ParentDetail,
  ParentListResult,
  CreateParentPayload,
  CreateParentResult,
  UnassignedStudent,
  SiblingRule,
} from '../types';

export const parentsApi = {
  getAll:  async (params?: unknown): Promise<ParentListResult> =>
    (await api.get('/parents', { params })).data.data,
  getById: async (id: string): Promise<ParentDetail> =>
    (await api.get(`/parents/${id}`)).data.data,
  create:  async (data: CreateParentPayload): Promise<CreateParentResult> =>
    (await api.post('/parents', data)).data.data,
  update:  (id: string, data: Partial<CreateParentPayload>) => api.put(`/parents/${id}`, data),
  remove:  (id: string) => api.delete(`/parents/${id}`),

  assignStudent:   (parentId: string, studentId: string) =>
    api.post(`/parents/${parentId}/students/${studentId}`),
  unassignStudent: (parentId: string, studentId: string) =>
    api.delete(`/parents/${parentId}/students/${studentId}`),

  getUnassignedStudents: async (): Promise<UnassignedStudent[]> =>
    (await api.get('/students', { params: { unassigned: 'true', limit: 1000 } })).data.data.students,
};

export const siblingRulesApi = {
  getAll: async (): Promise<SiblingRule[]> =>
    (await api.get('/sibling-rules')).data.data,
  create: (data: Partial<SiblingRule> & { rule_id: string; applies_to_id: string }) =>
    api.post('/sibling-rules', data),
  update: (id: string, data: Partial<SiblingRule>) => api.put(`/sibling-rules/${id}`, data),
  remove: (id: string) => api.delete(`/sibling-rules/${id}`),
  // "All Fees" (seeded by default) is the applies_to_id every sibling rule needs —
  // fetched once so the Add Rule form doesn't have to build a full picker for it.
  getDefaultAppliesTo: async (): Promise<{ _id: string; applies_to_name: string } | null> => {
    const list = (await api.get('/applies-to')).data.data;
    return list[0] ?? null;
  },
};
