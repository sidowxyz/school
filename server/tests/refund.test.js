import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { Buffer } from 'node:buffer';
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
import Refund from '../src/models/Refund.js';
import User from '../src/models/User.js';

// End-to-end coverage for the Finance follow-ups: a real Refund ledger
// (previously nonexistent), server-generated receipt numbers on StudentFee
// (previously a client-side timestamp), and the aggregation-based class/year
// filters on the finance reports (previously in-memory filtering after
// loading the whole collection). Everything here runs against the live
// SMS_Test database via jest.setup.js — no mocking.

const adminId = new mongoose.Types.ObjectId();
const accountantId = new mongoose.Types.ObjectId();
const teacherId = new mongoose.Types.ObjectId();
let adminToken, accountantToken, teacherToken;

describe('Refunds, receipt numbering and finance report filters', () => {
  let levelId, yearId, classId, otherClassId, feeTypeId, feeStructureId, paymentMethodId;
  let studentId, otherStudentId, invoiceId, otherInvoiceId, feeId;

  beforeAll(async () => {
    const tokenSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminId.toString(), role: 'admin', name: 'Refund Test Admin' }, tokenSecret);
    accountantToken = jwt.sign({ id: accountantId.toString(), role: 'accountant', name: 'Refund Test Accountant' }, tokenSecret);
    teacherToken = jwt.sign({ id: teacherId.toString(), role: 'teacher', name: 'Refund Test Teacher' }, tokenSecret);

    const usersCol = mongoose.connection.db.collection('users');
    await usersCol.dropIndex('user_no_1').catch(() => {});
    await usersCol.dropIndex('user_name_1').catch(() => {});

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
      Refund.deleteMany({}),
      User.deleteMany({ email: { $in: ['refund.admin@test.com', 'refund.accountant@test.com', 'refund.teacher@test.com'] } })
    ]);

    await User.create([
      { _id: adminId, firstName: 'Refund', lastName: 'Admin', email: 'refund.admin@test.com', password: 'password123', role: 'admin' },
      { _id: accountantId, firstName: 'Refund', lastName: 'Accountant', email: 'refund.accountant@test.com', password: 'password123', role: 'accountant' },
      { _id: teacherId, firstName: 'Refund', lastName: 'Teacher', email: 'refund.teacher@test.com', password: 'password123', role: 'teacher' }
    ]);

    const level = await Level.create({ lev_no: 'L-REFUND', lev_name: 'Refund Test Level' });
    levelId = level._id;

    const year = await Year.create({ y_no: 'Y-REFUND', y_name: '2026 Refund Test' });
    yearId = year._id;

    const testClass = await Class.create({ cl_no: 'C-REFUND', cl_name: 'Refund Test Class', lev_no: levelId });
    classId = testClass._id;
    const otherTestClass = await Class.create({ cl_no: 'C-REFUND-OTHER', cl_name: 'Other Class', lev_no: levelId });
    otherClassId = otherTestClass._id;

    const testSection = await Section.create({ name: 'Refund Test Section', class: classId });
    const otherSection = await Section.create({ name: 'Other Section', class: otherClassId });

    const testFamily = await Family.create({ familyName: 'Refund Test Family', primaryContactPhone: '061111111' });
    await Guardian.create({ familyId: testFamily._id, p_no: 'G-REFUND', name: 'Refund Guardian', relationship: 'Father', phone: '061111111' });
    await Address.create({ add_no: 'ADDR-REFUND', street: 'Test Street', city: 'Test City', state: 'Test State', country: 'Test Country' });
    await Residence.create({ res_no: 'RES-REFUND', type: 'Day Scholar' });

    const student = await Student.create({
      firstName: 'Refund', lastName: 'Student', admissionNumber: 'ZU-REFUND-0001',
      gender: 'Male', birthDate: new Date('2010-01-01'), classId, sectionId: testSection._id,
      phoneNumber: '0611111112', address: 'Test Street', parentName: 'Refund Guardian', parentPhoneNumber: '061111111'
    });
    studentId = student._id;

    // A second student in a different class — proves class_id filtering on
    // the finance reports actually excludes the other class, not just
    // "doesn't crash".
    const otherStudent = await Student.create({
      firstName: 'Other', lastName: 'Student', admissionNumber: 'ZU-REFUND-0002',
      gender: 'Female', birthDate: new Date('2010-01-01'), classId: otherClassId, sectionId: otherSection._id,
      phoneNumber: '0611111113', address: 'Test Street', parentName: 'Refund Guardian', parentPhoneNumber: '061111111'
    });
    otherStudentId = otherStudent._id;

    const feeType = await FeeType.create({ fee_type_no: 'FT-REFUND', fee_name: 'Refund Test Tuition' });
    feeTypeId = feeType._id;

    const feeStructure = await FeeStructure.create({
      fee_struc_no: 'FS-REFUND', fee_type_no: feeTypeId, lev_no: levelId, y_no: yearId, amount: 500
    });
    feeStructureId = feeStructure._id;

    const paymentMethod = await PaymentMethod.create({ payment_method_no: 'PM-REFUND', payment_method_name: 'Cash' });
    paymentMethodId = paymentMethod._id;

    const invoice = await StudentInvoice.create({
      invoice_no: 'INV-REFUND-1', student: studentId, fee_struc_no: feeStructureId,
      invoice_amount: 500, paid_amount: 0, balance: 500, status: 'Unpaid'
    });
    invoiceId = invoice._id;

    const otherInvoice = await StudentInvoice.create({
      invoice_no: 'INV-REFUND-2', student: otherStudentId, fee_struc_no: feeStructureId,
      invoice_amount: 500, paid_amount: 0, balance: 500, status: 'Unpaid'
    });
    otherInvoiceId = otherInvoice._id;
  }, 60000);

  afterAll(async () => {
    // Clean up the receipt PDF this file generates on disk so repeated test
    // runs don't accumulate files in the receipts/ folder.
    const leftoverFees = await StudentFee.find({ pdfPath: { $exists: true, $ne: null } });
    for (const fee of leftoverFees) {
      if (fee.pdfPath && fs.existsSync(fee.pdfPath)) fs.unlinkSync(fee.pdfPath);
    }

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
      Refund.deleteMany({}),
      User.deleteMany({ email: { $in: ['refund.admin@test.com', 'refund.accountant@test.com', 'refund.teacher@test.com'] } })
    ]);
  }, 60000);

  // ==========================================
  // RECEIPT NUMBER AUTO-GENERATION
  // ==========================================
  describe('POST /api/student-fees without student_fee_no', () => {
    it('auto-generates an RCPT-<year>-<seq> receipt number', async () => {
      const res = await request(app)
        .post('/api/student-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ invoice_no: invoiceId, payment_method_no: paymentMethodId, paid_amount: 300 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student_fee_no).toMatch(/^RCPT-\d{4}-\d{4}$/);
      expect(res.body.data.paid_amount).toBe(300);
      feeId = res.body.data._id;
    });

    it('generates a real PDF receipt on disk and returns it for download', async () => {
      const fee = await StudentFee.findById(feeId);
      expect(fee.pdfPath).toBeTruthy();
      expect(fs.existsSync(fee.pdfPath)).toBe(true);

      const download = await request(app)
        .get(`/api/student-fees/${feeId}/receipt`)
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(download.status).toBe(200);
      expect(download.headers['content-type']).toBe('application/pdf');
      // A real PDF starts with the %PDF- magic bytes.
      expect(download.body.slice(0, 5).toString()).toBe('%PDF-');
      expect(download.body.length).toBeGreaterThan(100);
    });

    it('404s a receipt download for a payment id that does not exist', async () => {
      const res = await request(app)
        .get(`/api/student-fees/${new mongoose.Types.ObjectId()}/receipt`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('still accepts and honours a caller-supplied number', async () => {
      const res = await request(app)
        .post('/api/student-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_fee_no: 'SF-CUSTOM-1', invoice_no: otherInvoiceId,
          payment_method_no: paymentMethodId, paid_amount: 500
        });

      expect(res.status).toBe(201);
      expect(res.body.data.student_fee_no).toBe('SF-CUSTOM-1');
    });

    it('rejects a duplicate caller-supplied number', async () => {
      const res = await request(app)
        .post('/api/student-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_fee_no: 'SF-CUSTOM-1', invoice_no: invoiceId,
          payment_method_no: paymentMethodId, paid_amount: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  // ==========================================
  // REFUND ISSUING
  // ==========================================
  describe('POST /api/refunds', () => {
    it('is refused for a role outside the finance department', async () => {
      const res = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ student_fee_no: feeId, amount: 100, reason: 'Not your job' });

      expect(res.status).toBe(403);
    });

    it('rejects a refund larger than the payment', async () => {
      const res = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ student_fee_no: feeId, amount: 9999, reason: 'Too much' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exceeds/i);
    });

    it('lets an accountant issue a partial refund and reverses the invoice balance', async () => {
      const before = await request(app)
        .get(`/api/student-invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(before.body.data.paid_amount).toBe(300);

      const res = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ student_fee_no: feeId, amount: 120, reason: 'Overpaid — family requested partial refund' });

      expect(res.status).toBe(201);
      expect(res.body.data.refund_no).toMatch(/^REF-\d{4}-\d{4}$/);
      expect(res.body.data.amount).toBe(120);
      expect(res.body.data.status).toBe('issued');

      const after = await request(app)
        .get(`/api/student-invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(after.body.data.paid_amount).toBe(180); // 300 - 120
      expect(after.body.data.balance).toBe(320); // 500 - 180
      expect(after.body.data.status).toBe('Partially_Paid');
    });

    it('will not let a second refund exceed what remains refundable on that payment', async () => {
      // 300 was paid, 120 already refunded — only 180 is left refundable.
      const res = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ student_fee_no: feeId, amount: 200, reason: 'Second refund attempt' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exceeds/i);
    });
  });

  // ==========================================
  // REFUND REVERSAL
  // ==========================================
  describe('POST /api/refunds/:id/reverse', () => {
    let refundId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ student_fee_no: feeId, amount: 50, reason: 'Refund to be reversed' });
      refundId = res.body.data._id;
    });

    it('puts the money back on the invoice and marks the refund reversed', async () => {
      const before = await request(app)
        .get(`/api/student-invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const paidBefore = before.body.data.paid_amount;

      const res = await request(app)
        .post(`/api/refunds/${refundId}/reverse`)
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('reversed');

      const after = await request(app)
        .get(`/api/student-invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(after.body.data.paid_amount).toBe(paidBefore + 50);
    });

    it('refuses to reverse an already-reversed refund', async () => {
      const res = await request(app)
        .post(`/api/refunds/${refundId}/reverse`)
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already been reversed/i);
    });
  });

  // ==========================================
  // FINANCE REPORTS: role gating, live data, aggregation filters
  // ==========================================
  describe('GET /api/reports/run/finance-refunds', () => {
    it('is refused for a teacher', async () => {
      const res = await request(app)
        .get('/api/reports/run/finance-refunds')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    it('shows the issued and reversed refunds for an accountant', async () => {
      const res = await request(app)
        .get('/api/reports/run/finance-refunds')
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const rows = res.body.data.rows;
      expect(rows.length).toBeGreaterThanOrEqual(2);

      const issuedRow = rows.find((r) => r.amount === 120 && r.status === 'issued');
      expect(issuedRow).toBeDefined();
      expect(issuedRow.rollNo).toBe('ZU-REFUND-0001');
      expect(issuedRow.reason).toMatch(/partial refund/i);

      const reversedRow = rows.find((r) => r.amount === 50 && r.status === 'reversed');
      expect(reversedRow).toBeDefined();

      const summaryTotal = res.body.data.summary.find((s) => s.label === 'Total Refunded');
      expect(summaryTotal.value).toBe(120); // only 'issued' counts, the reversed 50 is excluded
    });

    it('scopes to one class via the aggregation-resolved class filter', async () => {
      // Every refund fixture in this file belongs to `studentId`, who is in
      // `classId` — filtering to `otherClassId` (which has no refunds) must
      // come back empty, proving the filter reaches the database rather than
      // being ignored.
      const res = await request(app)
        .get('/api/reports/run/finance-refunds')
        .query({ class_id: otherClassId.toString() })
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows).toEqual([]);
    });
  });

  describe('GET /api/reports/run/finance-collection-by-class', () => {
    it('scopes invoices to the requested class only', async () => {
      const res = await request(app)
        .get('/api/reports/run/finance-collection-by-class')
        .query({ class_id: classId.toString() })
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      const rows = res.body.data.rows;
      expect(rows.length).toBe(1);
      expect(rows[0].className).toBe('Refund Test Class');
      // Only this class's own invoice (500) is counted, not the other class's.
      expect(rows[0].expected).toBe(500);
    });

    it('returns a different, correctly-scoped result for the other class', async () => {
      const res = await request(app)
        .get('/api/reports/run/finance-collection-by-class')
        .query({ class_id: otherClassId.toString() })
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      const rows = res.body.data.rows;
      expect(rows.length).toBe(1);
      expect(rows[0].className).toBe('Other Class');
      expect(rows[0].collected).toBe(500); // otherInvoice was paid in full via SF-CUSTOM-1
    });
  });

  describe('GET /api/reports/run/finance-payments-monthly', () => {
    it('filters by payment_method_id directly on StudentFee, no lookup needed', async () => {
      const res = await request(app)
        .get('/api/reports/run/finance-payment-history')
        .query({ payment_method_id: paymentMethodId.toString() })
        .set('Authorization', `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThan(0);
      for (const row of res.body.data.rows) {
        expect(row.method).toBe('Cash');
      }
    });
  });
});
