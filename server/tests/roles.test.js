import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import AccessRole from '../src/models/AccessRole.js';

// Custom roles: an admin creates them on the Roles page and ticks which pages
// and actions they get; authorize() then lets a user with that role through
// only for those pages and actions.
const adminUserId = new mongoose.Types.ObjectId();
const emails = ['ro.admin@test.com', 'ro.desk@test.com'];
const secret = () => process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_12345';
const bearer = (id, role) => `Bearer ${jwt.sign({ id: id.toString(), role }, secret())}`;

describe('Roles and page access', () => {
  let adminAuth;
  let roleId;
  let deskUser;

  beforeAll(async () => {
    await Promise.all([User.deleteMany({ email: { $in: emails } }), AccessRole.deleteMany({})]);
    await User.create({ _id: adminUserId, firstName: 'Role', lastName: 'Admin', email: emails[0], password: 'password123', role: 'admin' });
    adminAuth = bearer(adminUserId, 'admin');
  }, 180000);

  afterAll(async () => {
    await Promise.all([User.deleteMany({ email: { $in: emails } }), AccessRole.deleteMany({})]);
  }, 180000);

  it('lists the built-in roles with the pages a custom role can be given', async () => {
    const res = await request(app).get('/api/roles').set('Authorization', adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.roles.filter((r) => r.builtIn).map((r) => r.key)).toEqual(
      ['admin', 'principal', 'academic_officer', 'teacher', 'accountant', 'student', 'parent'],
    );
    expect(res.body.data.modules.map((m) => m.key)).toContain('students');
  });

  it('creates a custom role and adds "view" to any page given other actions', async () => {
    const res = await request(app).post('/api/roles').set('Authorization', adminAuth).send({
      name: 'Front Desk', description: 'Reception', color: 'green',
      permissions: { students: ['create'], parents: ['view'], users: ['view'] },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ key: 'front_desk', name: 'Front Desk', builtIn: false });
    // 'users' is never grantable; 'create' implies 'view'.
    expect(res.body.data.permissions).toEqual({ students: ['view', 'create'], parents: ['view'] });
    roleId = res.body.data._id;
  });

  it('refuses a duplicate name, a built-in name and a role with no pages', async () => {
    const dup = await request(app).post('/api/roles').set('Authorization', adminAuth).send({ name: 'front desk', permissions: { students: ['view'] } });
    expect(dup.status).toBe(409);
    const builtIn = await request(app).post('/api/roles').set('Authorization', adminAuth).send({ name: 'Teacher', permissions: { students: ['view'] } });
    expect(builtIn.status).toBe(400);
    const empty = await request(app).post('/api/roles').set('Authorization', adminAuth).send({ name: 'Nothing', permissions: {} });
    expect(empty.status).toBe(400);
  });

  it('assigns the custom role to a new user, and refuses unknown roles', async () => {
    const bad = await request(app).post('/api/users').set('Authorization', adminAuth)
      .send({ firstName: 'No', lastName: 'Role', email: 'ro.none@test.com', role: 'made_up' });
    expect(bad.status).toBe(400);

    const res = await request(app).post('/api/users').set('Authorization', adminAuth)
      .send({ firstName: 'Desk', lastName: 'User', email: emails[1], role: 'front_desk', password: 'password123' });
    expect(res.status).toBe(201);
    deskUser = res.body.data.user;
  });

  it('sends the role name and its pages at login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: emails[1], password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ role: 'front_desk', roleName: 'Front Desk', permissions: { students: ['view', 'create'] } });
  });

  it('lets the custom role use only the pages and actions it was given', async () => {
    const auth = bearer(deskUser._id, 'front_desk');
    expect((await request(app).get('/api/students').set('Authorization', auth)).status).toBe(200);
    expect((await request(app).get('/api/parents').set('Authorization', auth)).status).toBe(200);
    // Lists used for filters are readable…
    expect((await request(app).get('/api/classes').set('Authorization', auth)).status).toBe(200);
    // …but nothing it wasn't given.
    expect((await request(app).delete(`/api/students/${new mongoose.Types.ObjectId()}`).set('Authorization', auth)).status).toBe(403);
    expect((await request(app).post('/api/classes').set('Authorization', auth).send({})).status).toBe(403);
    expect((await request(app).get('/api/staff-attendance').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/users').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/roles').set('Authorization', auth)).status).toBe(403);
  });

  it('applies a change to the role on the next request', async () => {
    const res = await request(app).put(`/api/roles/${roleId}`).set('Authorization', adminAuth)
      .send({ name: 'Front Desk', permissions: { 'teacher-attendance': ['view'] } });
    expect(res.status).toBe(200);
    const auth = bearer(deskUser._id, 'front_desk');
    expect((await request(app).get('/api/staff-attendance').set('Authorization', auth)).status).toBe(200);
    expect((await request(app).get('/api/students').set('Authorization', auth)).status).toBe(403);
  });

  it("won't delete a role while someone has it", async () => {
    const blocked = await request(app).delete(`/api/roles/${roleId}`).set('Authorization', adminAuth);
    expect(blocked.status).toBe(409);
    await User.deleteOne({ _id: deskUser._id });
    const done = await request(app).delete(`/api/roles/${roleId}`).set('Authorization', adminAuth);
    expect(done.status).toBe(200);
  });
});
