import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import Level from '../src/models/Level.js';
import Student from '../src/models/Student.js';
import Guardian from '../src/models/Guardian.js';
import Family from '../src/models/Family.js';
import Address from '../src/models/Address.js';
import Residence from '../src/models/Residence.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import Status from '../src/models/Status.js';

import DiscountType from '../src/models/DiscountType.js';
import AppliesTo from '../src/models/AppliesTo.js';
import ScholarshipType from '../src/models/ScholarshipType.js';
import Scholarship from '../src/models/Scholarship.js';
import SiblingRule from '../src/models/SiblingRule.js';
import StudentScholarship from '../src/models/StudentScholarship.js';
import User from '../src/models/User.js';

// Setup token for authentication. authenticate loads this user from the DB.
const adminId = new mongoose.Types.ObjectId();
let adminToken;

describe('Scholarship & Sibling Rules API Integration Tests', () => {
  let studentId;
  let statusId;
  let discountTypeId;
  let appliesToId;
  let scholarshipTypeId;
  let scholarshipId;
  let siblingRuleId;

  beforeAll(async () => {
    const tokenSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminId.toString(), role: 'admin', name: 'Test Admin' }, tokenSecret);

    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database on the main
    // cluster) — this file must never connect on its own to a different,
    // hardcoded cluster/credential, which risked silently diverging from
    // every other test file's shared connection.

    // Clean all collections in parallel
    await Promise.all([
      Level.deleteMany({}),
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Address.deleteMany({}),
      Residence.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      Status.deleteMany({}),
      DiscountType.deleteMany({}),
      AppliesTo.deleteMany({}),
      ScholarshipType.deleteMany({}),
      Scholarship.deleteMany({}),
      SiblingRule.deleteMany({}),
      StudentScholarship.deleteMany({}),
      User.deleteMany({ email: { $in: ['sch.admin@test.com'] } })
    ]);

    // Login account backing adminToken (authenticate loads it by id)
    await User.create({ _id: adminId, firstName: 'Test', lastName: 'Admin', email: 'sch.admin@test.com', password: 'password123', role: 'admin' });

    // Create necessary base test data
    const level = await Level.create({ lev_no: 'L-SCH', lev_name: 'Sch level' });
    const testClass = await Class.create({ cl_no: 'C-SCH', cl_name: 'Sch class', lev_no: level._id });
    const testSection = await Section.create({ name: 'Sch section', class: testClass._id });
    const testFamily = await Family.create({ familyName: 'Sch Family', primaryContactPhone: '11122233' });
    const testGuardian = await Guardian.create({ familyId: testFamily._id, p_no: 'G-SCH', name: 'Sch guard', relationship: 'Father', phone: '11122233' });
    const testAddress = await Address.create({ add_no: 'ADDR-SCH', street: 'Sch street', city: 'City', state: 'State', country: 'Country' });
    const testResidence = await Residence.create({ res_no: 'RES-SCH', type: 'Day Scholar' });

    const student = await Student.create({
      firstName: 'Scholarship',
      lastName: 'Student',
      admissionNumber: 'ZU-SCH-001',
      gender: 'Male',
      birthDate: new Date('2011-01-01'),
      classId: testClass._id,
      sectionId: testSection._id,
      phoneNumber: '0610000004',
      address: 'Sch street, City',
      parentName: 'Sch guard',
      parentPhoneNumber: '11122233'
    });
    studentId = student._id;

    const statusObj = await Status.create({ st_no: 'S-SCH-1', st_name: 'Active' });
    statusId = statusObj._id;
  }, 60000);

  afterAll(async () => {
    await Promise.all([
      Level.deleteMany({}),
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Address.deleteMany({}),
      Residence.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      Status.deleteMany({}),
      DiscountType.deleteMany({}),
      AppliesTo.deleteMany({}),
      ScholarshipType.deleteMany({}),
      Scholarship.deleteMany({}),
      SiblingRule.deleteMany({}),
      StudentScholarship.deleteMany({}),
      User.deleteMany({ email: { $in: ['sch.admin@test.com'] } })
    ]);
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 60000);

  // ==========================================
  // DISCOUNT TYPES TESTS
  // ==========================================
  describe('Discount Types API', () => {
    it('should create a discount type', async () => {
      const res = await request(app)
        .post('/api/discount-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          discount_type_id: 'DT-01',
          discount_type_name: 'Percentage',
          description: 'Percentage-based discount'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.discount_type_id).toBe('DT-01');
      discountTypeId = res.body.data._id;
    }, 15000);

    it('should get all discount types', async () => {
      const res = await request(app)
        .get('/api/discount-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    }, 15000);
  });

  // ==========================================
  // APPLIES TO TESTS
  // ==========================================
  describe('Applies To API', () => {
    it('should create an AppliesTo rule', async () => {
      const res = await request(app)
        .post('/api/applies-to')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applies_to_id: 'AT-01',
          applies_to_name: 'Tuition Fee',
          description: 'Discount applies to tuition fees'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applies_to_id).toBe('AT-01');
      appliesToId = res.body.data._id;
    }, 15000);
  });

  // ==========================================
  // SCHOLARSHIP TYPES TESTS
  // ==========================================
  describe('Scholarship Types API', () => {
    it('should create a scholarship type', async () => {
      const res = await request(app)
        .post('/api/scholarship-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schola_type_no: 'ST-01',
          scholarship_name: 'Merit-Based',
          description: 'Academic excellence scholarships'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.schola_type_no).toBe('ST-01');
      scholarshipTypeId = res.body.data._id;
    }, 15000);
  });

  // ==========================================
  // SCHOLARSHIPS TESTS
  // ==========================================
  describe('Scholarships API', () => {
    it('should configure a scholarship', async () => {
      const res = await request(app)
        .post('/api/scholarships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scholarship_id: 'SCH-01',
          scholar_type_no: scholarshipTypeId,
          discount_type_id: discountTypeId,
          discount_value: 50,
          description: '50% merit discount'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.scholarship_id).toBe('SCH-01');
      expect(res.body.data.discount_value).toBe(50);
      scholarshipId = res.body.data._id;
    }, 15000);
  });

  // ==========================================
  // SIBLING RULES TESTS
  // ==========================================
  describe('Sibling Rules API', () => {
    it('should configure a sibling rule', async () => {
      const res = await request(app)
        .post('/api/sibling-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rule_id: 'SR-01',
          rule_name: 'Two Siblings',
          minimum_siblings: 2,
          discount_percentage: 15,
          applies_to_id: appliesToId,
          description: '15% sibling discount'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rule_id).toBe('SR-01');
      siblingRuleId = res.body.data._id;
    }, 15000);
  });

  // ==========================================
  // STUDENT SCHOLARSHIPS TESTS
  // ==========================================
  describe('Student Scholarships API', () => {
    it('should assign a scholarship to a student', async () => {
      const res = await request(app)
        .post('/api/student-scholarships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_scholarship_id: 'SS-01',
          st_no: studentId,
          scholarship_id: scholarshipId,
          startDate: '2026-09-01',
          endDate: '2027-06-30',
          status_no: statusId,
          remarks: 'Assigned for excellent performance'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student_scholarship_id).toBe('SS-01');
      expect(res.body.data.st_no._id).toBe(studentId.toString());
      expect(res.body.data.status_no._id).toBe(statusId.toString());
    }, 15000);

    it('should fail to assign a second active scholarship to the same student', async () => {
      const res = await request(app)
        .post('/api/student-scholarships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_scholarship_id: 'SS-02',
          st_no: studentId,
          scholarship_id: scholarshipId,
          startDate: '2026-09-01',
          endDate: '2027-06-30',
          status_no: statusId,
          remarks: 'Try to double assign'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('active scholarship');
    }, 15000);
  });
});
