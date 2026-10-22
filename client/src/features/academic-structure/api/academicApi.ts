import api from '../../../lib/axios';
import type { Year, Level, Term, Class, Section, Subject, Period } from '../types';

// None of the list endpoints below support server-side filtering (they return
// every record), so filtering by year/class happens client-side after fetch.
export const academicApi = {
  getYears:      async (): Promise<Year[]> => (await api.get('/years')).data.data,
  // The year whose Term is currently active, or null if none is — used to
  // pick a sensible default instead of an arbitrary "first" year.
  getCurrentYear: async (): Promise<Year | null> => (await api.get('/years/current')).data.data,
  createYear:    async (data: unknown): Promise<Year> => (await api.post('/years', data)).data.data,
  updateYear:    async (id: string, d: unknown): Promise<Year> => (await api.put(`/years/${id}`, d)).data.data,
  deleteYear:    (id: string) => api.delete(`/years/${id}`),

  getLevels:     async (): Promise<Level[]> => (await api.get('/levels')).data.data,
  createLevel:   async (data: unknown): Promise<Level> => (await api.post('/levels', data)).data.data,
  updateLevel:   async (id: string, d: unknown): Promise<Level> => (await api.put(`/levels/${id}`, d)).data.data,
  deleteLevel:   (id: string) => api.delete(`/levels/${id}`),

  getTerms:      async (): Promise<Term[]> => (await api.get('/terms')).data.data,
  createTerm:    async (data: unknown): Promise<Term> => (await api.post('/terms', data)).data.data,
  updateTerm:    async (id: string, d: unknown): Promise<Term> => (await api.put(`/terms/${id}`, d)).data.data,
  deleteTerm:    (id: string) => api.delete(`/terms/${id}`),

  getClasses:    async (): Promise<Class[]> => (await api.get('/classes')).data.data,
  createClass:   async (data: unknown): Promise<Class> => (await api.post('/classes', data)).data.data,
  updateClass:   async (id: string, d: unknown): Promise<Class> => (await api.put(`/classes/${id}`, d)).data.data,
  deleteClass:   (id: string) => api.delete(`/classes/${id}`),

  getSections:   async (): Promise<Section[]> => (await api.get('/sections')).data.data,
  createSection: async (data: unknown): Promise<Section> => (await api.post('/sections', data)).data.data,
  updateSection: async (id: string, d: unknown): Promise<Section> => (await api.put(`/sections/${id}`, d)).data.data,
  deleteSection: (id: string) => api.delete(`/sections/${id}`),

  getSubjects:   async (): Promise<Subject[]> => (await api.get('/subjects')).data.data,
  createSubject: async (data: unknown): Promise<Subject> => (await api.post('/subjects', data)).data.data,
  updateSubject: async (id: string, d: unknown): Promise<Subject> => (await api.put(`/subjects/${id}`, d)).data.data,
  deleteSubject: (id: string) => api.delete(`/subjects/${id}`),

  // Periods are term-scoped server-side (one term might run 6 periods/day, another 7).
  getPeriods:    async (termId: string): Promise<Period[]> => (await api.get('/periods', { params: { termId } })).data.data,
  createPeriod:  async (data: unknown): Promise<Period> => (await api.post('/periods', data)).data.data,
  updatePeriod:  async (id: string, d: unknown): Promise<Period> => (await api.put(`/periods/${id}`, d)).data.data,
  deletePeriod:  (id: string) => api.delete(`/periods/${id}`),
};
