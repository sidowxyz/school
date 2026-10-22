import api from '../../../lib/axios';

export interface CommUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface InboxMessage {
  _id: string;
  subject: string;
  message: string;
  is_read: boolean;
  createDate?: string;
  sender_id?: CommUser | null;
}

export interface SentMessage {
  _id: string;
  subject: string;
  message: string;
  createDate?: string;
  receiver_id?: CommUser | null;
}

export interface Notice {
  _id: string;
  title: string;
  content: string;
  category?: string;
  target_role: string;
  is_published: boolean;
  published_at?: string;
  createDate?: string;
  createBy?: CommUser | null;
}

export interface NotificationItem {
  _id: string;
  type: 'notice' | 'message' | 'system' | 'fee' | 'attendance' | 'result';
  title: string;
  body: string;
  is_read: boolean;
  createDate?: string;
}

export const communicationApi = {
  // Messages
  getInbox: async (): Promise<InboxMessage[]> =>
    (await api.get('/communication/messages/inbox', { params: { limit: 200 } })).data.data.messages,
  getSent: async (): Promise<SentMessage[]> =>
    (await api.get('/communication/messages/sent', { params: { limit: 200 } })).data.data.messages,
  sendMessage: (data: { receiver_id: string; subject: string; message: string }) =>
    api.post('/communication/messages', data),
  markMessageRead: (id: string) => api.patch(`/communication/messages/${id}/read`),
  deleteMessage: (id: string) => api.delete(`/communication/messages/${id}`),

  // Notices / announcements
  getNotices: async (): Promise<Notice[]> =>
    (await api.get('/communication/notices', { params: { limit: 200 } })).data.data.notices,
  createNotice: (data: { title: string; content: string; category?: string; target_role: string }) =>
    api.post('/communication/notices', data),
  publishNotice: (id: string) => api.patch(`/communication/notices/${id}/publish`),
  deleteNotice: (id: string) => api.delete(`/communication/notices/${id}`),

  // Logged-in user's live notification feed.
  getNotifications: async (): Promise<NotificationItem[]> =>
    (await api.get('/communication/notifications', { params: { limit: 5 } })).data.data.notifications,
};
