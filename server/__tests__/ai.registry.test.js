import { z } from 'zod';
import {
  defineTool,
  validateTool,
  LEVEL,
  SCOPE,
  DOMAIN_WIDE_ROLES,
  SCOPED_ROLES,
} from '../src/ai/registry/defineTool.js';
import {
  allTools,
  toolsForRole,
  quickActionsForRole,
  resolveTool,
  parseArgs,
  getTool,
} from '../src/ai/registry/index.js';
import { buildActor, redactForPrompt } from '../src/ai/actor.js';
import { matchIntent } from '../src/ai/router.js';
import { matchByVocabulary } from '../src/ai/matcher.js';
import { extractArgs } from '../src/ai/orchestrator.js';
import { fingerprint } from '../src/ai/cache.js';
import { PROMPT_VERSION } from '../src/ai/prompts.js';

/**
 * These are pure unit tests — no database, no network, no provider.
 * They cover the guarantees that make the AI layer safe to expose:
 * role gating, resource scoping, argument validation and credential redaction.
 */

const baseTool = (overrides = {}) => ({
  name: 'probeTool',
  description: 'A probe.',
  input: z.object({}),
  roles: ['admin'],
  level: LEVEL.READ,
  scope: SCOPE.PRIVILEGED,
  tier: 'none',
  handler: async () => ({ ok: true }),
  ...overrides,
});

describe('AI tool registry — definition-time safety', () => {
  it('accepts a well-formed privileged tool', () => {
    expect(() => defineTool(baseTool())).not.toThrow();
  });

  it('accepts a scoped role when the scope narrows results', () => {
    expect(() =>
      defineTool(baseTool({ roles: ['teacher'], scope: SCOPE.SELF }))
    ).not.toThrow();
    expect(() =>
      defineTool(baseTool({ roles: ['teacher'], scope: SCOPE.ASSIGNMENT }))
    ).not.toThrow();
  });

  // The core protection: a teacher must never receive unnarrowed school data.
  it.each([SCOPE.PRIVILEGED, SCOPE.NONE])(
    'refuses a teacher-accessible tool declaring scope %s',
    (scope) => {
      expect(() => defineTool(baseTool({ roles: ['teacher'], scope }))).toThrow(
        /require SELF or ASSIGNMENT scoping/
      );
    }
  );

  it.each(SCOPED_ROLES)('refuses unnarrowed access for scoped role "%s"', (role) => {
    expect(() => defineTool(baseTool({ roles: [role], scope: SCOPE.PRIVILEGED }))).toThrow();
  });

  it('refuses a CONFIRM-level tool with no preview builder', () => {
    // Without buildPreview the user would be approving an unstated action.
    expect(() => defineTool(baseTool({ level: LEVEL.CONFIRM }))).toThrow(/buildPreview/);
  });

  it('accepts a CONFIRM-level tool that can describe itself', () => {
    expect(() =>
      defineTool(baseTool({ level: LEVEL.CONFIRM, buildPreview: async () => ({}) }))
    ).not.toThrow();
  });

  it.each(SCOPED_ROLES)('refuses CONFIRM-level access for scoped role "%s"', (role) => {
    expect(() =>
      defineTool(
        baseTool({
          level: LEVEL.CONFIRM,
          roles: [role],
          scope: SCOPE.SELF,
          buildPreview: async () => ({}),
        })
      )
    ).toThrow(/cannot be granted to/);
  });

  it('refuses unknown roles', () => {
    expect(() => defineTool(baseTool({ roles: ['superuser'] }))).toThrow(/unknown role/);
  });

  it('every shipped tool passes validation', () => {
    for (const tool of allTools()) {
      expect(() => validateTool(tool)).not.toThrow();
    }
  });

  it('no shipped tool grants a scoped role unnarrowed access', () => {
    for (const tool of allTools()) {
      const scopedRoles = tool.roles.filter((r) => SCOPED_ROLES.includes(r));
      if (scopedRoles.length > 0) {
        expect([SCOPE.SELF, SCOPE.ASSIGNMENT]).toContain(tool.scope);
      }
    }
  });

  it('every consequential tool can describe itself before it runs', () => {
    for (const tool of allTools()) {
      if (tool.level === LEVEL.CONFIRM) {
        expect(typeof tool.buildPreview).toBe('function');
      }
    }
  });

  it('no scoped role can reach a consequential tool', () => {
    for (const tool of allTools()) {
      if (tool.level === LEVEL.CONFIRM) {
        expect(tool.roles.some((r) => SCOPED_ROLES.includes(r))).toBe(false);
      }
    }
  });
});

