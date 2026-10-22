import api from "../../../lib/axios";
import type { ExamType } from "../types";

export const examTypesApi = {
  getAll: async (): Promise<ExamType[]> => (await api.get("/exam-types")).data.data,
  create: async (data: { exam_type_no: string; type_name: string }): Promise<ExamType> =>
    (await api.post("/exam-types", data)).data.data,
  update: async (id: string, data: { type_name?: string }): Promise<ExamType> =>
    (await api.put(`/exam-types/${id}`, data)).data.data,
  delete: (id: string) => api.delete(`/exam-types/${id}`),
};
