import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import AuditLog from '../../src/models/auditLog.model.js';
import AuditAction from '../../src/models/auditAction.model.js';
import AuditModule from '../../src/models/auditModule.model.js';
import Student from '../../src/models/Student.js';
import Class from '../../src/models/Class.js';
import Section from '../../src/models/Section.js';
import Address from '../../src/models/Address.js';
import Residence from '../../src/models/Residence.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

describe('Audit Logging & RBAC Integration Tests', () => {
  let adminToken;
  let studentToken;
  let adminUser;
  let studentUser;

  // Polling helper to wait for the background logAudit writes
  const waitForAuditLog = async (query, timeoutMs = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const logs = await AuditLog.find(query)
        .populate('action_no')
        .populate('module_no');
      
      // If we found a log that matches the action and module population, return it
      if (logs.length > 0) {
        return logs[0];
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for audit log matching query: ${JSON.stringify(query)}`);
  };

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.

    // Clean databases
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    await AuditAction.deleteMany({});
    await AuditModule.deleteMany({});
    await Student.deleteMany({});

    // Pre-seed Actions and Modules to speed up first execution
    await AuditAction.create([
      { action_no: 1, action_name: 'CREATE' },
      { action_no: 2, action_name: 'UPDATE' },
      { action_no: 3, action_name: 'DELETE' }
    ]);

    await AuditModule.create([
      { module_no: 1, module_name: 'Student' },
      { module_no: 2, module_name: 'Teacher' },
      { module_no: 3, module_name: 'Invoice' },
      { module_no: 4, module_name: 'Payment' },
      { module_no: 5, module_name: 'Mark' }
    ]);

    // Create Admin User
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin.audit.test@example.com',
      password: 'password123',
      role: 'admin',
      status: true
    });
    adminToken = generateAccessToken(adminUser);

    // Create Student User
    studentUser = await User.create({
      firstName: 'Student',
      lastName: 'User',
      email: 'student.audit.test@example.com',
      password: 'password123',
      role: 'student',
      status: true
    });
    studentToken = generateAccessToken(studentUser);
  }, 30000);

  afterAll(async () => {
    // A brief delay to allow any final finish event logs to write before closing connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    await AuditAction.deleteMany({});
    await AuditModule.deleteMany({});
    await Student.deleteMany({});
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  describe('RBAC for Viewing Audit Logs', () => {
    it('should reject unauthenticated request to /api/audit-logs with 401', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.statusCode).toBe(401);
    }, 15000);

    it('should reject student request to /api/audit-logs with 403', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.statusCode).toBe(403);
    }, 15000);

    it('should allow admin request to /api/audit-logs with 200', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }, 15000);
  });

  describe('Audit Log Generation on Student Actions', () => {
    let studentId;

    it('should log an audit entry when creating a student', async () => {
      // 1. Create reference models directly or mock
      const suffix = Date.now().toString() + Math.random().toString(36).substring(2, 7);
      const classObj = await Class.create({ cl_no: 'C' + suffix, cl_name: 'Class ' + suffix, lev_no: new mongoose.Types.ObjectId() });
      const section = await Section.create({ name: 'Sec ' + suffix, class: classObj._id });
      const address = await Address.create({ add_no: 'ADDR-' + suffix, street: 'St 1', city: 'Mog', state: 'Ban', country: 'Som' });
      const residence = await Residence.create({ res_no: 'RES-' + suffix, type: 'Day Scholar', details: 'Details' });

      // 2. Create student via API
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `john.doe.${Date.now()}@example.com`,
          admission_no: `ADM-${Date.now()}`,
          admissionNumber: `ADM-${Date.now()}`,
          gender: 'Male',
          birthDate: '2010-01-01',
          classId: classObj._id.toString(),
          sectionId: section._id.toString(),
          phoneNumber: '0610000001',
          address: 'Test Street, Test City',
          parentName: 'Student Guardian',
          parentPhoneNumber: '061999999',
          p_no: new mongoose.Types.ObjectId().toString(),
          birth: '2010-01-01',
          p_birth: 'Mogadishu',
          add_no: address._id.toString(),
          res_no: residence._id.toString(),
          class: classObj._id.toString(),
          section: section._id.toString(),
        });

      expect(res.statusCode).toBe(201);
      studentId = res.body.data._id;

      // Poll database to ensure background audit write has finished
      const auditModuleDoc = await AuditModule.findOne({ module_name: 'Student' });
      const auditActionDoc = await AuditAction.findOne({ action_name: 'CREATE' });
      
      const createdLog = await waitForAuditLog({
        record_id: studentId,
        action_no: auditActionDoc._id,
        module_no: auditModuleDoc._id
      });

      expect(createdLog).toBeDefined();
      expect(createdLog.record_id).toBe(studentId);

      // 3. Query audit logs via API to verify response contents
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.statusCode).toBe(200);
      const studentCreateLogs = auditRes.body.data.filter(log => log.module === 'Student' && log.action === 'CREATE');
      expect(studentCreateLogs.length).toBeGreaterThan(0);
      expect(studentCreateLogs[0].record_id).toBe(studentId);
      expect(studentCreateLogs[0].user.email).toBe(adminUser.email);
    }, 15000);

    it('should log an audit entry when updating a student', async () => {
      const res = await request(app)
        .put(`/api/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Johnny',
        });

      expect(res.statusCode).toBe(200);

      // Poll database to ensure background update audit log write has finished
      const auditModuleDoc = await AuditModule.findOne({ module_name: 'Student' });
      const auditActionDoc = await AuditAction.findOne({ action_name: 'UPDATE' });
      
      const updatedLog = await waitForAuditLog({
        record_id: studentId,
        action_no: auditActionDoc._id,
        module_no: auditModuleDoc._id
      });

      expect(updatedLog).toBeDefined();

      // Query audit logs via API
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ module: 'Student', action: 'UPDATE' });

      expect(auditRes.statusCode).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThan(0);
      expect(auditRes.body.data[0].before_changes.firstName).toBe('John');
      expect(auditRes.body.data[0].after_changes.firstName).toBe('Johnny');
    }, 15000);

    it('should log an audit entry when deleting a student', async () => {
      const res = await request(app)
        .delete(`/api/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      // Poll database to ensure background delete audit log write has finished
      const auditModuleDoc = await AuditModule.findOne({ module_name: 'Student' });
      const auditActionDoc = await AuditAction.findOne({ action_name: 'DELETE' });
      
      const deletedLog = await waitForAuditLog({
        record_id: studentId,
        action_no: auditActionDoc._id,
        module_no: auditModuleDoc._id
      });

      expect(deletedLog).toBeDefined();

      // Query audit logs via API
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ module: 'Student', action: 'DELETE' });

      expect(auditRes.statusCode).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThan(0);
      expect(auditRes.body.data[0].record_id).toBe(studentId);
    }, 15000);
  });
});
