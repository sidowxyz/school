import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import Teacher from '../src/models/Teacher.js';
import StaffAttendance from '../src/models/StaffAttendance.js';
import User from '../src/models/User.js';

// Staff attendance is recorded per teacher ({ teacherId, status }), with the
// department stored as text on the Teacher profile — see StaffAttendanceService.
const adminUserId = new mongoose.Types.ObjectId();
const studentUserId = new mongoose.Types.ObjectId();
const teacherUserId1 = new mongoose.Types.ObjectId();
const teacherUserId2 = new mongoose.Types.ObjectId();
let adminToken;
let studentToken;

describe('Staff Attendance API Tests', () => {
  let teacherId1, teacherId2;
  let attendanceRecordId;

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database on the main
    // cluster) — this file must never connect on its own to a different,
    // hardcoded cluster/credential, which risked silently diverging from
    // every other test file's shared connection.

    const emails = ['sa.admin@test.com', 'sa.student@test.com', 'sa.teacher1@test.com', 'sa.teacher2@test.com'];

    // Clean up. The monthly report counts every teacher, so start from none.
    await Promise.all([
      Teacher.deleteMany({}),
      StaffAttendance.deleteMany({}),
      User.deleteMany({ email: { $in: emails } })
    ]);

    const secret = process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
    adminToken = jwt.sign({ id: adminUserId.toString(), role: 'admin', name: 'Test Admin' }, secret);
    studentToken = jwt.sign({ id: studentUserId.toString(), role: 'student', name: 'Test Student' }, secret);

    // Login accounts backing the tokens, plus the two teachers' accounts
    await User.create([
      { _id: adminUserId, firstName: 'Test', lastName: 'Admin', email: emails[0], password: 'password123', role: 'admin' },
      { _id: studentUserId, firstName: 'Test', lastName: 'Student', email: emails[1], password: 'password123', role: 'student' },
      { _id: teacherUserId1, firstName: 'John', lastName: 'Doe', email: emails[2], password: 'password123', role: 'teacher' },
      { _id: teacherUserId2, firstName: 'Jane', lastName: 'Smith', email: emails[3], password: 'password123', role: 'teacher' }
    ]);

    const [t1, t2] = await Teacher.create([
      { userId: teacherUserId1, staffId: 'STF-TEST-1', department: 'Support' },
      { userId: teacherUserId2, staffId: 'STF-TEST-2', department: 'Finance' }
    ]);
    teacherId1 = t1._id;
    teacherId2 = t2._id;
  }, 180000);

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['sa.admin@test.com', 'sa.student@test.com', 'sa.teacher1@test.com', 'sa.teacher2@test.com'] } });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 180000);

  describe('POST /api/staff-attendance (RBAC & CRUD)', () => {
    it('should block non-admin users with 403', async () => {
      const res = await request(app)
        .post('/api/staff-attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          att_date: '2026-07-01',
          attendance: [
            {
              teacherId: teacherId1.toString(),
              status: 'Present',
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
          attendance: [
            {
              teacherId: teacherId1.toString(),
              status: 'Present',
              time_in: '08:00 AM',
              time_out: '05:00 PM',
              remarks: 'On time'
            },
            {
              teacherId: teacherId2.toString(),
              status: 'Absent',
              remarks: 'Sick leave'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);

      const record1 = res.body.data.find(r => r.teacherId._id === teacherId1.toString());
      expect(record1).toBeDefined();
      expect(record1.status).toBe('Present');
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

    it('should filter by department and by teacher', async () => {
      const resDep = await request(app)
        .get('/api/staff-attendance?department=Support')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDep.status).toBe(200);
      expect(resDep.body.data.length).toBe(1);
      expect(resDep.body.data[0].teacherId._id).toBe(teacherId1.toString());

      const resTeacher = await request(app)
        .get(`/api/staff-attendance?teacherId=${teacherId2.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resTeacher.status).toBe(200);
      expect(resTeacher.body.data.length).toBe(1);
      expect(resTeacher.body.data[0].teacherId._id).toBe(teacherId2.toString());
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
      expect(res.body.data.teacherId._id).toBe(teacherId1.toString());
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
          status: 'Late',
          remarks: 'Late by 15 mins',
          time_in: '08:15 AM'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Late');
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

      const reportStaff1 = report.staffReports.find(item => item.staff._id === teacherId1.toString());
      expect(reportStaff1.stats.totalDays).toBe(1);
      expect(reportStaff1.stats.late).toBe(1);
      expect(reportStaff1.stats.present).toBe(0);

      const reportStaff2 = report.staffReports.find(item => item.staff._id === teacherId2.toString());
      expect(reportStaff2.stats.totalDays).toBe(1);
      expect(reportStaff2.stats.absent).toBe(1);
    });

    it('should filter monthly report by department', async () => {
      const res = await request(app)
        .get('/api/staff-attendance/report?year=2026&month=7&department=Support')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalStaff).toBe(1);
      expect(res.body.data.staffReports[0].staff._id).toBe(teacherId1.toString());
    });
  });

  describe('GET /api/staff-attendance/summary', () => {
    it('counts today, the daily trend and who missed most in the database', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const saved = await request(app)
        .post('/api/staff-attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ att_date: today, attendance: [{ teacherId: teacherId1.toString(), status: 'Absent', remarks: 'Sick' }] });
      expect(saved.status).toBe(201);

      // Saving the same day again updates that record rather than adding one.
      await request(app)
        .post('/api/staff-attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ att_date: today, attendance: [{ teacherId: teacherId1.toString(), status: 'Absent' }] });
      expect(await StaffAttendance.countDocuments({ teacherId: teacherId1, att_date: new Date(today) })).toBe(1);

      const res = await request(app)
        .get('/api/staff-attendance/summary?days=30')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.staff).toBe(2);
      expect(d.today).toMatchObject({ absent: 1, total: 1, notMarked: 1 });
      expect(d.awayToday[0]).toMatchObject({ teacherId: teacherId1.toString(), status: 'Absent', remarks: 'Sick' });
      expect(d.mostAbsent[0]).toMatchObject({ teacherId: teacherId1.toString(), absent: 1 });
      expect(d.daily.find((x) => x.date === today)).toMatchObject({ absent: 1 });

      await StaffAttendance.deleteMany({ att_date: new Date(today) });
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