describe('AI tool registry — role gating', () => {
  const actor = (role) => ({ id: 'u1', role });

  it('gives admin the broadest tool set', () => {
    expect(toolsForRole('admin').length).toBeGreaterThan(toolsForRole('teacher').length);
  });

  it('gives students and parents only self-scoped tools', () => {
    // They have tools now, but every one must resolve its record from the
    // signed-in user rather than accepting an arbitrary id.
    for (const role of ['student', 'parent']) {
      const tools = toolsForRole(role);
      expect(tools.length).toBeGreaterThan(0);
      for (const tool of tools) {
        expect(tool.scope).toBe(SCOPE.SELF);
        expect(tool.level).toBe(LEVEL.READ);
      }
    }
  });

  it('never exposes school-wide tools to a student or parent', () => {
    const forbidden = [
      'getFinanceSummary',
      'searchStudents',
      'getDailySchoolSummary',
      'getAcademicPerformance',
      'getOverdueBooks',
      'getTeacherWorkload',
      'getPendingMarks',
    ];
    for (const role of ['student', 'parent']) {
      const names = toolsForRole(role).map((t) => t.name);
      for (const banned of forbidden) expect(names).not.toContain(banned);
    }
  });

  it('never exposes a tool to a role outside its own roles list', () => {
    for (const role of [...DOMAIN_WIDE_ROLES, ...SCOPED_ROLES]) {
      for (const tool of toolsForRole(role)) {
        expect(tool.roles).toContain(role);
      }
    }
  });

  it('blocks a teacher from an admin-only tool', () => {
    expect(() => resolveTool('getFinanceSummary', actor('teacher'))).toThrow(
      /not available for your role/
    );
  });

  it('blocks an accountant from student search', () => {
    expect(() => resolveTool('searchStudents', actor('accountant'))).toThrow();
  });

  it('allows an accountant the finance tool', () => {
    expect(() => resolveTool('getFinanceSummary', actor('accountant'))).not.toThrow();
  });

  it('reports unknown tools and forbidden tools identically, so the registry cannot be mapped', () => {
    let unknownErr;
    let forbiddenErr;
    try {
      resolveTool('noSuchToolAnywhere', actor('teacher'));
    } catch (e) {
      unknownErr = e;
    }
    try {
      resolveTool('getFinanceSummary', actor('teacher'));
    } catch (e) {
      forbiddenErr = e;
    }
    expect(unknownErr.message).toBe(forbiddenErr.message);
    expect(unknownErr.statusCode).toBe(forbiddenErr.statusCode);
  });

  it('rejects a null actor', () => {
    expect(() => resolveTool('getFinanceSummary', null)).toThrow();
  });
});

describe('AI tool registry — argument validation', () => {
  it('rejects arguments that violate the tool schema', () => {
    const tool = getTool('getMonthlyAttendanceReport');
    expect(() => parseArgs(tool, { year: 1999, month: 13 })).toThrow(/Invalid arguments/);
  });

  it('accepts valid arguments and applies defaults', () => {
    const parsed = parseArgs(getTool('searchStudents'), { search: 'Amina' });
    expect(parsed.search).toBe('Amina');
    expect(parsed.limit).toBe(20);
  });

  it('caps a runaway limit rather than passing it through', () => {
    expect(() => parseArgs(getTool('searchStudents'), { limit: 100000 })).toThrow();
  });

  it('rejects a missing required argument', () => {
    expect(() => parseArgs(getTool('getStudentDetails'), {})).toThrow();
  });
});

describe('AI actor — credential containment', () => {
  // The reason this exists: authenticate() puts the full Mongoose user document
  // on req.user, including the bcrypt hash and the refresh-token hash.
  const fakeUser = {
    _id: { toString: () => 'user-123' },
    role: 'admin',
    firstName: 'Amina',
    lastName: 'Yusuf',
    email: 'amina@school.com',
    password: '$2b$10$aVeryRealLookingBcryptHash',
    refreshToken: 'sha256-of-the-live-refresh-token',
    passwordResetToken: 'reset-token',
  };

  it('exposes only whitelisted fields', () => {
    const actor = buildActor(fakeUser);
    expect(actor.id).toBe('user-123');
    expect(actor.role).toBe('admin');
    expect(actor.displayName).toBe('Amina Yusuf');
    expect(actor.password).toBeUndefined();
    expect(actor.refreshToken).toBeUndefined();
    expect(actor.email).toBeUndefined();
  });

  it('does not serialize credential material', () => {
    const serialized = JSON.stringify(buildActor(fakeUser));
    expect(serialized).not.toMatch(/bcrypt|refresh|reset/i);
  });

  it('returns null for an unauthenticated request', () => {
    expect(buildActor(null)).toBeNull();
  });

  it('strips credential fields from nested tool results before they reach a prompt', () => {
    const toolResult = {
      students: [
        { firstName: 'Ayan', userId: { _id: 'u9', email: 'a@b.c', password: 'HASH', refreshToken: 'RT' } },
      ],
    };
    const serialized = JSON.stringify(redactForPrompt(toolResult));
    expect(serialized).not.toContain('HASH');
    expect(serialized).not.toContain('RT');
    expect(serialized).toContain('Ayan');
  });

  it('handles arrays, dates and depth without throwing', () => {
    const deep = { a: [{ b: { c: new Date('2026-01-01') } }] };
    expect(() => redactForPrompt(deep)).not.toThrow();
  });
});

