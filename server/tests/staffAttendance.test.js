import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import People from '../src/models/People.js';
import Job from '../src/models/Job.js';
import Department from '../src/models/Department.js';
import Role from '../src/models/Role.js';
import Specialization from '../src/models/Specialization.js';
import Degree from '../src/models/Degree.js';
import Staff from '../src/models/Staff.js';
import Status from '../src/models/Status.js';
import Year from '../src/models/Year.js';
import StaffAttendance from '../src/models/StaffAttendance.js';
import User from '../src/models/User.js';

const adminUserId = new mongoose.Types.ObjectId();
const staffUserId = new mongoose.Types.ObjectId();
let adminToken;
let staffToken;

describe('Staff Attendance API Tests', () => {
  let personId1, personId2;
  let jobId1, jobId2;
  let depId1, depId2;
  let roleId1, roleId2;
  let spId1, spId2;
  let degId1, degId2;
  let staffId1, staffId2;
  let statusPresentId, statusAbsentId, statusLateId, statusExcusedId;
  let yearId;
  let attendanceRecordId;

  beforeAll(async () => {
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
      People.deleteMany({}),
      Job.deleteMany({}),
      Department.deleteMany({}),
      Role.deleteMany({}),
      Specialization.deleteMany({}),
      Degree.deleteMany({}),
      Staff.deleteMany({}),
      Status.deleteMany({}),
      Year.deleteMany({}),
      StaffAttendance.deleteMany({}),
      User.deleteMany({ email: { $in: ['sa.admin@test.com', 'sa.student@test.com'] } })
    ]);

    const secret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminUserId.toString(), role: 'admin', name: 'Test Admin' }, secret);
    staffToken = jwt.sign({ id: staffUserId.toString(), role: 'student', name: 'Test Student' }, secret);

    // Login accounts backing the tokens
    await User.create([
      { _id: adminUserId, firstName: 'Test', lastName: 'Admin', email: 'sa.admin@test.com', password: 'password123', role: 'admin' },
      { _id: staffUserId, firstName: 'Test', lastName: 'Student', email: 'sa.student@test.com', password: 'password123', role: 'student' }
    ]);

    // Setup Reference Data
    const p1 = await People.create({ p_no: 'P-TEST-1', name: 'John Doe', tell: '111111', sex: 'Male' });
    const p2 = await People.create({ p_no: 'P-TEST-2', name: 'Jane Smith', tell: '222222', sex: 'Female' });
    personId1 = p1._id;
    personId2 = p2._id;

    const j1 = await Job.create({ job_no: 'J-TEST-1', title: 'Cleaner', salary: 500 });
    const j2 = await Job.create({ job_no: 'J-TEST-2', title: 'Finance Officer', salary: 1200 });
    jobId1 = j1._id;
    jobId2 = j2._id;

    const d1 = await Department.create({ dep_no: 'DEP-TEST-1', dep_name: 'Cleaning & Support' });
    const d2 = await Department.create({ dep_no: 'DEP-TEST-2', dep_name: 'Finance Department' });
    depId1 = d1._id;
    depId2 = d2._id;

    const r1 = await Role.create({ role_no: 'ROLE-TEST-1', role_name: 'Cleaner' });
    const r2 = await Role.create({ role_no: 'ROLE-TEST-2', role_name: 'Finance Manager' });
    roleId1 = r1._id;
    roleId2 = r2._id;

    const sp1 = await Specialization.create({ sp_no: 'SP-TEST-1', sp_name: 'Floor Cleaning' });
    const sp2 = await Specialization.create({ sp_no: 'SP-TEST-2', sp_name: 'Accounting' });
    spId1 = sp1._id;
    spId2 = sp2._id;

    const deg1 = await Degree.create({ dec_no: 'DEG-TEST-1', dec_name: 'High School Diploma', description: 'Secondary Education' });
    const deg2 = await Degree.create({ dec_no: 'DEG-TEST-2', dec_name: 'Bachelor of Commerce', description: 'B.Com Accounting' });
    degId1 = deg1._id;
    degId2 = deg2._id;

    // Create Staff
    const s1 = await Staff.create({
      stf_no: 'STF-TEST-1',
      staffNo: 'STF-TEST-1',
      p_no: personId1,
      personId: personId1,
      job_no: jobId1,
      jobId: jobId1,
      dep_no: depId1,
      role_no: roleId1,
      sp_no: spId1,
      specializationId: spId1,
      dec_no: degId1,
      degreeId: degId1
    });
    const s2 = await Staff.create({
      stf_no: 'STF-TEST-2',
      staffNo: 'STF-TEST-2',
      p_no: personId2,
      personId: personId2,
      job_no: jobId2,
      jobId: jobId2,
      dep_no: depId2,
      role_no: roleId2,
      sp_no: spId2,
      specializationId: spId2,
      dec_no: degId2,
      degreeId: degId2
    });
    staffId1 = s1._id;
    staffId2 = s2._id;

    // Create Statuses
    const as1 = await Status.create({ st_no: 'AS-TEST-1', st_name: 'Present' });
    const as2 = await Status.create({ st_no: 'AS-TEST-2', st_name: 'Absent' });
    const as3 = await Status.create({ st_no: 'AS-TEST-3', st_name: 'Late' });
    const as4 = await Status.create({ st_no: 'AS-TEST-4', st_name: 'Excused' });
    statusPresentId = as1._id;
    statusAbsentId = as2._id;
    statusLateId = as3._id;
    statusExcusedId = as4._id;

    // Create Year
    const yearObj = await Year.create({ y_no: 'Y-TEST-STAFF', y_name: '2026 Staff Year' });
    yearId = yearObj._id;

  }, 180000);

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['sa.admin@test.com', 'sa.student@test.com'] } });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 180000);

  describe('POST /api/staff-attendance (RBAC & CRUD)', () => {
    it('should block non-admin users with 403', async () => {
      const res = await request(app)
        .post('/api/staff-attendance')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          att_date: '2026-07-01',
          y_no: yearId.toString(),
          attendance: [
            {
              stf_no: staffId1.toString(),
              st_no: statusPresentId.toString(),
              time_in: '08:00 AM',
              time_out: '04:30 PM',
              remarks: 'On time'
            }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should validate inputs using zod schema', async () => {
      const res = await request(app)
        .post('/api/staff-attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          att_date: 'invalid-date',
          attendance: []
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully record staff attendance', async () => {
      const res = await request(app)
        .post('/api/staff-attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          att_date: '2026-07-01',
          y_no: yearId.toString(),
          attendance: [
            {
              stf_no: staffId1.toString(),
              st_no: statusPresentId.toString(),
              time_in: '08:00 AM',
              time_out: '05:00 PM',
              remarks: 'On time'
            },
            {
              stf_no: staffId2.toString(),
              st_no: statusAbsentId.toString(),
              remarks: 'Sick leave'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      
      const record1 = res.body.data.find(r => r.stf_no._id === staffId1.toString());
      expect(record1).toBeDefined();
      expect(record1.st_no.st_name).toBe('Present');
      expect(record1.remarks).toBe('On time');

      attendanceRecordId = record1._id;
    });
  });

  describe('GET /api/staff-attendance', () => {
    it('should get history with pagination and details', async () => {
      const res = await request(app)
        .get('/api/staff-attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.totalRecords).toBe(2);
    });

    it('should filter by department and role', async () => {
      const resDep = await request(app)
        .get(`/api/staff-attendance?dep_no=${depId1.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDep.status).toBe(200);
      expect(resDep.body.data.length).toBe(1);
      expect(resDep.body.data[0].stf_no._id).toBe(staffId1.toString());

      const resRole = await request(app)
        .get(`/api/staff-attendance?role_no=${roleId2.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resRole.status).toBe(200);
      expect(resRole.body.data.length).toBe(1);
      expect(resRole.body.data[0].stf_no._id).toBe(staffId2.toString());
    });

    it('should filter by date', async () => {
      const resDate = await request(app)
        .get('/api/staff-attendance?date=2026-07-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDate.status).toBe(200);
      expect(resDate.body.data.length).toBe(2);

      const resNoDate = await request(app)
        .get('/api/staff-attendance?date=2026-07-02')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resNoDate.status).toBe(200);
      expect(resNoDate.body.data.length).toBe(0);
    });
  });

  describe('GET /api/staff-attendance/:id', () => {
    it('should fetch single attendance details by ID', async () => {
      const res = await request(app)
        .get(`/api/staff-attendance/${attendanceRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(attendanceRecordId);
      expect(res.body.data.stf_no._id).toBe(staffId1.toString());
    });

    it('should return 404 if ID does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/staff-attendance/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/staff-attendance/:id', () => {
    it('should update status and remarks of attendance', async () => {
      const res = await request(app)
        .put(`/api/staff-attendance/${attendanceRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          st_no: statusLateId.toString(),
          remarks: 'Late by 15 mins',
          time_in: '08:15 AM'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.st_no._id).toBe(statusLateId.toString());
      expect(res.body.data.remarks).toBe('Late by 15 mins');
      expect(res.body.data.time_in).toBe('08:15 AM');
    });
  });

  describe('GET /api/staff-attendance/report', () => {
    it('should generate monthly report statistics correctly', async () => {
      const res = await request(app)
        .get('/api/staff-attendance/report?year=2026&month=7')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const report = res.body.data;
      expect(report.summary.totalStaff).toBe(2);
      expect(report.summary.totalWorkingDaysRecorded).toBe(2);
      expect(report.staffReports.length).toBe(2);

      const reportStaff1 = report.staffReports.find(item => item.staff._id === staffId1.toString());
      expect(reportStaff1.stats.totalDays).toBe(1);
      expect(reportStaff1.stats.late).toBe(1);
      expect(reportStaff1.stats.present).toBe(0);

      const reportStaff2 = report.staffReports.find(item => item.staff._id === staffId2.toString());
      expect(reportStaff2.stats.totalDays).toBe(1);
      expect(reportStaff2.stats.absent).toBe(1);
    });

    it('should filter monthly report by department', async () => {
      const res = await request(app)
        .get(`/api/staff-attendance/report?year=2026&month=7&dep_no=${depId1.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalStaff).toBe(1);
      expect(res.body.data.staffReports[0].staff._id).toBe(staffId1.toString());
    });
  });

  describe('DELETE /api/staff-attendance/:id', () => {
    it('should delete a record', async () => {
      const res = await request(app)
        .delete(`/api/staff-attendance/${attendanceRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/staff-attendance/${attendanceRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
