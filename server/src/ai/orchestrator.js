import aiConfig from '../config/aiConfig.js';
import AppError from '../utils/AppError.js';
import { logAudit } from '../utils/auditHelper.js';
import { buildActor, redactForPrompt } from './actor.js';
import { getTool, resolveTool, parseArgs, quickActionsForRole } from './registry/index.js';
import { LEVEL } from './registry/defineTool.js';
import { route } from './router.js';
import { getProvider } from './providers/index.js';
import { summarizeResultPrompt } from './prompts.js';
import { prepareAction } from './confirmation.js';
import { fingerprint, readCache, writeCache, recordUsage, isOverDailyQuota } from './cache.js';

export const AI_AUDIT_MODULE = 'AIAssistant';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Derive tool arguments from a free-text question, deterministically.
 *
 * Deliberately conservative: it fills only what it can read unambiguously —
 * a date, a month/year, a search term — and leaves the rest to schema defaults.
 * Guessing database ids out of prose would be a correctness hazard, so it does
 * not try; a question needing an id is answered by asking for one.
 */
export const extractArgs = (tool, message) => {
  if (!tool) return {};
  const shape = tool.input?.shape ?? {};
  const text = String(message || '');
  const lower = text.toLowerCase();
  const args = {};

  if ('date' in shape) {
    const iso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) {
      args.date = iso[1];
    } else if (/\byesterday\b/.test(lower)) {
      args.date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    }
  }

  if ('year' in shape && 'month' in shape) {
    const namedMonth = MONTHS.findIndex((m) => lower.includes(m));
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const now = new Date();
    args.month = namedMonth >= 0 ? namedMonth + 1 : now.getMonth() + 1;
    args.year = yearMatch ? Number(yearMatch[1]) : now.getFullYear();
  }

  if ('search' in shape) {
    const quoted = text.match(/["']([^"']{2,60})["']/);
    if (quoted) {
      args.search = quoted[1];
    } else {
      const after = text.match(
        /\b(?:find|search|look ?up|show me)\b\s+(?:the\s+)?(?:students?\s+)?(?:named\s+|called\s+)?([\w'-]+(?:\s+[\w'-]+)?)/i
      );
      if (after && !/^students?$/i.test(after[1])) args.search = after[1].trim();
    }
  }

  return args;
};

/**
 * Whether a tool result carries nothing to show.
 *
 * Covers the three shapes tools actually return: a bare empty array, an object
 * whose only meaningful field is an empty collection, and an explicit zero
 * total. Numeric zero on its own is NOT empty — "0 students absent" is a real,
 * useful answer and must still render.
 */
export const isEmptyResult = (data) => {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data !== 'object') return false;

  const entries = Object.entries(data);
  if (entries.length === 0) return true;

  const collections = entries.filter(([, v]) => Array.isArray(v));
  if (collections.length === 0) return false;

  // Every collection empty, and no non-zero number anywhere to report.
  const allCollectionsEmpty = collections.every(([, v]) => v.length === 0);
  const hasMeaningfulNumber = entries.some(([, v]) => typeof v === 'number' && v !== 0);
  return allCollectionsEmpty && !hasMeaningfulNumber;
};

/**
 * Human labels for the arguments a user can reasonably be asked to supply.
 * Anything not listed here is an internal id the user should never be asked
 * for — those tools are reached by following a previous result instead.
 */
const ARG_LABELS = {
  date: { label: 'the date', example: '2026-10-23' },
};

/** "a, b and c" — reads as a sentence rather than a field list. */
const listPhrase = (items) =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * Required arguments the request did not supply, as things a person can answer.
 *
 * Returns nothing for tools whose missing fields are database ids, since asking
 * a user for an ObjectId is not a conversation — those fall through to normal
 * validation and its error.
 */
