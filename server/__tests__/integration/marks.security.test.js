import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/server.js';
import Student from '../../src/models/Student.js';
import User from '../../src/models/User.js';
import Mark from '../../src/models/mark.js';
import { calculateGrade } from '../../src/utils/gradingEngine.js';

// SMS-T-302 — Marks Security & IDOR Tests + Result Processing Verification
const signToken = (id, role) =>
  jwt.sign({ id, role, name: `${role}-user` }, process.env.JWT_ACCESS_SECRET);

describe('Marks — Result Processing (grading engine)', () => {
  it('maps total marks to the correct letter grade', () => {
    expect(calculateGrade(50, 45)).toMatchObject({ grade: 'A' }); // 95
    expect(calculateGrade(40, 40)).toMatchObject({ grade: 'B' }); // 80
    expect(calculateGrade(35, 35)).toMatchObject({ grade: 'C' }); // 70
    expect(calculateGrade(30, 30)).toMatchObject({ grade: 'D' }); // 60
    expect(calculateGrade(25, 25)).toMatchObject({ grade: 'E' }); // 50
    expect(calculateGrade(10, 10)).toMatchObject({ grade: 'F' }); // 20
  });

  it('treats missing marks as zero without throwing', () => {
    expect(calculateGrade()).toMatchObject({ grade: 'F' });
  });
});

// Regression: the grading engine and the Mark schema used to disagree. The engine
// returned E/'Fair' for 50-59 while the schema enum only allowed A-D and F, so every
// mark in that band was rejected with a ValidationError. Testing calculateGrade alone
// never caught it — the grade has to be persisted through the model.
describe('Marks — every grade band persists through the Mark model', () => {
  const bands = [
    { caMarks: 40, examMarks: 55, total: 95, grade: 'A', remarks: 'Excellent' },
    { caMarks: 40, examMarks: 45, total: 85, grade: 'B', remarks: 'Very Good' },
    { caMarks: 35, examMarks: 40, total: 75, grade: 'C', remarks: 'Good' },
    { caMarks: 30, examMarks: 35, total: 65, grade: 'D', remarks: 'Pass' },
    { caMarks: 25, examMarks: 30, total: 55, grade: 'E', remarks: 'Fair' },
    { caMarks: 10, examMarks: 10, total: 20, grade: 'F', remarks: 'Fail' }
  ];

  it.each(bands)(
    'total $total is saved as grade $grade',
    async ({ caMarks, examMarks, total, grade, remarks }) => {
      const mark = new Mark({
        student: new mongoose.Types.ObjectId(),
        subject: new mongoose.Types.ObjectId(),
        academicYear: new mongoose.Types.ObjectId(),
        term: new mongoose.Types.ObjectId(),
        teacher: new mongoose.Types.ObjectId(),
        caMarks,
        examMarks
      });

      await expect(mark.validate()).resolves.toBeUndefined();
      expect(mark.grade).toBe(grade);
      expect(mark.remarks).toBe(remarks);
      expect(mark.totalMarks).toBe(total);
    }
  );
});

describe('Marks API — Security & IDOR', () => {
  let studentAUserId;
  let studentBUserId;
  let adminUserId;
  let parentUserId;
  let studentAId;
  let studentBId;
  const emails = ['mk.a@test.com', 'mk.b@test.com', 'mk.admin@test.com', 'mk.parent@test.com'];

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.
    await Promise.all([
      Student.deleteMany({ admissionNumber: { $in: ['SEC-A-1', 'SEC-B-1'] } }),
      User.deleteMany({ email: { $in: emails } })
    ]);

    // Real login accounts — markRoutes now use authenticate (DB user lookup).
    const [ua, ub, uadmin, uparent] = await User.create([
      { firstName: 'Ayaan', lastName: 'A', email: emails[0], password: 'password123', role: 'student' },
      { firstName: 'Bilan', lastName: 'B', email: emails[1], password: 'password123', role: 'student' },
      { firstName: 'Adm', lastName: 'In', email: emails[2], password: 'password123', role: 'admin' },
      { firstName: 'Par', lastName: 'Ent', email: emails[3], password: 'password123', role: 'parent' }
    ]);
    studentAUserId = ua._id.toString();
    studentBUserId = ub._id.toString();
    adminUserId = uadmin._id.toString();
    parentUserId = uparent._id.toString();

    // Two students, each linked to a different login account.
    const [a, b] = await Student.create([
      {
        firstName: 'Ayaan', lastName: 'A', admissionNumber: 'SEC-A-1', userId: studentAUserId,
        gender: 'Male', birthDate: new Date('2010-01-01'),
        classId: new mongoose.Types.ObjectId(), sectionId: new mongoose.Types.ObjectId(),
        phoneNumber: '0610000010', address: 'City', parentName: 'Parent A', parentPhoneNumber: '0610000011'
      },
      {
        firstName: 'Bilan', lastName: 'B', admissionNumber: 'SEC-B-1', userId: studentBUserId,
        gender: 'Female', birthDate: new Date('2010-01-01'),
        classId: new mongoose.Types.ObjectId(), sectionId: new mongoose.Types.ObjectId(),
        phoneNumber: '0610000012', address: 'City', parentName: 'Parent B', parentPhoneNumber: '0610000013'
      }
    ]);
    studentAId = a._id.toString();
    studentBId = b._id.toString();
  }, 30000);

  afterAll(async () => {
    await Student.deleteMany({ admissionNumber: { $in: ['SEC-A-1', 'SEC-B-1'] } });
    await User.deleteMany({ email: { $in: emails } });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  describe('Mark entry authorization (POST /api/marks)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/marks').send({});
      expect(res.status).toBe(401);
    });

    it('rejects a student trying to enter marks (teacher-only) with 403', async () => {
      const res = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${signToken(studentAUserId, 'student')}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('rejects an admin trying to enter marks (teacher-only) with 403', async () => {
      const res = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${signToken(adminUserId, 'admin')}`)
        .send({});
      expect(res.status).toBe(403);
    });
  });

  describe('Result access authorization (GET /api/marks/student/:id)', () => {
    it('rejects a parent role with 403', async () => {
      const res = await request(app)
        .get(`/api/marks/student/${studentAId}?academicYearId=${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${signToken(parentUserId, 'parent')}`);
      expect(res.status).toBe(403);
    });

    it('IDOR: blocks student A from reading student B results with 403', async () => {
      const res = await request(app)
        .get(`/api/marks/student/${studentBId}?academicYearId=${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${signToken(studentAUserId, 'student')}`);
      expect(res.status).toBe(403);
    });

    it('allows student A to read their OWN results', async () => {
      const res = await request(app)
        .get(`/api/marks/student/${studentAId}?academicYearId=${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${signToken(studentAUserId, 'student')}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
