import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import AiConversation from '../../src/models/AiConversation.js';
import AiPendingAction from '../../src/models/AiPendingAction.js';
import Notice from '../../src/models/notice.model.js';
import Notification from '../../src/models/notification.model.js';
import ExamQuestion from '../../src/models/ExamQuestion.js';
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
 *   1. Side effects are avoided at source where possible. Published
 *      announcements target this suite's own users, so publishing fans out a
 *      handful of notifications instead of one per account in the database.
 *   2. The final test performs cleanup and then *asserts* that every shared
 *      collection is back to its starting count. A future test that writes
 *      somewhere new fails here loudly, rather than silently breaking an
 *      unrelated suite weeks later.
 */
// Real Atlas round trips, and publishNoticeService loops per recipient, so
// Jest's 5s default is unrealistic here.
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
    Notice,
    Notification,
    AuditLog,
    AuditModule,
    AuditAction,
    ExamQuestion,
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
    await ExamQuestion.deleteMany({ academicYear: 'AI-TEST-YEAR' });

    // Notifications reference the notice, so they go first while the ids still
    // resolve. Publishing creates one per recipient.
    const testNotices = await Notice.find({ title: /^AI test announcement/ }).select('_id');
    if (testNotices.length > 0) {
      await Notification.deleteMany({
        reference_id: { $in: testNotices.map((n) => n._id) },
        reference_model: 'Notice',
      });
    }
    await Notice.deleteMany({ title: /^AI test announcement/ });

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
        'getAcademicPerformance',
        'getOverdueBooks',
        'getTeacherWorkload',
        'getPendingMarks',
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
        .send({ tool: 'getChildResults', args: { studentId: '000000000000000000000000' } });

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
        .send({ tool: 'getOverdueBooks', conversationId });

      expect(second.status).toBe(200);
      expect(second.body.data.tool).toBe('getOverdueBooks');

      // Reading it back proves the row actually exists, not just that no error
      // was thrown.
      const fetched = await request(app)
        .get(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(fetched.status).toBe(200);
      expect(fetched.body.data.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('stays usable across a needs-input turn too', async () => {
      const first = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'generateExam', args: { grade: 'Grade 8' } });

      expect(first.body.data.type).toBe('needs_input');
      const conversationId = first.body.data.conversationId;

      const second = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'getOverdueBooks', conversationId });

      expect(second.status).toBe(200);
    });

    it('routes a natural-language question to a tool without an LLM', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'show me overdue library books' });

      expect(res.status).toBe(200);
      expect(res.body.data.tool).toBe('getOverdueBooks');
      expect(res.body.data.via).toBe('keyword');
    });

    it('keeps conversations private to their owner', async () => {
      const created = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ message: 'show me overdue library books' });

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

  describe('confirmation framework', () => {
    /**
     * Drafts through the tool, then narrows the audience to this suite's own
     * users.
     *
     * publishNoticeService notifies *every* account when a notice has no
     * explicit targets, so without this each publish test wrote a Notification
     * row per user in the shared database. Targeting keeps the fan-out to four
     * rows tied to users this suite deletes — the behaviour under test (does
     * publishing require confirmation?) is unaffected either way.
     */
    const draftAnnouncement = async (token, suffix = '') => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tool: 'draftAnnouncement',
          args: {
            title: `AI test announcement${suffix}`,
            content: 'Body text for an automated test announcement.',
          },
        });

      const noticeId = res.body?.data?.data?.noticeId;
      if (noticeId) {
        await Notice.findByIdAndUpdate(noticeId, {
          target_users: Object.values(users).map((u) => u._id),
        });
      }
      return res;
    };

    it('saves a draft without notifying anyone', async () => {
      const res = await draftAnnouncement(tokens.admin, ' draft');
      expect(res.status).toBe(200);
      expect(res.body.data.data.isPublished).toBe(false);

      const notice = await Notice.findById(res.body.data.data.noticeId);
      expect(notice.is_published).toBe(false);
      expect(notice.published_at).toBeNull();
    });

    it('does NOT publish when asked — it prepares and waits', async () => {
      const draft = await draftAnnouncement(tokens.admin, ' pending');
      const noticeId = draft.body.data.data.noticeId;

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId } });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('confirmation_required');
      expect(res.body.data.actionId).toBeTruthy();

      // The critical assertion: nothing happened yet.
      const notice = await Notice.findById(noticeId);
      expect(notice.is_published).toBe(false);
    });

    it('states the real blast radius in the preview', async () => {
      const draft = await draftAnnouncement(tokens.admin, ' radius');
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId: draft.body.data.data.noticeId } });

      const { preview } = res.body.data;
      expect(preview.impact).toMatch(/Notify \d+/);
      // Reflects the explicit targets set above, proving the count is read from
      // the notice rather than hardcoded to "everyone".
      expect(preview.details.recipients).toBe(Object.keys(users).length);
      expect(preview.details.targeting).toMatch(/specifically targeted/i);
    });

    it('publishes only after an explicit confirm request', async () => {
      const draft = await draftAnnouncement(tokens.admin, ' confirm');
      const noticeId = draft.body.data.data.noticeId;

      const prepared = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId } });

      const confirmed = await request(app)
        .post(`/api/ai/actions/${prepared.body.data.actionId}/confirm`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(confirmed.status).toBe(200);
      expect(confirmed.body.data.type).toBe('action_executed');

      const notice = await Notice.findById(noticeId);
      expect(notice.is_published).toBe(true);
    });

    it("refuses to execute another user's prepared action", async () => {
      const draft = await draftAnnouncement(tokens.admin, ' hijack');
      const prepared = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId: draft.body.data.data.noticeId } });

      const hijack = await request(app)
        .post(`/api/ai/actions/${prepared.body.data.actionId}/confirm`)
        .set('Authorization', `Bearer ${tokens.teacher}`);

      expect(hijack.status).toBe(404);

      const notice = await Notice.findById(draft.body.data.data.noticeId);
      expect(notice.is_published).toBe(false);
    });

    it('refuses to execute the same action twice', async () => {
      const draft = await draftAnnouncement(tokens.admin, ' twice');
      const prepared = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId: draft.body.data.data.noticeId } });

      const actionId = prepared.body.data.actionId;
      await request(app)
        .post(`/api/ai/actions/${actionId}/confirm`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      const replay = await request(app)
        .post(`/api/ai/actions/${actionId}/confirm`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(replay.status).toBe(409);
    });

    it('refuses an expired action', async () => {
      const draft = await draftAnnouncement(tokens.admin, ' expired');
      const prepared = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId: draft.body.data.data.noticeId } });

      await AiPendingAction.findByIdAndUpdate(prepared.body.data.actionId, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .post(`/api/ai/actions/${prepared.body.data.actionId}/confirm`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.status).toBe(410);

      const notice = await Notice.findById(draft.body.data.data.noticeId);
      expect(notice.is_published).toBe(false);
    });

    it('cancelling leaves the record untouched', async () => {
      const draft = await draftAnnouncement(tokens.admin, ' cancel');
      const prepared = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId: draft.body.data.data.noticeId } });

      const cancelled = await request(app)
        .delete(`/api/ai/actions/${prepared.body.data.actionId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(cancelled.status).toBe(200);

      const replay = await request(app)
        .post(`/api/ai/actions/${prepared.body.data.actionId}/confirm`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(replay.status).toBe(409);

      const notice = await Notice.findById(draft.body.data.data.noticeId);
      expect(notice.is_published).toBe(false);
    });

    it('blocks a teacher from preparing a consequential action', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({ tool: 'publishAnnouncement', args: { noticeId: '000000000000000000000000' } });

      expect(res.status).toBe(403);
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

    it('reports pending marks', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ tool: 'getPendingMarks' });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveProperty('pendingCount');
    });

    it('blocks a teacher from the school-wide aggregations', async () => {
      for (const tool of ['getMissingTeachingLogs', 'getTeacherWorkload', 'getPendingMarks']) {
        const res = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${tokens.teacher}`)
          .send({ tool });
        expect(res.status).toBe(403);
      }
    });
  });

  describe('exam intelligence', () => {
    const banked = 'Explain three causes of soil erosion in highland areas.';

    beforeAll(async () => {
      await ExamQuestion.deleteMany({ academicYear: 'AI-TEST-YEAR' });
      await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'addExamQuestions',
          args: {
            questions: [{ text: banked, marks: 6, topic: 'Soil', difficulty: 'moderate' }],
            meta: { academicYear: 'AI-TEST-YEAR', term: 'Term 1', subjectName: 'Geography' },
          },
        });
    });

    it('banks a question and skips it if added again', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'addExamQuestions',
          args: {
            questions: [{ text: banked, marks: 6 }],
            meta: { academicYear: 'AI-TEST-YEAR' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.data.addedCount).toBe(0);
      expect(res.body.data.data.skippedCount).toBe(1);
    });

    it('detects a verbatim repeat', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({ tool: 'checkExamSimilarity', args: { text: banked } });

      expect(res.status).toBe(200);
      expect(res.body.data.data.verdict).toBe('exact-duplicate');
      expect(res.body.data.data.reviewRecommended).toBe(true);
    });

    it('detects a re-worded repeat, which is the whole point', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'checkExamSimilarity',
          args: { text: 'Describe three factors responsible for soil erosion in highland areas.' },
        });

      expect(res.body.data.data.reviewRecommended).toBe(true);
      expect(res.body.data.data.highestSimilarity).toBeGreaterThanOrEqual(0.65);
      expect(res.body.data.data.matches[0].text).toBe(banked);
    });

    it('does not flag an unrelated question', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'checkExamSimilarity',
          args: { text: 'State Newton’s second law of motion and give its equation.' },
        });

      expect(res.body.data.data.reviewRecommended).toBe(false);
    });

    it('catches a marks total that does not add up', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'reviewExamQuality',
          args: {
            questions: [
              { text: 'Define erosion.', marks: 4, topic: 'Soil' },
              { text: 'Describe two farming methods.', marks: 5, topic: 'Farming' },
            ],
            expectedTotalMarks: 20,
          },
        });

      const data = res.body.data.data;
      expect(data.totalMarks).toBe(9);
      expect(data.structureValid).toBe(false);
      expect(data.issues.some((i) => i.type === 'marks-mismatch')).toBe(true);
    });

    it('catches two questions on the same paper asking the same thing', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'reviewExamQuality',
          args: {
            questions: [
              { text: 'Explain three causes of flooding.', marks: 6, topic: 'Water' },
              { text: 'Describe three factors responsible for flooding.', marks: 6, topic: 'Water' },
            ],
          },
        });

      const data = res.body.data.data;
      expect(data.internalDuplicates.length).toBeGreaterThan(0);
      expect(data.issues.some((i) => i.type === 'internal-repetition')).toBe(true);
    });

    it('passes a well-formed paper', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'reviewExamQuality',
          args: {
            questions: [
              { text: 'State Newton’s first law of motion.', marks: 5, topic: 'Motion', difficulty: 'easy' },
              { text: 'Calculate the momentum of a 4kg body moving at 3m/s.', marks: 5, topic: 'Momentum', difficulty: 'moderate' },
            ],
            expectedTotalMarks: 10,
          },
        });

      const data = res.body.data.data;
      expect(data.structureValid).toBe(true);
      expect(data.totalMarks).toBe(10);
      expect(data.topicCoverage).toHaveLength(2);
    });

    it('rejects an oversized batch rather than accepting unbounded work', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .send({
          tool: 'reviewExamQuality',
          args: { questions: Array.from({ length: 200 }, () => ({ text: 'A question.', marks: 1 })) },
        });

      expect(res.status).toBe(400);
    });

    it('blocks a student from the exam tools', async () => {
      for (const tool of ['checkExamSimilarity', 'reviewExamQuality', 'addExamQuestions']) {
        const res = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${tokens.student}`)
          .send({ tool, args: { text: 'x'.repeat(10), questions: [{ text: 'A question.' }] } });
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
