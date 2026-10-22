import api from '../../../lib/axios';
import type {
  LadderClass,
  PromoteClassPayload,
  PromoteClassResult,
  PromotionPreview,
  PromotionRecord,
  SpecialPromotionPayload,
} from '../types';

export const promotionApi = {
  /** Every class with its computed next class, roster size and sections. */
  getLadder: async (): Promise<LadderClass[]> =>
    (await api.get('/promotions/ladder')).data.data,

  /** Return the promotion worksheet for one class and optional examination scope. */
  getPreview: async (params: {
    class_id: string;
    exam_period_id?: string;
    exam_id?: string;
    pass_percentage?: number;
  }): Promise<PromotionPreview> =>
    (await api.get('/promotions/preview', { params })).data.data,

  /** Normal promotion: the server moves students to the next class only. */
  promoteClass: async (payload: PromoteClassPayload): Promise<PromoteClassResult> =>
    (await api.post('/promotions/class', payload)).data.data,

  /** Exceptional move to a non-consecutive class; requires a reason. */
  promoteSpecial: async (payload: SpecialPromotionPayload): Promise<PromotionRecord> =>
    (await api.post('/promotions/special', payload)).data.data,

  getHistory: async (params?: {
    student_id?: string;
    class_id?: string;
    batch_id?: string;
    type?: string;
    limit?: number;
  }): Promise<PromotionRecord[]> =>
    (await api.get('/promotions/history', { params })).data.data,
};
