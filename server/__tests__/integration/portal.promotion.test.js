import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Guardian from '../../src/models/Guardian.js';
import Family from '../../src/models/Family.js';
import Class from '../../src/models/Class.js';
import Section from '../../src/models/Section.js';
import Level from '../../src/models/Level.js';
import Year from '../../src/models/Year.js';
import Term from '../../src/models/Term.js';
import StudentClass from '../../src/models/StudentClass.js';
import Status from '../../src/models/Status.js';
import Period from '../../src/models/Period.js';
import Subject from '../../src/models/Subject.js';
import StudentAttendance from '../../src/models/StudentAttendance.js';
import StudentInvoice from '../../src/models/StudentInvoice.js';
import Result from '../../src/models/Result.js';
import TimetableSlot from '../../src/models/TimetableSlot.js';

// Verifies Task 2 (parent portal + IDOR), Task 3 (student portal), Task 4 (promotion).
const signToken = (id, role) =>
  jwt.sign({ id, role, name: `${role}-user` }, process.env.JWT_ACCESS_SECRET);

const admarks = { $in: ['POR-A', 'POR-B'] };

describe('Portals & Promotion', () => {
  let studentAUserId, parentUserId, adminUserId;
  let studentAId, studentBId, guardianId;
  let fromClassId, toClassId, toSectionId, yearId, targetYearId;

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.
    const emails = ['por.student@test.com', 'por.parent@test.com', 'por.admin@test.com'];
    await Promise.all([
      User.deleteMany({ email: { $in: emails } }),
      Student.deleteMany({ admissionNumber: admarks }),
      Guardian.deleteMany({ p_no: 'POR-G' }),
      Family.deleteMany({ familyName: 'Portal Family' }),
      Class.deleteMany({ cl_no: { $in: ['POR-C7', 'POR-C8'] } }),
      Level.deleteMany({ lev_no: 'POR-L' }),
      Year.deleteMany({ y_no: { $in: ['POR-Y', 'POR-Y2'] } })
    ]);

    // Real login accounts — authenticate loads these from the DB by id.
    const [studentUser, parentUser, adminUser] = await User.create([
      { firstName: 'Ayaan', lastName: 'A', email: emails[0], password: 'password123', role: 'student' },
      { firstName: 'Portal', lastName: 'Parent', email: emails[1], password: 'password123', role: 'parent' },
      { firstName: 'Admin', lastName: 'User', email: emails[2], password: 'password123', role: 'admin' }
    ]);
    studentAUserId = studentUser._id.toString();
    parentUserId = parentUser._id.toString();
    adminUserId = adminUser._id.toString();

    const level = await Level.create({ lev_no: 'POR-L', lev_name: 'Primary' });
    const year = await Year.create({ y_no: 'POR-Y', y_name: '2026' });
    yearId = year._id;
    const targetYear = await Year.create({ y_no: 'POR-Y2', y_name: '2027' });
    targetYearId = targetYear._id;
    const from = await Class.create({ cl_no: 'POR-C7', cl_name: 'Grade 7', lev_no: level._id });
    const to = await Class.create({ cl_no: 'POR-C8', cl_name: 'Grade 8', lev_no: level._id });
    fromClassId = from._id;
    toClassId = to._id;
    const section = await Section.create({ name: 'A', class: to._id });
    toSectionId = section._id;

    const family = await Family.create({ familyName: 'Portal Family', primaryContactPhone: '060' });
    const guardian = await Guardian.create({
      familyId: family._id, p_no: 'POR-G', name: 'Portal Parent',
      relationship: 'Father', phone: '060', userId: parentUserId
    });
    guardianId = guardian._id;

    const dummy = new mongoose.Types.ObjectId();
    // Student A: linked to the parent guardian AND to a student login account.
      const a = await Student.create({
        firstName: 'Ayaan',
        lastName: 'A',
        admissionNumber: 'POR-A',
        userId: studentAUserId,
        gender: 'Male',
        birthDate: new Date('2012-01-01'),
        classId: fromClassId,
        sectionId: toSectionId,
        phoneNumber: '0610000010',
        address: 'City',
        parentName: 'Portal Parent',
        parentPhoneNumber: '060',
        guardians: [{ guardianId, isPrimary: true }]
      });
    // Student B: NOT linked to the parent (used for IDOR probe).
      const b = await Student.create({
        firstName: 'Bilan',
        lastName: 'B',
        admissionNumber: 'POR-B',
        gender: 'Female',
        birthDate: new Date('2012-01-01'),
        classId: fromClassId,
        sectionId: toSectionId,
        phoneNumber: '0610000011',
        address: 'City',
        parentName: 'Unknown',
        parentPhoneNumber: '060'
      });
    studentAId = a._id.toString();
    studentBId = b._id.toString();
    await StudentClass.create({ sc_no: 'POR-BASE', student: studentAId, class: fromClassId, year: yearId });
  }, 30000);

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: ['por.student@test.com', 'por.parent@test.com', 'por.admin@test.com', 'por.b.account@test.com'] } }),
      Student.deleteMany({ admissionNumber: admarks }),
      Guardian.deleteMany({ p_no: 'POR-G' }),
      Family.deleteMany({ familyName: 'Portal Family' }),
      Class.deleteMany({ cl_no: { $in: ['POR-C7', 'POR-C8'] } }),
      Level.deleteMany({ lev_no: 'POR-L' }),
      Year.deleteMany({ y_no: { $in: ['POR-Y', 'POR-Y2'] } }),
      Section.deleteMany({ _id: toSectionId }),
      StudentClass.deleteMany({ student: { $in: [studentAId, studentBId] } }),
      Term.deleteMany({ name: 'Portal Term' })
    ]);
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  describe('Student portal (Task 3)', () => {
    it('returns the logged-in student\'s own profile', async () => {
      const res = await request(app)
        .get('/api/portal/student/me')
        .set('Authorization', `Bearer ${signToken(studentAUserId, 'student')}`);
      expect(res.status).toBe(200);
      expect(res.body.data.admission_no).toBe('POR-A');
    });

    it('rejects a non-student role (403)', async () => {
      const res = await request(app)
        .get('/api/portal/student/me')
        .set('Authorization', `Bearer ${signToken(adminUserId, 'admin')}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Parent portal (Task 2)', () => {
    it('lists only the guardian\'s linked children', async () => {
      const res = await request(app)
        .get('/api/portal/parent/children')
        .set('Authorization', `Bearer ${signToken(parentUserId, 'parent')}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].admission_no).toBe('POR-A');
    });

    it('IDOR: blocks access to an unlinked child (403)', async () => {
      const res = await request(app)
        .get(`/api/portal/parent/children/${studentBId}/profile`)
        .set('Authorization', `Bearer ${signToken(parentUserId, 'parent')}`);
      expect(res.status).toBe(403);
    });

    it('allows access to a linked child profile (200)', async () => {
      const res = await request(app)
        .get(`/api/portal/parent/children/${studentAId}/profile`)
        .set('Authorization', `Bearer ${signToken(parentUserId, 'parent')}`);
      expect(res.status).toBe(200);
    });
  });

  // These flows were silently broken before Sprint 6: profile populated the wrong
  // fields (class/section vs classId/sectionId), results queried a non-existent
  // student_id field, and timetable read an undefined student.class. Each test
  // seeds a real linked record and asserts the endpoint returns it correctly.
  describe('Portal main flows — correct linked records', () => {
    let ccId, examRegId, feeStrucId;

    beforeAll(async () => {
      ccId = new mongoose.Types.ObjectId();
      examRegId = new mongoose.Types.ObjectId();
      feeStrucId = new mongoose.Types.ObjectId();

      const status = await Status.create({ st_no: 'POR-ST', st_name: 'Present' });
      const term = await Term.create({
        name: 'Portal Term', academicYearId: yearId,
        startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
        status: 'active', workingDays: ['Monday'],
      });
      const period = await Period.create({ termId: term._id, per_no: 'POR-P', per_name: 'P1', time_in: '08:00', time_out: '09:00' });
      const subject = await Subject.create({ sub_no: 'POR-SUB', sub_name: 'Mathematics' });

      const sc = await StudentClass.create({ sc_no: 'POR-SC', student: studentAId, class: fromClassId, year: yearId });
      await StudentAttendance.create({
        studentId: studentAId, periodId: period._id, status: 'Present',
        att_date: new Date('2026-07-01')
      });
      await Result.create({
        res_no: 'POR-RES', ex_r_no: examRegId, cc_no: ccId, id: studentAId,
        marks: 88, grade: 'A', remarks: 'Excellent'
      });
      await StudentInvoice.create({
        invoice_no: 'POR-INV', student: studentAId, fee_struc_no: feeStrucId,
        invoice_amount: 200, paid_amount: 50, balance: 150
      });
      await TimetableSlot.create({
        day: 'Monday', timePeriod: '08:00 - 09:00', teacher: adminUserId,
        class: fromClassId, subject: subject._id, room: 'R1'
      });
    }, 30000);

    afterAll(async () => {
      await Promise.all([
        Status.deleteMany({ st_no: 'POR-ST' }),
        Period.deleteMany({ per_no: 'POR-P' }),
        Subject.deleteMany({ sub_no: 'POR-SUB' }),
        StudentAttendance.deleteMany({ studentId: studentAId }),
        Result.deleteMany({ res_no: 'POR-RES' }),
        StudentInvoice.deleteMany({ invoice_no: 'POR-INV' }),
        TimetableSlot.deleteMany({ room: 'R1', class: fromClassId })
      ]);
    }, 30000);

    const studentAuth = () => `Bearer ${signToken(studentAUserId, 'student')}`;
    const parentAuth = () => `Bearer ${signToken(parentUserId, 'parent')}`;

    it('student /me populates class and section (not raw ids)', async () => {
      const res = await request(app).get('/api/portal/student/me').set('Authorization', studentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.classId).toMatchObject({ cl_name: 'Grade 7' });
      expect(res.body.data.sectionId).toHaveProperty('name');
    });

    it('student /attendance returns the record with a status summary', async () => {
      const res = await request(app).get('/api/portal/student/attendance').set('Authorization', studentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.summary).toMatchObject({ Present: 1 });
    });

    it('student /results returns results linked by student id', async () => {
      const res = await request(app).get('/api/portal/student/results').set('Authorization', studentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].res_no).toBe('POR-RES');
    });

    it('student /invoices returns the invoice with correct totals', async () => {
      const res = await request(app).get('/api/portal/student/invoices').set('Authorization', studentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.invoices).toHaveLength(1);
      expect(res.body.data.totals).toMatchObject({ invoiced: 200, paid: 50, balance: 150 });
    });

    it('student /timetable returns the slot with subject populated', async () => {
      const res = await request(app).get('/api/portal/student/timetable').set('Authorization', studentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].subject).toMatchObject({ sub_name: 'Mathematics' });
    });

    it('parent child /attendance returns the linked child\'s record', async () => {
      const res = await request(app)
        .get(`/api/portal/parent/children/${studentAId}/attendance`)
        .set('Authorization', parentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });

    it('parent child /results returns the linked child\'s results', async () => {
      const res = await request(app)
        .get(`/api/portal/parent/children/${studentAId}/results`)
        .set('Authorization', parentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].res_no).toBe('POR-RES');
    });

    it('parent child /invoices returns the linked child\'s invoice', async () => {
      const res = await request(app)
        .get(`/api/portal/parent/children/${studentAId}/invoices`)
        .set('Authorization', parentAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.invoices).toHaveLength(1);
    });
  });

  describe('Promotion (Task 4)', () => {
    // The previous "previews and commits" test that lived here targeted the
    // old POST /api/promotions/preview + /commit contract (and its
    // PromotionRun audit model), which was replaced during the frontend
    // integration merge with the current promotion system —
    // /promotions/ladder + /preview (GET) + /class + /special + /history in
    // src/routes/promotionRoutes.js, backed by PromotionRecord, not
    // PromotionRun. Coverage for the new contract belongs alongside those
    // routes as a separate suite; keeping the old test would just 404 on
    // every request. See src/controllers/promotionController.js.

    it('promotes a student and records an enrollment row', async () => {
      const res = await request(app)
        .post(`/api/students/${studentAId}/promote`)
        .set('Authorization', `Bearer ${signToken(adminUserId, 'admin')}`)
        .send({ toClassId: toClassId.toString(), toSectionId: toSectionId.toString(), yearId: yearId.toString() });
      expect(res.status).toBe(200);
      expect(res.body.data.student.class).toBe(toClassId.toString());
      expect(res.body.data.student.admissionType).toBe('Promoted');

      const enrollments = await StudentClass.find({ student: studentAId });
      expect(enrollments.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects promotion by a non-privileged role (403)', async () => {
      const res = await request(app)
        .post(`/api/students/${studentAId}/promote`)
        .set('Authorization', `Bearer ${signToken(studentAUserId, 'student')}`)
        .send({ toClassId: toClassId.toString(), toSectionId: toSectionId.toString(), yearId: yearId.toString() });
      expect(res.status).toBe(403);
    });
  });

  describe('Identity linking (User <-> Student)', () => {
    const accountEmail = 'por.b.account@test.com';

    it('provisions a login account for a student, then /me resolves who they are', async () => {
      // Admin provisions an account for student B (who had no login yet).
      const created = await request(app)
        .post(`/api/students/${studentBId}/account`)
        .set('Authorization', `Bearer ${signToken(adminUserId, 'admin')}`)
        .send({ email: accountEmail, password: 'password123' });
      expect(created.status).toBe(201);
      expect(created.body.data.account.email).toBe(accountEmail);

      // The student logs in with the new account.
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: accountEmail, password: 'password123' });
      expect(login.status).toBe(200);

      // /me tells us exactly who this account is.
      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`);
      expect(me.status).toBe(200);
      expect(me.body.data.profile.type).toBe('student');
      expect(me.body.data.profile.data.admission_no).toBe('POR-B');
    });

    it('refuses to double-link an account to the same student (400)', async () => {
      const res = await request(app)
        .post(`/api/students/${studentBId}/account`)
        .set('Authorization', `Bearer ${signToken(adminUserId, 'admin')}`)
        .send({ email: 'another@test.com', password: 'password123' });
      expect(res.status).toBe(400);
    });
  });
});
