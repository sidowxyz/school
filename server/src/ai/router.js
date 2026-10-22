import aiConfig from '../config/aiConfig.js';
import { getProvider } from './providers/index.js';
import { toolsForRole } from './registry/index.js';
import { matchByVocabulary } from './matcher.js';

/**
 * Decides which tool (if any) answers a message.
 *
 * Level 0 first, always. A deterministic keyword match resolves the common
 * phrasings with zero tokens and zero latency; only genuinely ambiguous input
 * escalates to a cheap model for classification. The model is used to *choose*
 * a tool, never to produce the data — the data comes from the tool.
 *
 * If no provider key is configured the router still works for everything the
 * deterministic layer recognises, which is the majority of real usage.
 */

/* Ordered most-specific first — the first pattern to match wins. */
const INTENTS = [
  // Consequential intents sit at the top so a phrase like "publish the
  // announcement" can never fall through to a broader read-only pattern.
  { tool: 'publishAnnouncement', patterns: [/\bpublish\b.*\b(announcement|notice)\b/, /\b(send|release)\b.*\b(announcement|notice)\b/] },
  { tool: 'draftAnnouncement',   patterns: [/\b(draft|compose|write|prepare)\b.*\b(announcement|notice|message to parents)\b/] },

  // Generation is a distinct verb ahead of review/similarity, and specific
  // enough to match deterministically — vocabulary scoring alone dropped
  // well-formed requests when the topic words were generic.
  { tool: 'generateExam',        patterns: [/\b(generate|create|write|make|set|draft|prepare)\b.*\b(exam|paper|test|quiz)\b/] },
  { tool: 'reviewExamQuality',   patterns: [/\breview\b.*\b(exam|paper|test)\b/, /\b(exam|paper)\b.*\b(quality|review|check)\b/] },
  { tool: 'checkExamSimilarity', patterns: [/\b(similar|similarity|duplicate|repeat|repeated|originality|asked before|used before)\b/, /\bhas this\b.*\bbeen asked\b/] },

  { tool: 'getMissingTeachingLogs', patterns: [/\b(missing|pending|not submitted|haven'?t submitted|who hasn'?t)\b.*\b(teaching )?logs?\b/, /\bteaching logs?\b.*\b(missing|pending|outstanding|submitted)\b/] },
  { tool: 'getPendingMarks',        patterns: [/\b(pending|missing|outstanding|not entered)\b.*\bmarks?\b/, /\bmarks?\b.*\b(pending|missing|outstanding|entered)\b/, /\bwhich classes\b.*\bmarks?\b/] },
  { tool: 'getTeacherWorkload',     patterns: [/\b(workload|teaching load|periods per week)\b/, /\bhow many (periods|classes)\b.*\bteachers?\b/] },

  { tool: 'getMonthlyAttendanceReport', patterns: [/\b(month|monthly)\b.*\battendance\b/, /\battendance\b.*\b(report|month)\b/] },
  { tool: 'getAttendanceForDate',       patterns: [/\b(absent|present|attendance)\b/] },
  { tool: 'getOverdueBooks',            patterns: [/\boverdue\b/, /\blibrary\b.*\b(late|overdue|due)\b/, /\bbooks?\b.*\bdue\b/] },
  { tool: 'getFinanceSummary',          patterns: [/\b(outstanding|unpaid|owing|arrears)\b/, /\b(fee|fees|payment|invoice|collection)s?\b/] },
  { tool: 'getAcademicPerformance',     patterns: [/\b(performance|pass rate|average score|results?)\b/, /\b(class|subject)\b.*\b(average|performance)\b/] },
  { tool: 'getMyTimetable',             patterns: [/\b(my|todays?|weekly)\b.*\b(timetable|schedule)\b/, /\btimetable\b/] },
  { tool: 'getMyTeachingSummary',       patterns: [/\b(my)\b.*\b(teaching|workload|classes|logs?)\b/, /\bteaching log\b/] },
  { tool: 'getDailySchoolSummary',      patterns: [/\b(daily|today'?s?|school)\b.*\b(summary|overview|briefing)\b/, /\bsummar(y|ise|ize)\b.*\bschool\b/] },
  { tool: 'searchStudents',             patterns: [/\b(find|search|look ?up|show me)\b.*\bstudents?\b/, /\bhow many\b.*\bstudents?\b/, /\bstudents?\b.*\bin\b.*\b(grade|class)\b/] },
];

/**
 * Deterministic first pass. Returns a tool name or null. Costs nothing.
 */
export const matchIntent = (message, role) => {
  const text = String(message || '').toLowerCase().trim();
  if (!text) return null;

  const permitted = new Set(toolsForRole(role).map((t) => t.name));

  for (const intent of INTENTS) {
    if (!permitted.has(intent.tool)) continue;
    if (intent.patterns.some((p) => p.test(text))) return intent.tool;
  }
  return null;
};

/**
 * Escalation: ask a cheap model to pick from the caller's permitted tools.
 *
 * Only the tool names and one-line descriptions are sent — never school data,
 * never the full registry, never tools the caller cannot use. The reply is
 * constrained to a single token-ish name and re-checked against the permitted
 * set, so a hallucinated or injected name simply resolves to null.
 */
export const classifyIntent = async (message, role) => {
  if (!aiConfig.isLlmEnabled) return null;

  const permitted = toolsForRole(role);
  if (permitted.length === 0) return null;

  const menu = permitted.map((t) => `${t.name}: ${t.description}`).join('\n');

  const system =
    'You route a school administration question to exactly one tool.\n' +
    'Reply with the tool name alone, or the word NONE if no tool fits.\n' +
    'Never explain. Never invent a name outside the list.\n\n' +
    `Available tools:\n${menu}`;

  try {
    const { text } = await getProvider().complete({
      system,
      messages: [{ role: 'user', content: String(message).slice(0, 1000) }],
      tier: 'economy',
    });

    const candidate = String(text || '').trim().split(/\s+/)[0]?.replace(/[^\w]/g, '') ?? '';
    return permitted.some((t) => t.name === candidate) ? candidate : null;
  } catch {
    // Routing is best-effort — a provider outage degrades to "no tool matched",
    // not to a failed request.
    return null;
  }
};

/**
 * Full route: deterministic match, then optional model classification.
 * Returns { tool: string|null, via: 'keyword'|'model'|'none' }.
 */
/**
 * Three passes, cheapest and most certain first:
 *
 *   1. exact phrase patterns — high precision, near-zero cost
 *   2. vocabulary scoring    — deterministic, catches natural phrasings
 *   3. model classification  — only if a provider key is configured
 *
 * Pass 2 is what makes the assistant usable without a key. It was added after
 * measuring that pass 1 alone answered only 7 of 19 realistic questions.
 */
export const route = async (message, role) => {
  const direct = matchIntent(message, role);
  if (direct) return { tool: direct, via: 'keyword' };

  const scored = matchByVocabulary(message, toolsForRole(role));
  if (scored) return { tool: scored, via: 'vocabulary' };

  const classified = await classifyIntent(message, role);
  if (classified) return { tool: classified, via: 'model' };

  return { tool: null, via: 'none' };
};
