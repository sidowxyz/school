import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import Level from '../src/models/Level.js';
import Year from '../src/models/Year.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import StudentClass from '../src/models/StudentClass.js';
import Student from '../src/models/Student.js';
import Family from '../src/models/Family.js';
import Guardian from '../src/models/Guardian.js';
import Address from '../src/models/Address.js';
import Residence from '../src/models/Residence.js';
import Period from '../src/models/Period.js';
import StudentAttendance from '../src/models/StudentAttendance.js';
import User from '../src/models/User.js';

const adminUserId = new mongoose.Types.ObjectId();
const studentUserId = new mongoose.Types.ObjectId();
let adminToken;
let studentToken;

describe('Student Attendance API Tests', () => {
  let levelId, yearId, classId, sectionId, studentClassId, studentId, periodId;

  beforeAll(async () => {
    const tokenSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminUserId.toString(), role: 'admin', name: 'Test Admin' }, tokenSecret);
    studentToken = jwt.sign({ id: studentUserId.toString(), role: 'student', name: 'Test Student' }, tokenSecret);

    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database on the main
    // cluster) — this file must never connect on its own to a different,
    // hardcoded cluster/credential, which risked silently diverging from
    // every other test file's shared connection.

    // Drop stale indexes left over from a merge conflict (old User schema had user_no, user_name)
    const usersCol = mongoose.connection.db.collection('users');
    await usersCol.dropIndex('user_no_1').catch(() => {});
    await usersCol.dropIndex('user_name_1').catch(() => {});

    // Clean up
    await Promise.all([
      Level.deleteMany({}),
      Year.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      StudentClass.deleteMany({}),
      Student.deleteMany({}),
      Family.deleteMany({}),
      Guardian.deleteMany({}),
      Address.deleteMany({}),
      Residence.deleteMany({}),
      Period.deleteMany({}),
      StudentAttendance.deleteMany({}),
      User.deleteMany({ email: { $in: ['std.admin@test.com'] } })
    ]);

    // Create Admin User
    await User.create({
      _id: adminUserId,
      firstName: 'Test',
      lastName: 'Admin',
      email: 'std.admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // Create Level & Year
    const level = await Level.create({ lev_no: 'L-STUDENT-TEST', lev_name: 'Student Test Level' });
    levelId = level._id;

    const year = await Year.create({ y_no: 'Y-STUDENT-TEST', y_name: '2026 Student Test Year' });
    yearId = year._id;

    // Create Class & Section
    const testClass = await Class.create({ cl_no: 'C-STUDENT-TEST', cl_name: 'Student Test Class', lev_no: levelId });
    classId = testClass._id;

    const testSection = await Section.create({ name: 'Student Test Section', class: classId });
    sectionId = testSection._id;

    // Create Family, Guardian, Address, Residence (Required to create a student)
    const testFamily = await Family.create({ familyName: 'Student Test Family', primaryContactPhone: '061999999' });
    const testGuardian = await Guardian.create({ familyId: testFamily._id, p_no: 'G-STUDENT-TEST', name: 'Student Guardian', relationship: 'Father', phone: '061999999' });
    const testAddress = await Address.create({ add_no: 'ADDR-STUDENT-TEST', street: 'Test Street', city: 'Test City', state: 'Test State', country: 'Test Country' });
    const testResidence = await Residence.create({ res_no: 'RES-STUDENT-TEST', type: 'Day Scholar' });

    // Create Student (using current Student schema fields)
    const student = await Student.create({
      firstName: 'Student',
      lastName: 'Test',
      admissionNumber: 'ZU-STD-TEST-01',
      gender: 'Male',
      birthDate: new Date('2011-01-01'),
      classId,
      sectionId,
      phoneNumber: '0610000001',
      address: 'Test Street, Test City',
      parentName: 'Student Guardian',
      parentPhoneNumber: '061999999'
    });
    studentId = student._id;

    // Create StudentClass
    const sc = await StudentClass.create({
      sc_no: 'SC-STUDENT-TEST',
      student: studentId,
      class: classId,
      year: yearId
    });
    studentClassId = sc._id;

    // Create Period — periods belong to a term. Admins may mark attendance on
    // any day, so the term itself doesn't need to exist for these tests.
    const period = await Period.create({
      termId: new mongoose.Types.ObjectId(),
      per_no: 'P-STUDENT-TEST',
      per_name: 'Period 1',
      time_in: '08:00',
      time_out: '09:00'
    });
    periodId = period._id;
  }, 180000);

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['std.admin@test.com'] } });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 180000);

  describe('POST /api/attendance', () => {
    it('should successfully record student attendance', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodId: periodId.toString(),
          att_date: '2026-07-01',
          attendance: [
            {
              studentId: studentId.toString(),
              status: 'Present',
              remarks: 'Present on time'
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBeDefined();
      expect(res.body.data[0].studentId._id).toBe(studentId.toString());
      expect(res.body.data[0].status).toBe('Present');
      expect(res.body.data[0].remarks).toBe('Present on time');
    });
  });

  describe('saving the same period again', () => {
    it('updates the existing mark instead of adding a second one', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodId: periodId.toString(),
          att_date: '2026-07-01',
          attendance: [{ studentId: studentId.toString(), status: 'Late', remarks: 'Bus was late' }]
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('Late');
      expect(await StudentAttendance.countDocuments({ studentId })).toBe(1);

      // Put it back so the report below still sees one present day.
      await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ periodId: periodId.toString(), att_date: '2026-07-01', attendance: [{ studentId: studentId.toString(), status: 'Present', remarks: 'Present on time' }] });
    });
  });

  describe('GET /api/attendance/summary', () => {
    it('counts today, the daily trend and each class in the database', async () => {
      const today = new Date().toISOString().slice(0, 10);
      await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ periodId: periodId.toString(), att_date: today, attendance: [{ studentId: studentId.toString(), status: 'Absent' }] });

      const res = await request(app)
        .get('/api/attendance/summary?days=30')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.today).toMatchObject({ absent: 1, total: 1, rate: 0 });
      expect(d.classesMarkedToday).toBe(1);
      expect(d.absentToday[0]).toMatchObject({ studentId: studentId.toString(), status: 'Absent' });
      expect(d.daily.find((x) => x.date === today)).toMatchObject({ absent: 1 });
      expect(d.byClass).toHaveLength(1);

      await StudentAttendance.deleteMany({ studentId, att_date: new Date(today) });
    });

    it('is not available to students', async () => {
      const res = await request(app)
        .get('/api/attendance/summary')
        .set('Authorization', `Bearer ${studentToken}`);
      // The token's user does not exist, so this stops at sign-in (401) rather than the role check (403).
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('GET /api/attendance', () => {
    it('should retrieve student attendance history', async () => {
      const res = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].studentId._id).toBe(studentId.toString());
      expect(res.body.data[0].status).toBe('Present');
    });
  });

  describe('GET /api/attendance/report', () => {
    it('should generate monthly attendance report for students', async () => {
      const res = await request(app)
        .get('/api/attendance/report?year=2026&month=7')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalStudents).toBe(1);
      expect(res.body.data.summary.overallPresentRate).toBe(100);
      expect(res.body.data.studentReports.length).toBe(1);
      expect(res.body.data.studentReports[0].stats.present).toBe(1);
    });
  });
});