export const missingRequiredArgs = (tool, args = {}) => {
  const shape = tool?.input?.shape;
  if (!shape) return [];

  const missing = [];
  for (const [field, schema] of Object.entries(shape)) {
    const optional = typeof schema?.isOptional === 'function' ? schema.isOptional() : true;
    if (optional) continue;
    if (args?.[field] !== undefined && args[field] !== '') continue;

    const known = ARG_LABELS[field];
    if (!known) return []; // an id — not something to ask for
    missing.push({ field, ...known });
  }
  return missing;
};

/**
 * Executes one tool for an authenticated caller and records it.
 *
 * Order matters and is not negotiable:
 *   1. resolveTool — role check against req.user, never against model output
 *   2. parseArgs   — Zod validation of every argument
 *   3. handler     — calls an existing service or controller
 *   4. logAudit    — always, success or failure
 */
export const executeTool = async ({ req, toolName, rawArgs, via = 'direct' }) => {
  const actor = buildActor(req.user);
  const tool = resolveTool(toolName, actor);
  const args = parseArgs(tool, rawArgs);

  let data;
  let failure = null;
  try {
    data = await tool.handler({ req, args, actor });
  } catch (err) {
    failure = err;
  }

  // The audit records the tool and its argument *keys* — never argument values
  // or returned records, which would put student data into the audit trail.
  await logAudit({
    userId: actor?.id,
    action: failure ? 'AI_TOOL_FAILED' : 'AI_TOOL_EXECUTE',
    module: AI_AUDIT_MODULE,
    recordId: tool.name,
    after: {
      tool: tool.name,
      level: tool.level,
      scope: tool.scope,
      via,
      argKeys: Object.keys(args ?? {}),
      ok: !failure,
    },
    ip: req.ip,
  });

  // Level-0 tools cost nothing, but recording them is what makes the routing
  // strategy measurable: these rows are the evidence that most questions never
  // reach a paid model.
  if (tool.tier === 'none') {
    await recordUsage({ actor, tool: tool.name, tier: 'none', usage: null });
  }

  if (failure) throw failure;

  return { tool, data };
};

/**
 * Optional narrative layer over a tool result.
 *
 * Never called for its data — only to phrase data a tool already returned.
 * Degrades to null (structured result, no prose) when no key is configured or
 * the provider fails. That is why the assistant stays useful without a key.
 */
const narrate = async ({ question, tool, data, actor }) => {
  if (!aiConfig.isLlmEnabled) return null;

  // Over-quota users keep every Level-0 tool; only the paid phrasing stops.
  if (await isOverDailyQuota(actor)) return null;

  // Cache on the exact result being described, so two people asking the same
  // question of the same data pay once.
  const key = fingerprint({ tool: tool.name, args: null, payload: redactForPrompt(data) });
  const cached = await readCache(key);
  if (cached !== null) {
    await recordUsage({ actor, tool: tool.name, tier: 'economy', usage: null, cachedHit: true });
    return cached;
  }

  try {
    const { text, usage } = await getProvider().complete({
      system: summarizeResultPrompt(),
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            question: String(question ?? '').slice(0, 500),
            tool: tool.name,
            // Second line of defence against a populated user document
            // reaching the provider.
            result: redactForPrompt(data),
          }).slice(0, 24000),
        },
      ],
      tier: 'economy',
    });

    const phrased = String(text || '').trim() || null;
    await recordUsage({ actor, tool: tool.name, tier: 'economy', usage });
    if (phrased) await writeCache(key, tool.name, phrased);
    return phrased;
  } catch {
    return null;
  }
};

/**
 * Handle one conversational turn.
 * Returns a structured response the UI renders directly — never prose alone.
 */
/**
 * Records a turn and saves it — the only place any branch of handleTurn
 * touches the conversation.
 *
 * Every branch must call this exactly once, even the ones that don't invoke a
 * tool. A response the caller returns without saving still carries the
 * conversation's `_id` (Mongoose assigns it on construction, before `save()`),
 * so an unsaved conversation still LOOKS valid to the client. It then gets
 * handed back as `conversationId`, and every subsequent request against that id
 * 404s with "Conversation not found" — indistinguishably from a real one,
 * until the user starts a new thread. This was shipped once already, from the
 * "no tool matched" branch skipping the save that the tool-result branch did.
 */
