import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Guardian from '../src/models/Guardian.js';
import Family from '../src/models/Family.js';
import Student from '../src/models/Student.js';
import Level from '../src/models/Level.js';
import Class from '../src/models/Class.js';

// Deleting a parent: only once no child is linked, admins only, and their
// login and empty family go with them.
const secret = () => process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
const bearer = (id, role) => `Bearer ${jwt.sign({ id: id.toString(), role }, secret())}`;
const adminId = new mongoose.Types.ObjectId();
const principalId = new mongoose.Types.ObjectId();
const parentUserId = new mongoose.Types.ObjectId();
const emails = ['pd.admin@test.com', 'pd.principal@test.com', 'pd.parent@test.com'];
const c = {};

describe('Deleting a parent', () => {
  beforeAll(async () => {
    await User.deleteMany({ email: { $in: emails } });
    await User.create([
      { _id: adminId, firstName: 'Pd', lastName: 'Admin', email: emails[0], password: 'password123', role: 'admin' },
      { _id: principalId, firstName: 'Pd', lastName: 'Principal', email: emails[1], password: 'password123', role: 'principal' },
      { _id: parentUserId, firstName: 'Pd', lastName: 'Parent', email: emails[2], password: 'password123', role: 'parent' },
    ]);
    c.family = await Family.create({ familyName: 'Pd Family', primaryContactPhone: '0618880001' });
    c.guardian = await Guardian.create({ familyId: c.family._id, userId: parentUserId, name: 'Pd Parent', relationship: 'Mother', phone: '0618880001', isPrimary: true });
    c.level = await Level.create({ lev_no: 'PD-L', lev_name: 'Pd level' });
    c.cls = await Class.create({ cl_no: 'PD-C', cl_name: 'Pd class', lev_no: c.level._id });
    c.student = await Student.create({
      firstName: 'Pd', lastName: 'Child', admissionNumber: 'PD-1', gender: 'Male', birthDate: new Date('2014-01-01'),
      phoneNumber: '0618880002', address: 'Hodan', parentName: 'Pd Parent', parentPhoneNumber: '0618880001',
      classId: c.cls._id, familyId: c.family._id, guardians: [{ guardianId: c.guardian._id, isPrimary: true }],
    });
  }, 180000);

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: emails } }),
      Guardian.deleteMany({ phone: '0618880001' }),
      Family.deleteMany({ familyName: 'Pd Family' }),
      Student.deleteMany({ admissionNumber: 'PD-1' }),
      Level.deleteMany({ lev_no: 'PD-L' }),
      Class.deleteMany({ cl_no: 'PD-C' }),
    ]);
  }, 180000);

  it('refuses while a child is still linked', async () => {
    const res = await request(app).delete(`/api/parents/${c.guardian._id}`).set('Authorization', bearer(adminId, 'admin'));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/1 child linked/);
  });

  it('is for admins only', async () => {
    const res = await request(app).delete(`/api/parents/${c.guardian._id}`).set('Authorization', bearer(principalId, 'principal'));
    expect(res.status).toBe(403);
  });

  it('deletes the parent, stops their login and removes the empty family', async () => {
    await request(app).delete(`/api/parents/${c.guardian._id}/students/${c.student._id}`).set('Authorization', bearer(adminId, 'admin')).expect(200);
    // The child left the family, so the family record is no longer used by them.
    await Student.updateOne({ _id: c.student._id }, { $unset: { familyId: 1 } });

    const res = await request(app).delete(`/api/parents/${c.guardian._id}`).set('Authorization', bearer(adminId, 'admin'));
    expect(res.status).toBe(200);
    expect(await Guardian.exists({ _id: c.guardian._id })).toBeNull();
    expect((await User.findById(parentUserId).lean()).status).toBe(false);
    expect(await Family.exists({ _id: c.family._id })).toBeNull();
  });
});
