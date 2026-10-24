import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Level from '../src/models/Level.js';
import Class from '../src/models/Class.js';
import Student from '../src/models/Student.js';
import StudentClass from '../src/models/StudentClass.js';
import Guardian from '../src/models/Guardian.js';
import Family from '../src/models/Family.js';

// A registration that fails halfway must not leave its new guardian behind:
// on a database without transactions (a standalone local MongoDB) the next
// attempt would otherwise be refused with "this parent or guardian already exists".
const adminId = new mongoose.Types.ObjectId();
const secret = () => process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
const admin = () => `Bearer ${jwt.sign({ id: adminId.toString(), role: 'admin' }, secret())}`;
const PHONE = '0619990001';
const c = {};

const body = (extra = {}) => ({
  firstName: 'Reg', lastName: 'Test', gender: 'Female', birthDate: '2014-02-01',
  classId: String(c.cls._id), sectionId: null, phoneNumber: '0619990000', address: 'Hodan',
  parentName: 'Reg Parent', parentPhoneNumber: PHONE,
  guardian: { mode: 'new', name: 'Reg Parent', relationship: 'Mother', phone: PHONE },
  ...extra,
});

describe('Student registration', () => {
  beforeAll(async () => {
    await User.deleteMany({ email: 'reg.admin@test.com' });
    await User.create({ _id: adminId, firstName: 'Reg', lastName: 'Admin', email: 'reg.admin@test.com', password: 'password123', role: 'admin' });
    c.level = await Level.create({ lev_no: 'REG-L', lev_name: 'Reg level' });
    c.cls = await Class.create({ cl_no: 'REG-C', cl_name: 'Reg class', lev_no: c.level._id });
  }, 180000);

  afterAll(async () => {
    const students = await Student.find({ firstName: 'Reg' }).select('_id').lean();
    await Promise.all([
      User.deleteMany({ email: 'reg.admin@test.com' }),
      Level.deleteMany({ lev_no: 'REG-L' }),
      Class.deleteMany({ cl_no: 'REG-C' }),
      Student.deleteMany({ firstName: 'Reg' }),
      StudentClass.deleteMany({ student: { $in: students.map((s) => s._id) } }),
      Guardian.deleteMany({ phone: PHONE }),
      Family.deleteMany({ primaryContactPhone: PHONE }),
    ]);
  }, 180000);

  it('leaves nothing behind when saving the student fails, so a retry works', async () => {
    const spy = jest.spyOn(Student, 'create').mockRejectedValueOnce(new Error('disk full'));
    const failed = await request(app).post('/api/students').set('Authorization', admin()).send(body());
    spy.mockRestore();
    expect(failed.status).toBeGreaterThanOrEqual(400);
    expect(await Guardian.countDocuments({ phone: PHONE })).toBe(0);
    expect(await Family.countDocuments({ primaryContactPhone: PHONE })).toBe(0);

    const retry = await request(app).post('/api/students').set('Authorization', admin()).send(body());
    expect(retry.status).toBe(201);
    expect(await Guardian.countDocuments({ phone: PHONE })).toBe(1);
  });

  it('refuses a duplicate student email before creating the guardian', async () => {
    await Student.updateOne({ firstName: 'Reg' }, { email: 'reg.student@test.com' });
    const res = await request(app).post('/api/students').set('Authorization', admin())
      .send(body({ email: 'reg.student@test.com', parentPhoneNumber: '0619990002', guardian: { mode: 'new', name: 'Other', relationship: 'Father', phone: '0619990002' } }));
    expect(res.status).toBe(409);
    expect(await Guardian.countDocuments({ phone: '0619990002' })).toBe(0);
  });
});
