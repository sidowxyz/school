import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import Level from '../src/models/Level.js';
import Year from '../src/models/Year.js';
import Student from '../src/models/Student.js';
import Guardian from '../src/models/Guardian.js';
import Family from '../src/models/Family.js';
import Address from '../src/models/Address.js';
import Residence from '../src/models/Residence.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import FeeType from '../src/models/FeeType.js';
import FeeStructure from '../src/models/FeeStructure.js';
import PaymentMethod from '../src/models/PaymentMethod.js';
import StudentInvoice from '../src/models/StudentInvoice.js';
import StudentFee from '../src/models/StudentFee.js';
import User from '../src/models/User.js';

// Setup token for authentication. authenticate loads this user from the DB, so
// a real admin User with this _id is created in beforeAll.
const adminId = new mongoose.Types.ObjectId();
let adminToken;
describe('Fee Management API Integration Tests', () => {
  let levelId;
  let yearId;
  let studentId;
  let feeTypeId;
  let feeStructureId;
  let paymentMethodId;
  let invoiceId;

  beforeAll(async () => {
    const tokenSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminId.toString(), role: 'admin', name: 'Test Admin' }, tokenSecret);

    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database on the main
    // cluster) — this file must never connect on its own to a different,
    // hardcoded cluster/credential, which risked silently diverging from
    // every other test file's shared connection.

    // Clean databases first
    // Drop stale indexes left over from a merge conflict (old User schema had user_no, user_name)
    const usersCol = mongoose.connection.db.collection('users');
    await usersCol.dropIndex('user_no_1').catch(() => {});
    await usersCol.dropIndex('user_name_1').catch(() => {});

    // Clean databases first in parallel to optimize speed
    await Promise.all([
      Level.deleteMany({}),
      Year.deleteMany({}),
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Family.deleteMany({}),
      Address.deleteMany({}),
      Residence.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      FeeType.deleteMany({}),
      FeeStructure.deleteMany({}),
      PaymentMethod.deleteMany({}),
      StudentInvoice.deleteMany({}),
      StudentFee.deleteMany({}),
      User.deleteMany({ email: { $in: ['fee.admin@test.com'] } })
    ]);

    // 0. Create the admin login account backing adminToken
    await User.create({
      _id: adminId,
      firstName: 'Test',
      lastName: 'Admin',
      email: 'fee.admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // 1. Create Level
    const level = await Level.create({
      lev_no: 'L-TEST',
      lev_name: 'Test Level'
    });
    levelId = level._id;

    // 2. Create Year
    const year = await Year.create({
      y_no: 'Y-TEST',
      y_name: '2026 Test'
    });
    yearId = year._id;

    // 3. Create Class and Section (Required to create a student)
    const testClass = await Class.create({
      cl_no: 'C-TEST',
      cl_name: 'Test Class',
      lev_no: levelId
    });

    const testSection = await Section.create({
      name: 'Test Section',
      class: testClass._id
    });

    // 4. Create Guardian, Address, Residence (Required to create a student)
    const testFamily = await Family.create({
      familyName: 'Test Family',
      primaryContactPhone: '061234567'
    });

    const testGuardian = await Guardian.create({
      familyId: testFamily._id,
      p_no: 'G-TEST',
      name: 'Test Guardian',
      relationship: 'Father',
      phone: '061234567'
    });

    const testAddress = await Address.create({
      add_no: 'ADDR-TEST',
      street: 'Test Street',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country'
    });

    const testResidence = await Residence.create({
      res_no: 'RES-TEST',
      type: 'Day Scholar'
    });

    // 5. Create Student (using current Student schema fields)
    const student = await Student.create({
      firstName: 'Test',
      lastName: 'Student',
      admissionNumber: 'ZU-FEE-TEST-0001',
      gender: 'Male',
      birthDate: new Date('2010-01-01'),
      classId: testClass._id,
      sectionId: testSection._id,
      phoneNumber: '0610000002',
      address: 'Test Street, Test City',
      parentName: 'Test Guardian',
      parentPhoneNumber: '061234567'
    });
    studentId = student._id;
  }, 60000);

  afterAll(async () => {
    // Clear databases in parallel to optimize speed
    await Promise.all([
      Level.deleteMany({}),
      Year.deleteMany({}),
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Family.deleteMany({}),
      Address.deleteMany({}),
      Residence.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      FeeType.deleteMany({}),
      FeeStructure.deleteMany({}),
      PaymentMethod.deleteMany({}),
      StudentInvoice.deleteMany({}),
      StudentFee.deleteMany({}),
      User.deleteMany({ email: { $in: ['fee.admin@test.com'] } })
    ]);
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 60000);

  // ==========================================
  // FEE TYPES TESTS
  // ==========================================
  describe('POST /api/fee-types', () => {
    it('should create a new fee type', async () => {
      const res = await request(app)
        .post('/api/fee-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fee_type_no: 'FT-100',
          fee_name: 'Tuition Fee'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fee_type_no).toBe('FT-100');
      expect(res.body.data.fee_name).toBe('Tuition Fee');
      feeTypeId = res.body.data._id;
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/fee-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fee_type_no: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/fee-types', () => {
    it('should fetch all fee types', async () => {
      const res = await request(app)
        .get('/api/fee-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // FEE STRUCTURES TESTS
  // ==========================================
  describe('POST /api/fee-structures', () => {
    it('should configure a fee structure for a grade level', async () => {
      const res = await request(app)
        .post('/api/fee-structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fee_struc_no: 'FS-200',
          fee_type_no: feeTypeId,
          lev_no: levelId,
          y_no: yearId,
          amount: 500
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fee_struc_no).toBe('FS-200');
      expect(res.body.data.amount).toBe(500);
      feeStructureId = res.body.data._id;
    });

    it('should fail if creating the same combination twice', async () => {
      const res = await request(app)
        .post('/api/fee-structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fee_struc_no: 'FS-201',
          fee_type_no: feeTypeId,
          lev_no: levelId,
          y_no: yearId,
          amount: 600
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('combination');
    });
  });

  // ==========================================
  // PAYMENT METHODS TESTS
  // ==========================================
  describe('POST /api/payment-methods', () => {
    it('should create a payment method', async () => {
      const res = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          payment_method_no: 'PM-300',
          payment_method_name: 'Zaad Service'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment_method_no).toBe('PM-300');
      paymentMethodId = res.body.data._id;
    });
  });

  // ==========================================
  // STUDENT INVOICES TESTS
  // ==========================================
  describe('POST /api/student-invoices', () => {
    it('should generate an invoice and fetch configuration amount automatically', async () => {
      const res = await request(app)
        .post('/api/student-invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoice_no: 'INV-400',
          student: studentId,
          fee_struc_no: feeStructureId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice_no).toBe('INV-400');
      expect(res.body.data.invoice_amount).toBe(500); // Pulled from FeeStructure (500)
      expect(res.body.data.paid_amount).toBe(0);
      expect(res.body.data.balance).toBe(500);
      expect(res.body.data.status).toBe('Unpaid');
      invoiceId = res.body.data._id;
    }, 15000);
  });

  // ==========================================
  // STUDENT FEES (PAYMENTS) TESTS
  // ==========================================
  describe('POST /api/student-fees', () => {
    it('should register a payment and update the invoice balance & status', async () => {
      const res = await request(app)
        .post('/api/student-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_fee_no: 'SF-500',
          invoice_no: invoiceId,
          payment_method_no: paymentMethodId,
          paid_amount: 200,
          acc_no: '12345678'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student_fee_no).toBe('SF-500');
      expect(res.body.data.paid_amount).toBe(200);

      // Verify the invoice was updated
      const invoiceRes = await request(app)
        .get(`/api/student-invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(invoiceRes.status).toBe(200);
      expect(invoiceRes.body.data.paid_amount).toBe(200);
      expect(invoiceRes.body.data.balance).toBe(300); // 500 - 200
      expect(invoiceRes.body.data.status).toBe('Partially_Paid');
    }, 15000);

    it('should fully pay the invoice on subsequent payment', async () => {
      const res = await request(app)
        .post('/api/student-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_fee_no: 'SF-501',
          invoice_no: invoiceId,
          payment_method_no: paymentMethodId,
          paid_amount: 300,
          acc_no: '12345678'
        });

      expect(res.status).toBe(201);

      // Verify the invoice was updated to Paid
      const invoiceRes = await request(app)
        .get(`/api/student-invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(invoiceRes.status).toBe(200);
      expect(invoiceRes.body.data.paid_amount).toBe(500); // 200 + 300
      expect(invoiceRes.body.data.balance).toBe(0); // 500 - 500
      expect(invoiceRes.body.data.status).toBe('Paid');
    }, 15000);
  });
});
