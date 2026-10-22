import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Teacher from '../../src/models/Teacher.js';
import TeacherAssignment from '../../src/models/TeacherAssignment.js';
import AssignmentSubmission from '../../src/models/AssignmentSubmission.js';
import AuditLog from '../../src/models/auditLog.model.js';
import AuditModule from '../../src/models/auditModule.model.js';
import AuditAction from '../../src/models/auditAction.model.js';
import Level from '../../src/models/Level.js';
import Year from '../../src/models/Year.js';
import Class from '../../src/models/Class.js';
import Section from '../../src/models/Section.js';
import Subject from '../../src/models/Subject.js';
import Term from '../../src/models/Term.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

jest.setTimeout(60000);

/**
 * Route-level tests for the two upload-review endpoints.
 *
 * Attaches real .txt files via supertest's .attach() rather than mocking the
 * upload layer — text extraction for .txt is a straight buffer read (no
 * pdf-parse/mammoth involved), so this exercises the real multer + extraction
 * + segmentation + review pipeline end to end, the same way the request
 * actually flows in production. .pdf/.docx parsing is covered separately by
 * unit tests against the underlying libraries' own output shape; what matters
 * here is the pipeline around extraction, not extraction itself.
 */
describe('AI upload-review routes', () => {
  const tokens = {};
  let studentInClass;
  let studentOutsideClass;
  // Precise ids for teardown — a filterless deleteMany on a shared collection
  // like Section would wipe every other suite's fixtures too, since
  // integration tests run --runInBand against one shared SMS_Test database.
  const fixtureIds = {};

  beforeAll(async () => {
    await User.deleteMany({ email: /@ai-upload-test\.local$/ });

    const admin = await User.create({
      firstName: 'UploadAdmin', lastName: 'T', email: 'admin@ai-upload-test.local',
      password: 'TestPassword123!', role: 'admin', status: true,
    });
    const teacherUser = await User.create({
      firstName: 'UploadTeacher', lastName: 'T', email: 'teacher@ai-upload-test.local',
      password: 'TestPassword123!', role: 'teacher', status: true,
    });
    const otherTeacherUser = await User.create({
      firstName: 'OtherTeacher', lastName: 'T', email: 'other-teacher@ai-upload-test.local',
      password: 'TestPassword123!', role: 'teacher', status: true,
    });
    const studentUser = await User.create({
      firstName: 'UploadStudent', lastName: 'T', email: 'student@ai-upload-test.local',
      password: 'TestPassword123!', role: 'student', status: true,
    });

    tokens.admin = generateAccessToken(admin);
    tokens.teacher = generateAccessToken(teacherUser);
    tokens.otherTeacher = generateAccessToken(otherTeacherUser);
    tokens.student = generateAccessToken(studentUser);

    // This suite's own fixtures, matching the pattern every sibling
    // integration test uses — SMS_Test starts empty, nothing is pre-seeded.
    const suffix = `UPT-${Date.now()}`;
    const level = await Level.create({ lev_no: suffix, lev_name: 'Upload Test Level' });
    const year = await Year.create({ y_no: suffix, y_name: '2026-upload-test' });
    const classA = await Class.create({ cl_no: `${suffix}-A`, cl_name: 'Upload Test Class A', lev_no: level._id });
    const classB = await Class.create({ cl_no: `${suffix}-B`, cl_name: 'Upload Test Class B', lev_no: level._id });
    const sectionA = await Section.create({ name: 'A', class: classA._id });
    const sectionB = await Section.create({ name: 'A', class: classB._id });
    const subject = await Subject.create({ sub_no: suffix, sub_name: 'Upload Test Subject' });
    const term = await Term.create({ name: 'Upload Test Term', academicYearId: year._id, status: 'active' });

    studentInClass = await Student.create({
      firstName: 'InClass', lastName: 'Student', admissionNumber: `${suffix}-IN`,
      gender: 'Male', birthDate: new Date('2012-01-01'),
      classId: classA._id, sectionId: sectionA._id,
      phoneNumber: '0610000001', address: 'Test City', parentName: 'Test Parent',
      parentPhoneNumber: '0610000002',
    });
    studentOutsideClass = await Student.create({
      firstName: 'Outside', lastName: 'Student', admissionNumber: `${suffix}-OUT`,
      gender: 'Female', birthDate: new Date('2012-01-01'),
      classId: classB._id, sectionId: sectionB._id,
      phoneNumber: '0610000003', address: 'Test City', parentName: 'Test Parent',
      parentPhoneNumber: '0610000004',
    });

    const teacher = await Teacher.create({
      userId: teacherUser._id, staffId: `${suffix}-TCH`, department: 'Test', status: 'Active',
    });

    const assignment = await TeacherAssignment.create({
      teacherId: teacher._id,
      subjectId: subject._id,
      classId: classA._id,
      sectionId: sectionA._id,
      termId: term._id,
      timetableSlots: [],
    });

    Object.assign(fixtureIds, {
      level: level._id, year: year._id, classA: classA._id, classB: classB._id,
      sectionA: sectionA._id, sectionB: sectionB._id, subject: subject._id, term: term._id,
      teacher: teacher._id, assignment: assignment._id,
    });
  });

  afterAll(async () => {
    // Every deletion below is scoped to this suite's own ids — a filterless
    // deleteMany on a shared collection would remove other suites' fixtures
    // too, since --runInBand runs every integration test against one
    // database in sequence.
    await User.deleteMany({ email: /@ai-upload-test\.local$/ });
    await AssignmentSubmission.deleteMany({
      studentId: { $in: [studentInClass?._id, studentOutsideClass?._id].filter(Boolean) },
    });
    await Student.deleteMany({ _id: { $in: [studentInClass?._id, studentOutsideClass?._id].filter(Boolean) } });
    if (fixtureIds.assignment) await TeacherAssignment.deleteOne({ _id: fixtureIds.assignment });
    if (fixtureIds.teacher) await Teacher.deleteOne({ _id: fixtureIds.teacher });
    if (fixtureIds.sectionA) await Section.deleteOne({ _id: fixtureIds.sectionA });
    if (fixtureIds.sectionB) await Section.deleteOne({ _id: fixtureIds.sectionB });
    if (fixtureIds.classA) await Class.deleteOne({ _id: fixtureIds.classA });
    if (fixtureIds.classB) await Class.deleteOne({ _id: fixtureIds.classB });
    if (fixtureIds.subject) await Subject.deleteOne({ _id: fixtureIds.subject });
    if (fixtureIds.term) await Term.deleteOne({ _id: fixtureIds.term });
    if (fixtureIds.year) await Year.deleteOne({ _id: fixtureIds.year });
    if (fixtureIds.level) await Level.deleteOne({ _id: fixtureIds.level });

    // These upload routes audit under the same 'AIAssistant' module and
    // AI_* action names ai.test.js uses (see aiUploadService.js). Both files
    // share that namespace, so whichever runs last must sweep it entirely —
    // otherwise the survivor's own baseline-vs-restored isolation check
    // fails, having snapshotted a baseline "polluted" by whichever file ran
    // first. This is the same audit-row leak fixed once already this session
    // for ai.test.js itself, now reintroduced by this second file sharing the
    // namespace; the fix is the same pattern, kept in both files.
    const aiModule = await AuditModule.findOne({ module_name: 'AIAssistant' });
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
  });

  describe('exam upload review', () => {
    const numberedPaper = Buffer.from(
      '1. Explain three causes of soil erosion. (6 marks)\n\n' +
        '2. Describe the water cycle. (8 marks)\n\n' +
        '3. Calculate the area of a circle of radius 7cm. (6 marks)\n'
    );

    it('rejects an unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .attach('file', numberedPaper, 'exam.txt');
      expect(res.status).toBe(401);
    });

    it('rejects a request with no file attached', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`);
      expect(res.status).toBe(400);
    });

    it('rejects an unsupported file type', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .attach('file', Buffer.from('not a real image'), 'exam.jpg');
      expect(res.status).toBe(400);
    });

    it('blocks a student from this route entirely', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .set('Authorization', `Bearer ${tokens.student}`)
        .attach('file', numberedPaper, 'exam.txt');
      expect(res.status).toBe(403);
    });

    it('extracts, segments and reviews a numbered paper end to end', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .field('expectedTotalMarks', '20')
        .attach('file', numberedPaper, 'exam.txt');

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.extractionMethod).toBe('deterministic');
      expect(data.questionsDetected).toBe(3);
      expect(data.quality.totalMarks).toBe(20);
      expect(data.quality.structureValid).toBe(true);
      // Grammar may or may not be available depending on provider quota at
      // test time — assert the field exists and is well-formed either way.
      expect(typeof data.grammar.available).toBe('boolean');
      expect(typeof data.redoRecommended).toBe('boolean');
    });

    it('rejects a paper with no recognisable question numbering', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .attach('file', Buffer.from('Just some prose with no numbering of any kind at all here.'), 'unnumbered.txt');
      expect(res.status).toBe(400);
    });

    it('flags a mark-total mismatch the same way the typed-input path does', async () => {
      const res = await request(app)
        .post('/api/ai/exams/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .field('expectedTotalMarks', '100')
        .attach('file', numberedPaper, 'exam.txt');

      expect(res.body.data.quality.structureValid).toBe(false);
      expect(res.body.data.quality.issues.some((i) => i.type === 'marks-mismatch')).toBe(true);
    });
  });

  describe('assignment upload review', () => {
    const shortAssignment = Buffer.from(
      'Photosynthesis is a process that occurs in plants. Plants use sunlight to produce energy. ' +
        'Chlorophyll absorbs light in the leaves. Carbon dioxide combines with water to form glucose. ' +
        'Oxygen is released as a byproduct of the reaction. This process is essential for growth.'
    );

    it('rejects a request with no student query', async () => {
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .attach('file', shortAssignment, 'assignment.txt');
      expect(res.status).toBe(400);
    });

    it('lets a privileged role review any student', async () => {
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .field('studentQuery', studentInClass.admissionNumber)
        .field('assignmentTitle', 'AI upload test — privileged review')
        .attach('file', shortAssignment, 'assignment.txt');

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(studentInClass._id.toString());
      expect(res.body.data.writingIntegrity).toHaveProperty('signals');
      expect(res.body.data.writingIntegrity).toHaveProperty('reviewRecommended');
      // The one hard requirement: never a percentage or score field anywhere
      // in what actually reaches the client.
      expect(JSON.stringify(res.body.data)).not.toMatch(/aiPercent|aiScore|aiProbability/i);
      expect(res.body.data.disclaimer).toMatch(/does not/i);
    });

    it("lets a teacher review a student in their own assigned class", async () => {
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .field('studentQuery', studentInClass.admissionNumber)
        .field('assignmentTitle', 'AI upload test — own class')
        .attach('file', shortAssignment, 'assignment.txt');

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(studentInClass._id.toString());
    });

    it("blocks a teacher from a student outside their assigned classes", async () => {
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.teacher}`)
        .field('studentQuery', studentOutsideClass.admissionNumber)
        .attach('file', shortAssignment, 'assignment.txt');

      expect(res.status).toBe(404);
    });

    it('blocks a teacher with no assignments at all', async () => {
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.otherTeacher}`)
        .field('studentQuery', studentInClass.admissionNumber)
        .attach('file', shortAssignment, 'assignment.txt');

      expect(res.status).toBe(404);
    });

    it('persists the submission so future reviews can compare against it', async () => {
      const before = await AssignmentSubmission.countDocuments({ studentId: studentInClass._id });

      await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .field('studentQuery', studentInClass.admissionNumber)
        .field('assignmentTitle', 'AI upload test — persistence check')
        .attach('file', shortAssignment, 'assignment.txt');

      const after = await AssignmentSubmission.countDocuments({ studentId: studentInClass._id });
      expect(after).toBe(before + 1);
    });

    /**
     * Regression test for a real bug: resolving a student by MongoDB $text
     * search tokenises the query, so two students whose admission numbers
     * differ only by suffix (here, "...-IN" vs "...-OUT") both matched a
     * search for one of them, because they share the "UPT" and timestamp
     * tokens. The fix uses a prefix match instead. This matters more than a
     * typical ambiguous-search bug: a false single match after role-scope
     * filtering would have silently resolved to the wrong student, and their
     * submission would have been reviewed and stored under someone else's
     * name.
     */
    it("does not let one student's admission number match another's near-identical one", async () => {
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .field('studentQuery', studentInClass.admissionNumber)
        .attach('file', shortAssignment, 'assignment.txt');

      expect(res.status).toBe(200);
      // Must resolve to exactly the queried student, never the other fixture
      // whose admission number shares every token except the suffix.
      expect(res.body.data.student.id).toBe(studentInClass._id.toString());
      expect(res.body.data.student.id).not.toBe(studentOutsideClass._id.toString());
    });

    it('rejects an ambiguous student query rather than guessing', async () => {
      // Both fixture students share the last name "Student" by design, so
      // this deterministically matches more than one record.
      const res = await request(app)
        .post('/api/ai/assignments/review-upload')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .field('studentQuery', 'Student')
        .attach('file', shortAssignment, 'assignment.txt');
      expect(res.status).toBe(400);
    });
  });
});
