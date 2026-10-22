import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/server.js'; // Ensure app is exported in server.js
import Family from '../../src/models/Family.js';
import Guardian from '../../src/models/Guardian.js';
import Student from '../../src/models/Student.js';
import User from '../../src/models/User.js';
import Class from '../../src/models/Class.js';
import Section from '../../src/models/Section.js';
import StudentClass from '../../src/models/StudentClass.js';



describe('Family & Guardian Integration Tests', () => {
  let adminToken;

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.

    // Family routes require an authenticated staff user.
    const adminId = new mongoose.Types.ObjectId();
    await User.deleteMany({ email: 'family.admin@test.com' });
    await User.create({
      _id: adminId,
      firstName: 'Family',
      lastName: 'Admin',
      email: 'family.admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    adminToken = jwt.sign(
      { id: adminId.toString(), role: 'admin' },
      process.env.JWT_ACCESS_SECRET
    );
  }, 30000);

  beforeEach(async () => {
    await Family.deleteMany({});
    await Guardian.deleteMany({});
    await Student.deleteMany({});
    await StudentClass.deleteMany({});
    await Section.deleteMany({ name: /^Registration / });
    await Class.deleteMany({ cl_no: /^REG-/ });
  }, 30000);

  afterEach(async () => {
    await Family.deleteMany({});
    await Guardian.deleteMany({});
    await Student.deleteMany({});
    await StudentClass.deleteMany({});
    await Section.deleteMany({ name: /^Registration / });
    await Class.deleteMany({ cl_no: /^REG-/ });
  }, 30000);

  afterAll(async () => {
    // Do not close the shared connection here — jest.setup.js's connection is
    // reused across every test file in this run; closing it here would force
    // whichever file runs next to reconnect, risking the same production leak
    // this comment is here to prevent.
  }, 30000);

  it('should create a family and assign 3 students, applying Tier 2 discount', async () => {
    // 1. Create a family
    const familyRes = await request(app)
      .post('/api/families')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyName: 'Smith Family',
        primaryContactPhone: '1234567890',
        primaryContactEmail: 'smith@test.com',
        guardianName: 'John Smith',
        relationship: 'Father'
      });

    expect(familyRes.statusCode).toBe(201);
    const familyId = familyRes.body.data.family._id;

    // 2. Create 3 fake students (mocking the required fields)
    const _mockLevelId = new mongoose.Types.ObjectId();
    const mockClassId = new mongoose.Types.ObjectId();
    const mockSectionId = new mongoose.Types.ObjectId();
    const mockAddressId = new mongoose.Types.ObjectId();
    const mockResidenceId = new mongoose.Types.ObjectId();

    const studentDocs = await Student.insertMany([
      {
        firstName: 'S1',
        lastName: 'Smith',
        admissionNumber: `A-${Date.now()}-1`,
        gender: 'Male',
        birthDate: new Date(),
        classId: mockClassId,
        sectionId: mockSectionId,
        phoneNumber: '0610000001',
        address: 'Test address',
        parentName: 'Test Parent',
        parentPhoneNumber: '1234567890'
      },
      {
        firstName: 'S2',
        lastName: 'Smith',
        admissionNumber: `A-${Date.now()}-2`,
        gender: 'Male',
        birthDate: new Date(),
        classId: mockClassId,
        sectionId: mockSectionId,
        phoneNumber: '0610000002',
        address: 'Test address',
        parentName: 'Test Parent',
        parentPhoneNumber: '1234567890'
      },
      {
        firstName: 'S3',
        lastName: 'Smith',
        admissionNumber: `A-${Date.now()}-3`,
        gender: 'Male',
        birthDate: new Date(),
        classId: mockClassId,
        sectionId: mockSectionId,
        phoneNumber: '0610000003',
        address: 'Test address',
        parentName: 'Test Parent',
        parentPhoneNumber: '1234567890'
      }
    ]);

    // 3. Assign students to family
    for (const student of studentDocs) {
      const assignRes = await request(app)
        .post(`/api/families/${familyId}/students/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(assignRes.statusCode).toBe(200);
    }

    // 4. Fetch family profile and check discount tier
    const profileRes = await request(app)
      .get(`/api/families/${familyId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.data.family.siblingCount).toBe(3);
    expect(profileRes.body.data.family.discountTier).toBe('Tier 2 (3+ siblings)');
  }, 30000);

  it('registers a parent with the first child and reuses that parent for a sibling in a class without sections', async () => {
    const classObj = await Class.create({
      cl_no: `REG-${Date.now()}`,
      cl_name: 'Registration No Section',
      lev_no: new mongoose.Types.ObjectId(),
    });

    const first = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ayaan', lastName: 'Ali', gender: 'Female', birthDate: '2014-01-10',
        classId: classObj._id.toString(), sectionId: null,
        phoneNumber: '0611000001', address: 'Mogadishu',
        parentName: 'Hodan Ali', parentPhoneNumber: '0617777000',
        guardian: {
          mode: 'new', name: 'Hodan Ali', relationship: 'Mother',
          phone: '0617777000', email: 'hodan.registration@test.com',
        },
      });

    expect(first.statusCode).toBe(201);
    expect(first.body.data.sectionId).toBeNull();
    const guardianId = first.body.data.guardians[0].guardianId._id;

    const sibling = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Yusuf', lastName: 'Ali', gender: 'Male', birthDate: '2012-03-12',
        classId: classObj._id.toString(), sectionId: null,
        phoneNumber: '0611000002', address: 'Mogadishu',
        parentName: 'Hodan Ali', parentPhoneNumber: '0617777000',
        guardian: { mode: 'existing', guardianId },
      });

    expect(sibling.statusCode).toBe(201);
    expect(sibling.body.data.guardians[0].guardianId._id).toBe(guardianId);
    const guardian = await Guardian.findById(guardianId);
    const family = await Family.findById(guardian.familyId);
    expect(family.siblingCount).toBe(2);
    expect(family.discountTier).toBe('Tier 1 (2 siblings)');
  }, 30000);

  it('requires a section only when the selected class has configured sections', async () => {
    const classObj = await Class.create({
      cl_no: `REG-${Date.now()}`,
      cl_name: 'Registration With Section',
      lev_no: new mongoose.Types.ObjectId(),
    });
    await Section.create({ name: `Registration A ${Date.now()}`, class: classObj._id });

    const response = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Section', lastName: 'Required', gender: 'Male', birthDate: '2013-01-01',
        classId: classObj._id.toString(), sectionId: null,
        phoneNumber: '0611000010', address: 'Mogadishu',
        parentName: 'Test Guardian', parentPhoneNumber: '0617777010',
        guardian: { mode: 'new', name: 'Test Guardian', relationship: 'Guardian', phone: '0617777010' },
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/select a section/i);
  }, 30000);
});
