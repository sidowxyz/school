import api from '../../../lib/axios';
import type {
  ActionExecutedResponse,
  AssignmentReviewResult,
  AssistantResponse,
  ConversationSummary,
  ExamUploadReviewResult,
  PageContext,
  QuickAction,
  StoredConversation,
} from '../types/ai.types';

export interface ExamUploadMeta {
  subjectId?: string;
  classId?: string;
  subjectName?: string;
  className?: string;
  expectedTotalMarks?: number;
}

export interface AssignmentUploadMeta {
  studentQuery: string;
  assignmentTitle?: string;
  rubric?: string;
  subjectId?: string;
  classId?: string;
}

interface ChatArgs {
  message?: string;
  tool?: string;
  args?: Record<string, unknown>;
  conversationId?: string;
  pageContext?: PageContext;
}

/**
 * Uses the shared axios instance, so the assistant inherits the app's bearer
 * token, its 401 refresh-and-retry, and its base URL. Nothing auth-related is
 * reimplemented here.
 */
export const aiApi = {
  chat: async (body: ChatArgs): Promise<AssistantResponse> =>
    (await api.post('/ai/chat', body)).data.data,

  quickActions: async (): Promise<QuickAction[]> =>
    (await api.get('/ai/quick-actions')).data.data,

  /**
   * Executes a prepared action. This is a deliberately separate request from
   * chat: it is the step that proves a human approved, which no model output
   * can substitute for.
   */
  confirmAction: async (actionId: string): Promise<ActionExecutedResponse> =>
    (await api.post(`/ai/actions/${actionId}/confirm`)).data.data,

  cancelAction: async (actionId: string): Promise<void> => {
    await api.delete(`/ai/actions/${actionId}`);
  },

  conversations: async (): Promise<ConversationSummary[]> =>
    (await api.get('/ai/conversations')).data.data,

  conversation: async (id: string): Promise<StoredConversation> =>
    (await api.get(`/ai/conversations/${id}`)).data.data,

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/ai/conversations/${id}`);
  },

  /**
   * Both uploads post FormData rather than JSON. The shared instance sets a
   * default `Content-Type: application/json`, so it's cleared explicitly here
   * rather than relied on to be auto-stripped — the browser then sets
   * multipart/form-data with the correct boundary itself. A wrong or missing
   * boundary is a silent server-side parse failure, not an obvious client
   * error, so this is worth being explicit about rather than trusting axios's
   * FormData auto-detection to always kick in.
   */
  reviewExamUpload: async (file: File, meta: ExamUploadMeta): Promise<ExamUploadReviewResult> => {
    const form = new FormData();
    form.append('file', file);
    for (const [key, value] of Object.entries(meta)) {
      if (value !== undefined && value !== '') form.append(key, String(value));
    }
    return (
      await api.post('/ai/exams/review-upload', form, {
        headers: { 'Content-Type': undefined },
      })
    ).data.data;
  },

  reviewAssignmentUpload: async (
    file: File,
    meta: AssignmentUploadMeta
  ): Promise<AssignmentReviewResult> => {
    const form = new FormData();
    form.append('file', file);
    for (const [key, value] of Object.entries(meta)) {
      if (value !== undefined && value !== '') form.append(key, String(value));
    }
    return (
      await api.post('/ai/assignments/review-upload', form, {
        headers: { 'Content-Type': undefined },
      })
    ).data.data;
  },
};

export default aiApi;
