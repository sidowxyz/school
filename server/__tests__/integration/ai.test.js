import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import AiConversation from '../../src/models/AiConversation.js';
import AiPendingAction from '../../src/models/AiPendingAction.js';
import AuditLog from '../../src/models/auditLog.model.js';
import AuditModule from '../../src/models/auditModule.model.js';
import AuditAction from '../../src/models/auditAction.model.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';
import { AI_AUDIT_MODULE } from '../../src/ai/orchestrator.js';

/**
 * Route-level tests for the assistant.
 *
 * These deliberately exercise the security boundary rather than the data:
 * authentication, per-role tool access, input validation and audit writes.
 * Tool *results* depend on seeded school data, so the assertions here check
 * shape and permission rather than specific numbers.
 *
 * Isolation
 * ---------
 * The whole suite runs against a shared Atlas database that sixteen other
 * suites also use, and several of them are order-dependent — they read state
 * earlier suites created. Anything this file leaves behind therefore breaks
 * tests elsewhere, which is exactly what happened: leftover audit rows broke
 * audit.test.js in a full run while it passed in isolation.
 *
 * Two measures keep that from recurring:
 *
 *   1. Side effects are avoided at source where possible: every account this
 *      suite creates is scoped to its own @ai-test.local users.
 *   2. The final test performs cleanup and then *asserts* that every shared
 *      collection is back to its starting count. A future test that writes
 *      somewhere new fails here loudly, rather than silently breaking an
 *      unrelated suite weeks later.
 */
// Real database round trips, so Jest's 5s default is unrealistic here.
jest.setTimeout(120000);