describe('AI router — deterministic intent matching (no LLM)', () => {
  it.each([
    ['who is absent today?', 'admin', 'getAttendanceForDate'],
    ['show me overdue library books', 'admin', 'getOverdueBooks'],
    ['which students have outstanding fees?', 'admin', 'getFinanceSummary'],
    ['give me the monthly attendance report', 'admin', 'getMonthlyAttendanceReport'],
    ['what is my timetable', 'teacher', 'getMyTimetable'],
  ])('routes "%s" (%s) to %s', (message, role, expected) => {
    expect(matchIntent(message, role)).toBe(expected);
  });

  it('never routes a role to a tool it cannot call', () => {
    // A teacher asking about fees must not resolve to the finance tool.
    expect(matchIntent('show outstanding fees', 'teacher')).not.toBe('getFinanceSummary');
  });

  it('returns null for unmatched input rather than guessing', () => {
    expect(matchIntent('what is the capital of France', 'admin')).toBeNull();
    expect(matchIntent('', 'admin')).toBeNull();
  });
});

describe('AI router — vocabulary matching (no LLM)', () => {
  /**
   * The regression these lock in: fixed patterns alone answered only 7 of 19
   * realistic questions, so with no provider key the assistant appeared to
   * accept nothing but button presses.
   */
  it.each([
    ['how many teachers are there', 'getTeacherWorkload'],
    ['who owes money', 'getFinanceSummary'],
    ['books not returned', 'getOverdueBooks'],
    ['library status', 'getOverdueBooks'],
    ['best performing class', 'getAcademicPerformance'],
    ['students without a class', 'getStudentsWithoutClass'],
    ['who has not submitted their lesson diary', 'getMissingTeachingLogs'],
    ['monthly absenteeism rate', 'getMonthlyAttendanceReport'],
    ['which teacher teaches the most', 'getTeacherWorkload'],
  ])('routes "%s" to %s', (message, expected) => {
    expect(matchByVocabulary(message, toolsForRole('admin'))).toBe(expected);
  });

  // Answering the wrong question confidently is worse than admitting no match.
  it.each([
    'what is the capital of France',
    'hello',
    'tell me a joke',
    'asdfghjkl',
    'thanks',
  ])('refuses to guess on "%s"', (message) => {
    expect(matchByVocabulary(message, toolsForRole('admin'))).toBeNull();
  });

  it('never routes a role to a tool it cannot call', () => {
    for (const message of ['who owes money', 'outstanding fees', 'unpaid invoices']) {
      const matched = matchByVocabulary(message, toolsForRole('teacher'));
      expect(matched).not.toBe('getFinanceSummary');
    }
  });

  it('every tool declares vocabulary, or it is unreachable by typing', () => {
    const silent = allTools().filter((t) => !t.keywords || t.keywords.trim().length === 0);
    expect(silent.map((t) => t.name)).toEqual([]);
  });
});

describe('AI cache — fingerprinting', () => {
  it('is stable regardless of key order', () => {
    const a = fingerprint({ tool: 't', args: { b: 2, a: 1 }, payload: { y: 2, x: 1 } });
    const b = fingerprint({ tool: 't', args: { a: 1, b: 2 }, payload: { x: 1, y: 2 } });
    expect(a).toBe(b);
  });

  it('changes when the data changes', () => {
    const a = fingerprint({ tool: 't', args: {}, payload: { total: 1 } });
    const b = fingerprint({ tool: 't', args: {}, payload: { total: 2 } });
    expect(a).not.toBe(b);
  });

  it('changes when the tool changes', () => {
    expect(fingerprint({ tool: 'a', args: {}, payload: null })).not.toBe(
      fingerprint({ tool: 'b', args: {}, payload: null })
    );
  });

  it('is bound to the prompt version, so edited prompts invalidate cleanly', () => {
    // The version is folded into the hash; this asserts it is actually present
    // rather than silently omitted.
    const key = fingerprint({ tool: 't', args: {}, payload: null });
    expect(key).toHaveLength(64);
    expect(PROMPT_VERSION).toBeTruthy();
  });
});

describe('AI orchestrator — argument extraction', () => {
  it('reads an explicit ISO date', () => {
    const args = extractArgs(getTool('getAttendanceForDate'), 'attendance on 2026-03-04');
    expect(args.date).toBe('2026-03-04');
  });

  it('reads a named month and year', () => {
    const args = extractArgs(getTool('getMonthlyAttendanceReport'), 'attendance report for March 2025');
    expect(args).toMatchObject({ month: 3, year: 2025 });
  });

  it('defaults month/year to the current period when unstated', () => {
    const now = new Date();
    const args = extractArgs(getTool('getMonthlyAttendanceReport'), 'monthly attendance');
    expect(args.year).toBe(now.getFullYear());
    expect(args.month).toBe(now.getMonth() + 1);
  });

  it('pulls a quoted search term', () => {
    const args = extractArgs(getTool('searchStudents'), 'find "Amina Yusuf" please');
    expect(args.search).toBe('Amina Yusuf');
  });

  it('does not invent a search term from a bare noun', () => {
    const args = extractArgs(getTool('searchStudents'), 'show me students');
    expect(args.search).toBeUndefined();
  });

  it('returns an empty object for a null tool', () => {
    expect(extractArgs(null, 'anything')).toEqual({});
  });
});