const persistTurn = async (conversation, userText, assistantText, toolName) => {
  if (!conversation) return;

  // AiConversation's message schema requires non-empty content. A quick action
  // fired with no typed message (the common case — a button click has no
  // prose) leaves userText null, and a naive String(null ?? '') turns into ''
  // here, which then fails that requirement *inside* Mongoose validation,
  // after the response was already decided. Falling back to a labelled
  // placeholder keeps every branch safe without each call site having to
  // remember to do it — one already forgot.
  const fallback = toolName ? `[${toolName}]` : '[action]';
  const safeUserText = String(userText ?? '').trim() || fallback;

  conversation.appendTurn('user', safeUserText.slice(0, 2000));
  conversation.appendTurn('assistant', assistantText, toolName);
  await conversation.save();
};

export const handleTurn = async ({
  req,
  message,
  toolName = null,
  conversation = null,
  explicitArgs = null,
}) => {
  const actor = buildActor(req.user);
  if (!actor) throw new AppError('Not authenticated.', 401);

  // An explicit tool (a quick-action button) skips routing entirely.
  const routed = toolName
    ? { tool: toolName, via: 'quick-action' }
    : await route(message, actor.role);

  if (!routed.tool) {
    const text =
      "I couldn't match that to something I can look up yet. Try asking about attendance, " +
      'fees, students, teaching logs, or your own timetable.';
    await persistTurn(conversation, message, text, null);
    return {
      type: 'text',
      tool: null,
      text,
      suggestions: quickActionsForRole(actor.role).slice(0, 4),
      llmAvailable: aiConfig.isLlmEnabled,
    };
  }

  // Arguments supplied explicitly by the client (a quick action with inputs)
  // take precedence over anything inferred from prose. Either way they are
  // validated against the tool's own schema inside executeTool.
  const rawArgs = explicitArgs ?? extractArgs(getTool(routed.tool), message);

  // If the request is simply incomplete, ask for what's missing rather than
  // surfacing a validation error.
  const missing = missingRequiredArgs(getTool(routed.tool), rawArgs);
  if (missing.length > 0) {
    const text = `I can do that — I just need ${listPhrase(missing.map((f) => f.label))}.`;
    await persistTurn(conversation, message, text, routed.tool);
    return {
      type: 'needs_input',
      tool: routed.tool,
      text,
      missing: missing.map((f) => ({ field: f.field, label: f.label, example: f.example })),
      llmAvailable: aiConfig.isLlmEnabled,
    };
  }

  // A consequential tool stops here: it prepares a preview and returns, without
  // performing anything. Execution requires a separate confirm request against
  // the stored action, so no amount of model output can trigger it.
  const selected = resolveTool(routed.tool, actor);
  if (selected.level === LEVEL.CONFIRM) {
    const prepared = await prepareAction({
      req,
      actor,
      toolName: routed.tool,
      rawArgs,
    });

    await persistTurn(conversation, message, prepared.preview.summary, selected.name);

    return { ...prepared, llmAvailable: aiConfig.isLlmEnabled };
  }

  const { tool, data } = await executeTool({
    req,
    toolName: routed.tool,
    rawArgs,
    via: routed.via,
  });

  let text = await narrate({ question: message, tool, data, actor });

  // With no provider key there is no narration, so an empty result would render
  // as a bare empty state. Say what actually happened instead.
  if (!text && isEmptyResult(data)) {
    text =
      tool.emptyMessage ||
      'There are no records matching that yet.';
  }

  await persistTurn(conversation, message, text ?? `Returned ${tool.name} results.`, tool.name);

  return {
    type: 'tool_result',
    tool: tool.name,
    level: tool.level,
    via: routed.via,
    text,
    data,
    llmAvailable: aiConfig.isLlmEnabled,
  };
};

export { quickActionsForRole };
