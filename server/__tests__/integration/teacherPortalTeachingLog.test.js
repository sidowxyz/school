import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Teacher from '../../src/models/Teacher.js';
import TeacherAssignment from '../../src/models/TeacherAssignment.js';
import TeachingLog from '../../src/models/TeachingLog.js';
import Subject from '../../src/models/Subject.js';
import Level from '../../src/models/Level.js';
import Class from '../../src/models/Class.js';
import Section from '../../src/models/Section.js';
import Year from '../../src/models/Year.js';
import Term from '../../src/models/Term.js';
import Period from '../../src/models/Period.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

describe('Teacher portal timetable and teaching-log scoping', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const created = {};

  beforeAll(async () => {
    const [teacherUser, otherUser, adminUser] = await User.create([
      {
        firstName: 'Portal', lastName: 'Teacher',
        email: `portal-teacher-${suffix}@test.local`, password: 'Password123', role: 'teacher',
      },
      {
        firstName: 'Other', lastName: 'Teacher',
        email: `other-teacher-${suffix}@test.local`, password: 'Password123', role: 'teacher',
      },
      {
        firstName: 'Portal', lastName: 'Admin',
        email: `portal-admin-${suffix}@test.local`, password: 'Password123', role: 'admin',
      },
    ]);
    const [teacher, otherTeacher] = await Teacher.create([
      { userId: teacherUser._id, staffId: `PORTAL-${suffix}` },
      { userId: otherUser._id, staffId: `OTHER-${suffix}` },
    ]);
    const year = await Year.create({ y_no: `Y-${suffix}`, y_name: `Year ${suffix}` });
    const level = await Level.create({ lev_no: `L-${suffix}`, lev_name: 'Secondary' });
    const classDoc = await Class.create({ cl_no: `C-${suffix}`, cl_name: 'Grade 11', lev_no: level._id });
    const section = await Section.create({ name: `A-${suffix}`, class: classDoc._id });
    const subject = await Subject.create({ sub_no: `S-${suffix}`, sub_name: 'Physics' });
    const term = await Term.create({
      name: `Term ${suffix}`,
      academicYearId: year._id,
      workingDays: ['Monday', 'Tuesday'],
    });
    const period = await Period.create({
      termId: term._id,
      per_no: `P-${suffix}`,
      per_name: 'First Period',
      time_in: '08:00',
      time_out: '09:00',
    });
    const [assignment, otherAssignment] = await TeacherAssignment.create([
      {
        teacherId: teacher._id,
        subjectId: subject._id,
        classId: classDoc._id,
        sectionId: section._id,
        termId: term._id,
        timetableSlots: [{ day: 'Monday', periodId: period._id }],
      },
      {
        teacherId: otherTeacher._id,
        subjectId: subject._id,
        classId: classDoc._id,
        sectionId: section._id,
        termId: term._id,
        timetableSlots: [{ day: 'Tuesday', periodId: period._id }],
      },
    ]);

    Object.assign(created, {
      teacherUser, otherUser, adminUser, teacher, otherTeacher, year, level,
      classDoc, section, subject, term, period, assignment, otherAssignment,
      teacherToken: generateAccessToken(teacherUser),
      otherToken: generateAccessToken(otherUser),
      adminToken: generateAccessToken(adminUser),
    });
  }, 30000);

  afterAll(async () => {
    await TeachingLog.deleteMany({ teacherId: { $in: [created.teacher?._id, created.otherTeacher?._id].filter(Boolean) } });
    await TeacherAssignment.deleteMany({ _id: { $in: [created.assignment?._id, created.otherAssignment?._id].filter(Boolean) } });
    await Period.deleteMany({ _id: created.period?._id });
    await Term.deleteMany({ _id: created.term?._id });
    await Subject.deleteMany({ _id: created.subject?._id });
    await Section.deleteMany({ _id: created.section?._id });
    await Class.deleteMany({ _id: created.classDoc?._id });
    await Level.deleteMany({ _id: created.level?._id });
    await Year.deleteMany({ _id: created.year?._id });
    await Teacher.deleteMany({ _id: { $in: [created.teacher?._id, created.otherTeacher?._id].filter(Boolean) } });
    await User.deleteMany({ _id: { $in: [created.teacherUser?._id, created.otherUser?._id, created.adminUser?._id].filter(Boolean) } });
  }, 30000);

  it('returns only the logged-in teacher timetable', async () => {
    const response = await request(app)
      .get('/api/teachers/me/timetable')
      .set('Authorization', `Bearer ${created.teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]._id).toBe(created.assignment._id.toString());
  }, 30000);

  it('derives lesson labels from the assigned academic session', async () => {
    const response = await request(app)
      .post('/api/teaching-logs')
      .set('Authorization', `Bearer ${created.teacherToken}`)
      .send({
        assignmentId: created.assignment._id.toString(),
        periodId: created.period._id.toString(),
        date: '2026-08-17',
        subject: 'Unassigned fake subject',
        classId: 'Unassigned fake class',
        section: 'Fake section',
        period: 'Fake period',
        topicTaught: 'Motion',
        lessonObjective: 'Explain motion',
        teachingSummary: 'Introduced motion with examples.',
        learningOutcomes: 'Students can describe motion.',
        status: 'completed',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      assignmentId: created.assignment._id.toString(),
      periodId: created.period._id.toString(),
      subject: 'Physics',
      classId: 'Grade 11',
      section: created.section.name,
      period: 'First Period (08:00 - 09:00)',
    });
  }, 30000);

  it('rejects another teacher assignment and hides the first teacher logs', async () => {
    const rejected = await request(app)
      .post('/api/teaching-logs')
      .set('Authorization', `Bearer ${created.otherToken}`)
      .send({
        assignmentId: created.assignment._id.toString(),
        periodId: created.period._id.toString(),
        date: '2026-08-17',
        subject: 'Physics', classId: 'Grade 11', section: created.section.name, period: 'First Period',
        topicTaught: 'Private lesson', lessonObjective: 'Private',
        teachingSummary: 'Private', learningOutcomes: 'Private',
      });
    expect(rejected.status).toBe(403);

    const list = await request(app)
      .get('/api/teaching-logs')
      .set('Authorization', `Bearer ${created.otherToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.logs).toEqual([]);
  }, 30000);

  it('lets an admin request one selected teacher’s logs without leaking other teachers', async () => {
    const selected = await request(app)
      .get(`/api/teaching-logs?teacherId=${created.teacher._id}`)
      .set('Authorization', `Bearer ${created.adminToken}`);
    expect(selected.status).toBe(200);
    expect(selected.body.data.logs).toHaveLength(1);
    expect(selected.body.data.logs[0].createdBy.email).toBe(created.teacherUser.email);

    const other = await request(app)
      .get(`/api/teaching-logs?teacherId=${created.otherTeacher._id}`)
      .set('Authorization', `Bearer ${created.adminToken}`);
    expect(other.status).toBe(200);
    expect(other.body.data.logs).toEqual([]);
  }, 30000);
});
