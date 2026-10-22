import api from '../../../lib/axios';
import type { Assignment } from '../types';

export const timetableApi = {
  getAssignments: async (params: { teacherId?: string; classId?: string; sectionId?: string; termId?: string }): Promise<Assignment[]> =>
    (await api.get('/assignments', { params })).data.data,
};