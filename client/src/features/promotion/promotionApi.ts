import api from '../../lib/axios';

export type ClassAction = 'promote' | 'repeat' | 'graduate';
export type StudentAction = ClassAction | 'leave';

export interface PlanClass {
  _id: string;
  name: string;
  level: string | null;
  sections: { _id: string; name: string; capacity: number | null }[];
  /** Active students still to be moved into the target year. */
  waiting: number;
  alreadyMoved: number;
  suggestion: { action: ClassAction; toClassId: string | null };
}

export interface PromotionPlan {
  year: { _id: string; name: string };
  classes: PlanClass[];
}

export interface PromotionStudent { _id: string; name: string; admissionNumber?: string; section: string | null }

export interface PromotionResult {
  promoted: number;
  repeated: number;
  graduated: number;
  left: number;
  skipped: number;
  warnings: string[];
}

export const promotionApi = {
  plan: async (toYearId: string): Promise<PromotionPlan> => (await api.get('/promotion/plan', { params: { toYearId } })).data.data,
  students: async (toYearId: string, classId: string): Promise<PromotionStudent[]> =>
    (await api.get('/promotion/students', { params: { toYearId, classId } })).data.data,
  run: async (body: {
    toYearId: string;
    rules: { classId: string; action: ClassAction; toClassId?: string | null }[];
    exceptions: Record<string, StudentAction>;
  }): Promise<PromotionResult> => (await api.post('/promotion', body)).data.data,
};
