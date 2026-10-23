import { z } from 'zod';

/**
 * Safety levels, per the approved architecture.
 *
 *   READ    — may execute immediately for an authorized caller.
 *   DRAFT   — prepares content but performs no consequential action.
 *   CONFIRM — requires explicit human confirmation through a second request.
 *             Not reachable in Phase 1; the registry refuses to load one.
 */
export const LEVEL = Object.freeze({
  READ: 'READ',
  DRAFT: 'DRAFT',
  CONFIRM: 'CONFIRM',
});

/**
 * How a tool is restricted to the data the caller is entitled to.
 *
 *   NONE        — tool exposes no per-user data (e.g. reference lookups).
 *   PRIVILEGED  — no narrowing; only roles with school-wide visibility may call.
 *   SELF        — the underlying service derives its own scope from req.user.
 *   ASSIGNMENT  — the underlying controller narrows to the teacher's own
 *                 TeacherAssignment records (see attendanceController).
 *
 * SELF and ASSIGNMENT both mean "the callee scopes itself" — they are kept
 * distinct so the mechanism is documented at the call site rather than assumed.
 */
export const SCOPE = Object.freeze({
  NONE: 'NONE',
  PRIVILEGED: 'PRIVILEGED',
  SELF: 'SELF',
  ASSIGNMENT: 'ASSIGNMENT',
});

/**
 * Roles that legitimately see across the whole school, at least within their own
 * domain — an accountant sees every invoice. A tool may
 * expose unnarrowed data to these roles.
 */
export const DOMAIN_WIDE_ROLES = Object.freeze([
  'admin',
  'principal',
  'academic_officer',
  'accountant',
]);

/**
 * Roles that must only ever see their own slice. Any tool reachable by one of
 * these has to declare a narrowing scope — this is the rule that stops a teacher
 * tool from returning the entire school because someone forgot a filter.
 */
export const SCOPED_ROLES = Object.freeze(['teacher', 'student', 'parent']);

const toolShape = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  input: z.any(),
  roles: z.array(z.string()).min(1),
  level: z.enum([LEVEL.READ, LEVEL.DRAFT, LEVEL.CONFIRM]),
  scope: z.enum([SCOPE.NONE, SCOPE.PRIVILEGED, SCOPE.SELF, SCOPE.ASSIGNMENT]),
  tier: z.enum(['none', 'economy', 'advanced']),
  /**
   * Vocabulary a user might plausibly use for this tool, in their words rather
   * than the system's. The router scores questions against these, which is what
   * lets "who owes money" reach the finance tool without a model. Be generous:
   * a missing synonym is a question the assistant cannot answer.
   */
  keywords: z.string().default(''),
  /**
   * What to say when this tool legitimately returns nothing. An empty result is
   * an answer — "no attendance recorded yet today" — and a generic "no records"
   * reads like a malfunction.
   */
  emptyMessage: z.string().default(''),
  handler: z.function(),
  /**
   * CONFIRM-level tools must supply this. It builds the preview shown to the
   * user from real data, server-side — never from model output — so what is
   * displayed is exactly what `handler` will do if confirmed.
   */
  buildPreview: z.function().optional(),
  quickAction: z
    .object({
      label: z.string(),
      icon: z.string(),
      group: z.string(),
      /**
       * Shown in the composer when the tool needs input a button cannot supply.
       * Without this, clicking such an action fires with no arguments and the
       * user gets a schema error instead of a prompt.
       */
      prompt: z.string().optional(),
    })
    .optional(),
});

/**
 * Declares one AI-callable tool.
 *
 * The safety property this enforces is the one flagged in the audit: resource
 * scoping in this codebase is ad hoc inside controllers, so a tool author could
 * easily expose the whole school to a teacher by forgetting it. Scope is
 * therefore a *required declared field*, not handler discretion — and
 * `validateTool` refuses, at boot, any tool that grants a non-school-wide role
 * access without a narrowing scope.
 */
export const defineTool = (definition) => {
  const parsed = toolShape.parse(definition);
  validateTool(parsed);
  return Object.freeze(parsed);
};

export const validateTool = (tool) => {
  const fail = (msg) => {
    throw new Error(`[ai/registry] Tool "${tool.name}": ${msg}`);
  };

  // A consequential action must be able to describe itself before it runs;
  // without a preview the user would be confirming something unstated.
  if (tool.level === LEVEL.CONFIRM && typeof tool.buildPreview !== 'function') {
    fail('CONFIRM-level tools must define buildPreview() so the user sees exactly what will happen.');
  }

  // Confirmation is a human judgement about consequence, so the roles allowed
  // to make it must be roles with standing to do so.
  if (tool.level === LEVEL.CONFIRM) {
    const disallowed = tool.roles.filter((r) => SCOPED_ROLES.includes(r));
    if (disallowed.length > 0) {
      fail(`CONFIRM-level tools cannot be granted to ${disallowed.join(', ')}.`);
    }
  }

  const unknownRoles = tool.roles.filter(
    (r) => !DOMAIN_WIDE_ROLES.includes(r) && !SCOPED_ROLES.includes(r)
  );
  if (unknownRoles.length > 0) {
    fail(`declares unknown role(s): ${unknownRoles.join(', ')}.`);
  }

  // The rule that matters: a role which must only see its own slice cannot be
  // handed an unnarrowed tool.
  const needsNarrowing = tool.roles.filter((r) => SCOPED_ROLES.includes(r));
  if (needsNarrowing.length > 0 && (tool.scope === SCOPE.PRIVILEGED || tool.scope === SCOPE.NONE)) {
    fail(
      `grants ${needsNarrowing.join(', ')} access but declares scope ${tool.scope}. ` +
        'Roles without school-wide visibility require SELF or ASSIGNMENT scoping.'
    );
  }

  return tool;
};
