import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/server.js';
import Teacher from '../../src/models/Teacher.js';
import User from '../../src/models/User.js';
import Subject from '../../src/models/Subject.js';
import Class from '../../src/models/Class.js';
import TeacherAssignment from '../../src/models/TeacherAssignment.js';
import Period from '../../src/models/Period.js';
import Section from '../../src/models/Section.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

describe('Teacher & Assignment Integration Tests', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.
  }, 30000);

  beforeEach(async () => {
    await Teacher.deleteMany({});
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await TeacherAssignment.deleteMany({});

    // Create Admin User for authorization
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin.teacher.test@example.com',
      password: 'password123',
      role: 'admin',
      status: true
    });
    adminToken = generateAccessToken(adminUser);
  }, 30000);

  afterEach(async () => {
    await Teacher.deleteMany({});
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await TeacherAssignment.deleteMany({});
    await Period.deleteMany({});
    await Section.deleteMany({});
  }, 30000);

  afterAll(async () => {
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  it('should prevent duplicate assignment of the same subject and class to a teacher', async () => {
    // 1. Create Teacher
    const teacherRes = await request(app)
      .post('/api/teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jane Doe',
        email: `jane.doe.${Date.now()}@example.com`,
        password: 'password123',
        department: 'Science',
        qualifications: 'MSc Physics'
      });

    if (teacherRes.statusCode !== 201) console.log('Teacher create failed:', teacherRes.body);
    expect(teacherRes.statusCode).toBe(201);
    const teacherId = teacherRes.body.data.teacher._id;

    // 2. Create Subject & Class directly in DB for testing
    const subject = await Subject.create({ code: `PHY101-${Date.now()}`, name: 'Physics', sub_no: `PHY-${Date.now()}`, sub_name: 'Physics' });
    const classObj = await Class.create({ cl_no: 'G11', cl_name: 'Grade 11', lev_no: new mongoose.Types.ObjectId() });

    // Timetable slots reference configured periods ({ day, periodId }), not
    // free-form times — the controller resolves start/end from the Period.
    const termId = new mongoose.Types.ObjectId();
    const [period1, period2] = await Period.create([
      { termId, per_no: 'P1', per_name: 'Period 1', time_in: '08:00', time_out: '09:00' },
      { termId, per_no: 'P2', per_name: 'Period 2', time_in: '10:00', time_out: '11:00' },
    ]);
    // Assignments are scoped to a class section and a term.
    const section = await Section.create({ name: 'Section A', class: classObj._id });
    // The test database is dropped between runs; the duplicate check relies on
    // the unique index, so make sure it exists.
    await TeacherAssignment.syncIndexes();

    // 3. Add first assignment
    const firstAssignRes = await request(app)
      .post(`/api/teachers/${teacherId}/assignments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId: subject._id,
        classId: classObj._id,
        sectionId: section._id,
        termId,
        timetableSlots: [{ day: 'Monday', periodId: period1._id }]
      });

    if (firstAssignRes.statusCode !== 201) console.log('Assignment create failed:', firstAssignRes.body);
    expect(firstAssignRes.statusCode).toBe(201);

    // 4. Add another lesson of the same subject to the same class
    const duplicateAssignRes = await request(app)
      .post(`/api/teachers/${teacherId}/assignments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId: subject._id,
        classId: classObj._id,
        sectionId: section._id,
        termId,
        timetableSlots: [{ day: 'Tuesday', periodId: period2._id }]
      });

    // 5. Same teacher, subject, class and term: the new lesson joins the
    //    existing assignment (a subject is taught several times a week).
    expect(duplicateAssignRes.statusCode).toBe(200);
    expect(duplicateAssignRes.body.data.timetableSlots).toHaveLength(2);
    expect(await TeacherAssignment.countDocuments({ teacherId })).toBe(1);
  }, 30000);
});
