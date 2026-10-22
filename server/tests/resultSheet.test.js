import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import Student from '../src/models/Student.js';
import Guardian from '../src/models/Guardian.js';
import Family from '../src/models/Family.js';
import Address from '../src/models/Address.js';
import Residence from '../src/models/Residence.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import CourseClass from '../src/models/CourseClass.js';
import Staff from '../src/models/Staff.js';
import Subject from '../src/models/Subject.js';
import Year from '../src/models/Year.js';
import Level from '../src/models/Level.js';
import Exam from '../src/models/Exam.js';
import ExamReg from '../src/models/ExamReg.js';
import ResultSheet from '../src/models/ResultSheet.js';
import Syllabus from '../src/models/Syllabus.js';
import LessonCoverage from '../src/models/LessonCoverage.js';
import User from '../src/models/User.js';

const adminId = new mongoose.Types.ObjectId();
let adminToken;

describe('ResultSheet and LessonCoverageReport API Tests', () => {
  let studentId, classId, examRegId, subjectId, syllabusId;
  let resultSheetId;

  beforeAll(async () => {
    const tokenSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminId.toString(), role: 'admin', name: 'Test Admin' }, tokenSecret);

    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database on the main
    // cluster) — this file must never connect on its own to a different,
    // hardcoded cluster/credential, which risked silently diverging from
    // every other test file's shared connection.

    // Clean up
    await Promise.all([
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Address.deleteMany({}),
      Residence.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      CourseClass.deleteMany({}),
      Staff.deleteMany({}),
      Subject.deleteMany({}),
      Year.deleteMany({}),
      Level.deleteMany({}),
      Exam.deleteMany({}),
      ExamReg.deleteMany({}),
      ResultSheet.deleteMany({}),
      Syllabus.deleteMany({}),
      LessonCoverage.deleteMany({}),
      User.deleteMany({ email: { $in: ['rs.admin@test.com'] } })
    ]);

    // Login account backing adminToken (authenticate loads it by id)
    await User.create({ _id: adminId, firstName: 'Test', lastName: 'Admin', email: 'rs.admin@test.com', password: 'password123', role: 'admin' });

    // Setup required references
    const level = await Level.create({ lev_no: 'L-RTEST', lev_name: 'Test Level' });
    const year = await Year.create({ y_no: 'Y-RTEST', y_name: '2026 Test' });
    const testClass = await Class.create({ cl_no: 'C-RTEST', cl_name: 'Test Class', lev_no: level._id });
    const section = await Section.create({ name: 'Test Section', class: testClass._id });
    const family = await Family.create({ familyName: 'RTest Family', primaryContactPhone: '061234567' });
    const guardian = await Guardian.create({ familyId: family._id, p_no: 'G-RTEST', name: 'Test Guardian', relationship: 'Father', phone: '061234567' });
    const address = await Address.create({ add_no: 'ADDR-RTEST', street: 'Street', city: 'City', state: 'State', country: 'Country' });
    const residence = await Residence.create({ res_no: 'RES-RTEST', type: 'Day Scholar' });

    const student = await Student.create({
      firstName: 'Test',
      lastName: 'Student',
      admissionNumber: 'ZU-RTEST-0001',
      gender: 'Male',
      birthDate: new Date('2010-01-01'),
      classId: testClass._id,
      sectionId: section._id,
      phoneNumber: '0610000003',
      address: 'Street, City',
      parentName: 'Test Guardian',
      parentPhoneNumber: '061234567'
    });
    studentId = student._id;

    const staff = await Staff.create({
      stf_no: 'STF-RTEST',
      staffNo: 'STF-RTEST',
      p_no: guardian._id,
      personId: guardian._id,
      job_no: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      sp_no: new mongoose.Types.ObjectId(),
      specializationId: new mongoose.Types.ObjectId(),
      dec_no: new mongoose.Types.ObjectId(),
      degreeId: new mongoose.Types.ObjectId()
    });

    const subject = await Subject.create({
      code: 'SUB-RTEST',
      name: 'Test Subject',
      sub_no: 'SUB-RTEST',
      sub_name: 'Test Subject'
    });
    subjectId = subject._id;

    const courseClass = await CourseClass.create({
      cc_no: 'CC-RTEST',
      stf_no: staff._id,
      cl_no: testClass._id,
      sub_no: subject._id,
      y_no: year._id,
      no_periods: 4
    });
    classId = courseClass._id;

    const exam = await Exam.create({
      ex_no: 'EX-RTEST-' + Date.now(),
      ex_name: 'Final Test',
      name: 'Final Test',
      examType: 'Final',
      subject: subject._id,
      section: 'A',
      examDate: new Date(),
      timePeriod: '09:00 - 11:00',
      room: 'Room 101',
      totalMarks: 100
    });

    const examReg = await ExamReg.create({
      ex_r_no: 'ER-RTEST',
      ex_no: exam._id,
      y_no: year._id
    });
    examRegId = examReg._id;

    const syllabus = await Syllabus.create({
      syllabus_no: 'SYL-RTEST',
      sub_no: subject._id,
      topic: 'Test Topic',
      chapter: 'Chapter 1'
    });
    syllabusId = syllabus._id;

    await LessonCoverage.create({
      lc_no: 'LC-RTEST',
      syllabus_no: syllabus._id,
      cc_no: courseClass._id,
      date_covered: new Date(),
      periods_covered: 2,
      remarks: 'Covered successfully'
    });
  }, 180000);

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['rs.admin@test.com'] } });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 180000);

  // ResultSheet API tests
  describe('POST /api/result-sheets', () => {
    it('should create a new result sheet with overall score', async () => {
      const res = await request(app)
        .post('/api/result-sheets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student: studentId.toString(),
          class: classId.toString(),
          examReg: examRegId.toString(),
          marks: [{ subject: subjectId.toString(), score: 85 }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallScore).toBe(85);
      resultSheetId = res.body.data._id;
    });

    it('should fail if student ID is invalid', async () => {
      const res = await request(app)
        .post('/api/result-sheets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student: 'invalid-id',
          class: classId.toString(),
          examReg: examRegId.toString(),
          marks: [{ subject: subjectId.toString(), score: 85 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/result-sheets', () => {
    it('should retrieve all result sheets', async () => {
      const res = await request(app)
        .get('/api/result-sheets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/result-sheets/:id', () => {
    it('should retrieve a single result sheet by ID', async () => {
      const res = await request(app)
        .get(`/api/result-sheets/${resultSheetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(resultSheetId);
    });
  });

  describe('PUT /api/result-sheets/:id', () => {
    it('should update result sheet marks and recalculate overallScore', async () => {
      const res = await request(app)
        .put(`/api/result-sheets/${resultSheetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          marks: [
            { subject: subjectId.toString(), score: 90 },
            { subject: new mongoose.Types.ObjectId().toString(), score: 80 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallScore).toBe(85);
    });
  });

  // Lesson Coverage Report tests
  describe('GET /api/lesson-coverage-reports/class/:classId', () => {
    it('should generate lesson coverage report with percentage calculation', async () => {
      const res = await request(app)
        .get(`/api/lesson-coverage-reports/class/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalTopics).toBe(1);
      expect(res.body.data.summary.coveredTopics).toBe(1);
      expect(res.body.data.summary.coveragePercentage).toBe(100);
      expect(res.body.data.topics[0].covered).toBe(true);
    });
  });

  describe('DELETE /api/result-sheets/:id', () => {
    it('should delete a result sheet', async () => {
      const res = await request(app)
        .delete(`/api/result-sheets/${resultSheetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
