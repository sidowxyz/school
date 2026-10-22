/** Mirrors the server's quick-action shape (server/src/ai/registry/index.js). */
export interface QuickAction {
  tool: string;
  label: string;
  icon: string;
  group: string;
  /** True when the tool takes no required arguments, so one click can run it. */
  instant: boolean;
  /**
   * When set, the action needs a detail a button cannot supply. The client
   * opens the composer seeded with this text instead of firing the tool with
   * no arguments, which would just surface a schema error to the user.
   */
  prompt: string | null;
}

/** How the server decided which tool to run. */
export type RouteVia = 'keyword' | 'model' | 'quick-action' | 'none';

interface BaseResponse {
  /**
   * Null only as a safety net if the server ever returns from a code path that
   * didn't persist the conversation — see persistTurn() in orchestrator.js.
   * Treat it as "start fresh next time", never resend it.
   */
  conversationId: string | null;
  llmAvailable: boolean;
}

/** No tool matched — the assistant is asking for a rephrase. */
export interface TextResponse extends BaseResponse {
  type: 'text';
  tool: null;
  text: string;
  suggestions?: QuickAction[];
}

/** A tool ran; `data` is authoritative, `text` is optional phrasing. */
export interface ToolResultResponse extends BaseResponse {
  type: 'tool_result';
  tool: string;
  level: 'READ' | 'DRAFT' | 'CONFIRM';
  via: RouteVia;
  text: string | null;
  data: unknown;
}

/**
 * Built server-side from live data, never from model output — so what is shown
 * here is exactly what runs on confirm.
 */
export interface ActionPreview {
  title: string;
  summary: string;
  details: Record<string, unknown>;
  impact: string;
}

/** A consequential action was prepared but NOT performed. */
export interface ConfirmationRequiredResponse extends BaseResponse {
  type: 'confirmation_required';
  tool: string;
  actionId: string;
  preview: ActionPreview;
  expiresAt: string;
}

/** Result of confirming a prepared action. */
export interface ActionExecutedResponse {
  type: 'action_executed';
  tool: string;
  data: unknown;
}

/**
 * The request matched a tool but is missing a detail. Deliberately distinct
 * from an error: "generate an exam for Grade 8" is a reasonable thing to say,
 * and answering it with "subject: Required" is not.
 */
export interface NeedsInputResponse extends BaseResponse {
  type: 'needs_input';
  tool: string;
  text: string;
  missing: { field: string; label: string; example: string }[];
}

export type AssistantResponse =
  | TextResponse
  | ToolResultResponse
  | ConfirmationRequiredResponse
  | NeedsInputResponse;

/** A rendered turn in the panel. */
export interface ChatTurn {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  /**
   * Present on the user turn produced by a file upload, so the chat shows the
   * file itself rather than only a sentence naming it. Kept on the turn (not
   * derived from `upload`) because it must render immediately, stay visible
   * while the review is still running, and survive a failed review — the three
   * moments a user most needs to see which file they sent.
   */
  attachment?: { name: string; sizeBytes: number; kind: 'exam' | 'assignment' };
  /** Present only on assistant turns that carried structured data. */
  tool?: string | null;
  data?: unknown;
  suggestions?: QuickAction[];
  error?: boolean;
  pending?: boolean;
  /** Set when this turn is awaiting the user's explicit confirmation. */
  confirmation?: {
    actionId: string;
    preview: ActionPreview;
    expiresAt: string;
    state: 'awaiting' | 'confirming' | 'confirmed' | 'cancelled';
  };
  /**
   * Set on the assistant turn produced by a file upload. Rendered with a
   * dedicated card rather than the generic ResultRenderer, since these two
   * shapes (redo banner, grammar list; writing-integrity signals, feedback)
   * don't fit the stat-tile/table pattern the rest of the assistant uses.
   */
  upload?:
    | { kind: 'exam'; data: ExamUploadReviewResult }
    | { kind: 'assignment'; data: AssignmentReviewResult };
}

export interface ConversationSummary {
  _id: string;
  title: string;
  lastActivityAt: string;
}

/**
 * A stored thread. Only the recent turns are kept verbatim server-side — older
 * ones are folded into a rolling summary — so reopening a long conversation
 * shows its tail, not its entire history.
 */
export interface StoredConversation {
  _id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; tool: string | null }[];
  lastActivityAt: string;
}

/** Whitelisted page context — deliberately narrow (see aiValidator.js). */
export interface PageContext {
  pageType?: string;
  entityId?: string;
}

export interface ExamUploadReviewResult {
  fileName: string;
  subject: string;
  class: string;
  extractionMethod: 'deterministic';
  questionsDetected: number;
  questions: { text: string; marks: number }[];
  quality: {
    totalMarks: number;
    expectedTotalMarks: number | null;
    structureValid: boolean;
    issues: { severity: 'high' | 'medium' | 'low'; type: string; message: string }[];
    difficultyMix: Record<string, number>;
    topicCoverage: string[];
  };
  grammar: {
    issues: { questionNumber: number; quote: string; suggestion: string }[];
    available: boolean;
    note?: string;
  };
  repeatedFromArchivePercent: number;
  redoThresholdPercent: number;
  redoRecommended: boolean;
  redoReason: string | null;
}

export interface AssignmentReviewResult {
  student: { id: string; name: string; admissionNumber: string };
  assignmentTitle: string;
  wordCount: number;
  writingIntegrity: {
    signals: { signal: string; detail: string }[];
    reviewRecommended: boolean;
    comparedAgainstSubmissions: number;
    note: string;
  };
  feedback: {
    strengths: string[];
    weaknesses: string[];
    focusAreas: string[];
    suggestedFeedback: string;
  } | null;
  feedbackAvailable: boolean;
  disclaimer: string;
}
