import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Exam from '../../src/models/Exam.js';
import ExamType from '../../src/models/ExamType.js';
import Class from '../../src/models/Class.js';
import Level from '../../src/models/Level.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

describe('Exam API Integration Tests', () => {
  let adminToken;
  let adminUser;
  let testExamType;
  let testLevel;
  let testClass1;
  let testClass2;

  beforeAll(async () => {
    // Setup admin user & token
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Test',
      username: 'admintestexam',
      email: 'admintestexam@test.com',
      password: 'Password123!',
      role: 'admin'
    });
    adminToken = generateAccessToken(adminUser);


    testExamType = await ExamType.create({
      exam_type_no: `ET-${Date.now()}`,
      type_name: 'Final Exam'
    });

    testLevel = await Level.create({
      lev_no: `LEV-${Date.now()}`,
      lev_name: 'Secondary'
    });

    testClass1 = await Class.create({
      cl_no: `C1-${Date.now()}`,
      cl_name: 'Grade 10',
      lev_no: testLevel._id
    });

    testClass2 = await Class.create({
      cl_no: `C2-${Date.now()}`,
      cl_name: 'Grade 11',
      lev_no: testLevel._id
    });
  }, 30000);

  afterAll(async () => {
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (testExamType) await ExamType.deleteOne({ _id: testExamType._id });
    if (testClass1) await Class.deleteOne({ _id: testClass1._id });
    if (testClass2) await Class.deleteOne({ _id: testClass2._id });
    if (testLevel) await Level.deleteOne({ _id: testLevel._id });
    await Exam.deleteMany({ ex_name: { $regex: /Test Exam/i } });
  }, 30000);


  it('creates single exam and supports get, update, delete', async () => {
    // 1. Create single exam
    const createRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Exam Single',
        class_id: testClass1._id.toString(),
        exam_type: testExamType._id.toString(),
        total_marks: 100,
        pass_marks: 50,
        exam_date: '2026-09-01',
        start_time: '09:00',
        end_time: '11:00'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const examId = createRes.body.data._id;

    // 2. Get single exam
    const getRes = await request(app)
      .get(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.ex_name).toBe('Test Exam Single');

    // 3. Update single exam
    const updateRes = await request(app)
      .put(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Exam Single Updated',
        total_marks: 120
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.ex_name).toBe('Test Exam Single Updated');
    expect(updateRes.body.data.total_marks).toBe(120);

    // 4. Delete single exam
    const deleteRes = await request(app)
      .delete(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);

    // Verify deletion
    const verifyGet = await request(app)
      .get(`/api/exams/${examId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(verifyGet.status).toBe(404);
  });

  it('creates bulk exams and supports batch update and batch delete', async () => {
    // 1. Create bulk exams
    const createRes = await request(app)
      .post('/api/exams/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Exam Bulk',
        class_ids: [testClass1._id.toString(), testClass2._id.toString()],
        exam_type: testExamType._id.toString(),
        total_marks: 100,
        pass_marks: 40,
        exam_date: '2026-10-01',
        start_time: '10:00',
        end_time: '12:00'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.length).toBe(2);
    const batchId = createRes.body.data[0].batch_id;
    expect(batchId).toBeDefined();

    // 2. Batch update
    const updateRes = await request(app)
      .put(`/api/exams/batch/${batchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Exam Bulk Updated',
        total_marks: 150
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.length).toBe(2);
    expect(updateRes.body.data[0].ex_name).toBe('Test Exam Bulk Updated');
    expect(updateRes.body.data[0].total_marks).toBe(150);

    // 3. Batch delete
    const deleteRes = await request(app)
      .delete(`/api/exams/batch/${batchId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);

    // Verify batch deletion in DB
    const count = await Exam.countDocuments({ batch_id: batchId });
    expect(count).toBe(0);
  });
});