describe('AI Assistant routes', () => {
  const users = {};
  const tokens = {};

  const makeUser = async (role, email) => {
    const user = await User.create({
      firstName: role,
      lastName: 'Tester',
      email,
      password: 'TestPassword123!',
      role,
      status: true,
    });
    users[role] = user;
    tokens[role] = generateAccessToken(user);
    return user;
  };

  /**
   * Every shared collection this suite can touch, so the closing test can prove
   * it left none of them changed.
   */
  const SHARED_COLLECTIONS = {
    User,
    AuditLog,
    AuditModule,
    AuditAction,
    AiConversation,
    AiPendingAction,
  };
  const baselineCounts = {};

  beforeAll(async () => {
    // Connection is established by jest.setup.js's global beforeAll against the
    // isolated SMS_Test database — never connect here.
    await User.deleteMany({ email: /@ai-test\.local$/ });
    await AiConversation.deleteMany({});
    await AiPendingAction.deleteMany({});

    // Snapshot before creating anything, so the leak check has a true zero.
    for (const [name, Model] of Object.entries(SHARED_COLLECTIONS)) {
      baselineCounts[name] = await Model.countDocuments({});
    }

    await makeUser('admin', 'admin@ai-test.local');
    await makeUser('teacher', 'teacher@ai-test.local');
    await makeUser('accountant', 'accountant@ai-test.local');
    await makeUser('student', 'student@ai-test.local');
    await makeUser('parent', 'parent@ai-test.local');
  });

  /**
   * Removes everything this suite created from shared collections.
   *
   * Exported as a function rather than living in afterAll so the closing test
   * can run it and then verify it worked — a cleanup nobody checks is how the
   * original leak survived.
   */
  const cleanUpSharedState = async () => {
    await User.deleteMany({ email: /@ai-test\.local$/ });
    await AiConversation.deleteMany({});
    await AiPendingAction.deleteMany({});

    // Every tool execution writes an audit row by design, plus the AIAssistant
    // module and AI_* action lookups. Scoped to those — other suites' audit
    // data is not ours to delete.
    const aiModule = await AuditModule.findOne({ module_name: AI_AUDIT_MODULE });
    if (aiModule) {
      await AuditLog.deleteMany({ module_no: aiModule._id });
      await AuditModule.deleteOne({ _id: aiModule._id });
    }
    const aiActions = await AuditAction.find({ action_name: /^AI_/ }).select('_id');
    if (aiActions.length > 0) {
      const ids = aiActions.map((a) => a._id);
      await AuditLog.deleteMany({ action_no: { $in: ids } });
      await AuditAction.deleteMany({ _id: { $in: ids } });
    }
  };

  // Belt and braces: if the closing test is skipped or the suite aborts early,
  // shared state is still restored.
  afterAll(cleanUpSharedState);

  describe('authentication', () => {
    it('rejects an unauthenticated chat request', async () => {
      const res = await request(app).post('/api/ai/chat').send({ message: 'hello' });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated quick-action requests', async () => {
      const res = await request(app).get('/api/ai/quick-actions');
      expect(res.status).toBe(401);
    });

    it('rejects a malformed token', async () => {
      const res = await request(app)
        .get('/api/ai/quick-actions')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });
  });

  describe('quick actions are role-aware', () => {
    it('gives an admin a non-empty set', async () => {
      const res = await request(app)
        .get('/api/ai/quick-actions')
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('gives a student only their own record', async () => {
      const res = await request(app)
        .get('/api/ai/quick-actions')
        .set('Authorization', `Bearer ${tokens.student}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Every student action is about their own data, never the school's.
      for (const action of res.body.data) {
        expect(action.group).toBe('My record');
      }
    });

    it('never offers a teacher an admin-only tool', async () => {
      const res = await request(app)
        .get('/api/ai/quick-actions')
        .set('Authorization', `Bearer ${tokens.teacher}`);

      const toolNames = res.body.data.map((a) => a.tool);
      expect(toolNames).not.toContain('getFinanceSummary');
      expect(toolNames).not.toContain('searchStudents');
    });
  });

  describe('tool authorization is enforced server-side', () => {
    it('blocks a teacher invoking the finance tool directly', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({ tool: 'getFinanceSummary' });

      expect(res.status).toBe(403);
    });

    it('blocks a student from every school-wide tool', async () => {
      // The point of giving students tools at all is that they see only their
      // own record. This asserts the boundary rather than assuming it.
      for (const tool of [
        'getDailySchoolSummary',
        'searchStudents',
        'getFinanceSummary',
        'getTeacherWorkload',
        'getMissingTeachingLogs',
      ]) {
        const res = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${tokens.student}`)
          .send({ tool });
        expect(res.status).toBe(403);
      }
    });

    it('blocks a parent from another family\'s child', async () => {
      // getLinkedChild rejects a student not linked to this guardian, so a
      // guessed id resolves to nothing rather than another family's data.
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.parent}`)
        .send({ tool: 'getChildFees', args: { studentId: '000000000000000000000000' } });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(200);
    });

    it('blocks a teacher from student-portal tools', async () => {
      for (const tool of ['getMyGrades', 'getMyFees', 'getMyChildren']) {
        const res = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${tokens.teacher}`)
          .send({ tool });
        expect(res.status).toBe(403);
      }
    });

    it('returns the same 403 for an unknown tool, so the registry cannot be mapped', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({ tool: 'getSecretBackdoor' });

      expect(res.status).toBe(403);
    });

    it('allows an accountant the finance tool', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.accountant}`)
        .send({ tool: 'getFinanceSummary' });

      expect(res.status).toBe(200);
      expect(res.body.data.tool).toBe('getFinanceSummary');
    });
  });

  describe('input validation', () => {
    it('rejects a request with neither message nor tool', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects an over-long message', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'x'.repeat(5000) });

      expect(res.status).toBe(400);
    });

    it('rejects page context outside the whitelist', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          message: 'hello',
          pageContext: { pageType: 'students', secretPayload: 'should-be-rejected' },
        });

      expect(res.status).toBe(400);
    });

    it('rejects a tool name containing path characters', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: '../../etc/passwd' });

      expect(res.status).toBe(400);
    });
  });

  describe('conversational behaviour', () => {
    it('returns a graceful prompt when nothing matches, rather than erroring', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'what is the capital of France' });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('text');
      expect(res.body.data.tool).toBeNull();
      expect(res.body.data.conversationId).toBeTruthy();
    });

    /**
     * Regression test for a real bug: a conversation only got saved once a
     * tool executed. Every other response type — no match, needs-input — still
     * carried the conversation's _id (Mongoose assigns it on construction,
     * before save()), so the id looked valid but pointed at nothing in the
     * database. Every subsequent request against it 404'd with "Conversation
     * not found" until the user started a new thread — reported as the
     * assistant becoming permanently unusable after one unmatched message.
     */
    it('returns a conversationId that is immediately usable, even when nothing matched', async () => {
      const first = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'what is the capital of France' });

      const conversationId = first.body.data.conversationId;

      const second = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'getFinanceSummary', conversationId });

      expect(second.status).toBe(200);
      expect(second.body.data.tool).toBe('getFinanceSummary');

      // Reading it back proves the row actually exists, not just that no error
      // was thrown.
      const fetched = await request(app)
        .get(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(fetched.status).toBe(200);
      expect(fetched.body.data.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('routes a natural-language question to a tool without an LLM', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'who is absent today' });

      expect(res.status).toBe(200);
      expect(res.body.data.tool).toBe('getAttendanceForDate');
      expect(res.body.data.via).toBe('keyword');
    });

    it('keeps conversations private to their owner', async () => {
      const created = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'who is absent today' });

      const { conversationId } = created.body.data;
      expect(conversationId).toBeTruthy();

      const asOwner = await request(app)
        .get(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(asOwner.status).toBe(200);

      const asOther = await request(app)
        .get(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokens.teacher}`);
      expect(asOther.status).toBe(404);
    });
  });

  describe('phase 2 aggregations', () => {
    it('reports teachers missing a teaching log', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'getMissingTeachingLogs' });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveProperty('totalActiveTeachers');
      expect(res.body.data.data).toHaveProperty('missingCount');
    });

    it('reports teacher workload', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'getTeacherWorkload' });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveProperty('totalPeriodsPerWeek');
    });

    it('blocks a teacher from the school-wide aggregations', async () => {
      for (const tool of ['getMissingTeachingLogs', 'getTeacherWorkload']) {
        const res = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${tokens.teacher}`)
          .send({ tool });
        expect(res.status).toBe(403);
      }
    });
  });

  describe('audit trail', () => {
    it('records tool executions under the AIAssistant module', async () => {
      await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.accountant}`)
        .send({ tool: 'getFinanceSummary' });

      // logAudit is fire-and-forget relative to the response; poll briefly.
      let moduleDoc = null;
      for (let i = 0; i < 40 && !moduleDoc; i += 1) {
        moduleDoc = await AuditModule.findOne({ module_name: AI_AUDIT_MODULE });
        if (!moduleDoc) await new Promise((r) => setTimeout(r, 150));
      }
      expect(moduleDoc).toBeTruthy();

      const log = await AuditLog.findOne({
        module_no: moduleDoc._id,
        user_id: users.accountant._id,
      }).sort({ createdAt: -1 });

      expect(log).toBeTruthy();
      expect(log.record_id).toBe('getFinanceSummary');
    });

    it('does not write argument values or record data into the audit trail', async () => {
      await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'find "Confidential Name" in students' });

      const moduleDoc = await AuditModule.findOne({ module_name: AI_AUDIT_MODULE });
      if (!moduleDoc) return; // covered by the previous test

      const logs = await AuditLog.find({ module_no: moduleDoc._id })
        .sort({ createdAt: -1 })
        .limit(5);

      for (const log of logs) {
        expect(JSON.stringify(log.after_changes ?? {})).not.toContain('Confidential Name');
      }
    });
  });

  /**
   * Declared last so it runs last.
   *
   * Sixteen other suites share this database and several read state earlier
   * suites created, so anything left behind here surfaces as an unrelated
   * failure elsewhere — which is precisely how leftover audit rows broke
   * audit.test.js while this file passed in isolation.
   *
   * Asserting the restore, rather than trusting it, means a future test that
   * writes somewhere new fails here by name instead of silently.
   */
  describe('shared-state isolation', () => {
    it('leaves every shared collection exactly as it found it', async () => {
      await cleanUpSharedState();

      const leaked = [];
      for (const [name, Model] of Object.entries(SHARED_COLLECTIONS)) {
        const now = await Model.countDocuments({});
        const delta = now - baselineCounts[name];
        if (delta !== 0) {
          leaked.push(`${name}: ${baselineCounts[name]} -> ${now} (${delta > 0 ? '+' : ''}${delta})`);
        }
      }

      // Named collections in the failure message, so the next person sees
      // immediately what leaked rather than bisecting a full-suite run.
      expect(leaked).toEqual([]);
    });
  });
});
