import api from '../../../lib/axios';

export type CalendarEventType = 'session' | 'term' | 'exam' | 'holiday' | 'event';

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  description?: string;
  type: CalendarEventType;
  source: 'academic-structure' | 'examinations' | 'settings';
  editable?: boolean;
}

export interface AcademicYearOption {
  _id: string;
  y_no: string;
  y_name: string;
}

export interface ManagedCalendarItem {
  _id: string;
  name?: string;
  title?: string;
  date: string;
  endDate?: string;
  description?: string;
  academicYearId?: string;
}

export interface AcademicCalendarData {
  academicYears: AcademicYearOption[];
  selectedAcademicYear: AcademicYearOption | null;
  activeTerm: { _id: string; name: string; startDate?: string; endDate?: string } | null;
  sessionStart: string | null;
  sessionEnd: string | null;
  events: AcademicCalendarEvent[];
  holidays: ManagedCalendarItem[];
  schoolEvents: ManagedCalendarItem[];
}

export interface CalendarItemPayload {
  title: string;
  date: string;
  endDate?: string;
  description?: string;
  academicYearId?: string;
}

export interface SystemSettings {
  _id: string;
  schoolName: string;
  schoolCode?: string;
  schoolEmail: string;
  schoolPhone?: string;
  address?: string;
  website?: string;
  principalName?: string;
  timezone?: string;
  language?: 'English' | 'Somali';
  logoUrl?: string;
  brandingColors: { primary: string; secondary: string };
  discountRule: 'highest_only' | 'combined';
}

const holidayPayload = (payload: CalendarItemPayload) => ({
  name: payload.title,
  date: payload.date,
  endDate: payload.endDate || undefined,
  description: payload.description || '',
  academicYearId: payload.academicYearId || undefined,
});

export const settingsApi = {
  getSystemSettings: async (): Promise<SystemSettings> =>
    (await api.get('/v1/settings')).data.data,
  updateSystemSettings: async (payload: Partial<SystemSettings>): Promise<SystemSettings> =>
    (await api.put('/v1/settings', payload)).data.data,
  uploadLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const formData = new FormData();
    formData.append('photo', file);
    return (await api.post('/v1/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },

  getAcademicCalendar: async (academicYearId?: string): Promise<AcademicCalendarData> =>
    (await api.get('/v1/settings/academic-calendar', { params: { academicYearId } })).data.data,

  createHoliday: async (payload: CalendarItemPayload) =>
    (await api.post('/v1/settings/holidays', holidayPayload(payload))).data.data,
  updateHoliday: async (id: string, payload: CalendarItemPayload) =>
    (await api.put(`/v1/settings/holidays/${id}`, holidayPayload(payload))).data.data,
  deleteHoliday: (id: string) => api.delete(`/v1/settings/holidays/${id}`),

  createEvent: async (payload: CalendarItemPayload) =>
    (await api.post('/v1/settings/calendar-events', payload)).data.data,
  updateEvent: async (id: string, payload: CalendarItemPayload) =>
    (await api.put(`/v1/settings/calendar-events/${id}`, payload)).data.data,
  deleteEvent: (id: string) => api.delete(`/v1/settings/calendar-events/${id}`),
};
