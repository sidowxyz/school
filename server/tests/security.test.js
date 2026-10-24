import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Level from '../src/models/Level.js';
import Class from '../src/models/Class.js';
import Section from '../src/models/Section.js';
import Student from '../src/models/Student.js';
import Period from '../src/models/Period.js';
import Year from '../src/models/Year.js';

// Production protections: portal accounts see only their portal, staff roles
// only what their job needs, and user input can't reach the database as a query.
const ids = {
  admin: new mongoose.Types.ObjectId(),
  parent: new mongoose.Types.ObjectId(),
  officer: new mongoose.Types.ObjectId(),
};
const emails = ['sec.admin@test.com', 'sec.parent@test.com', 'sec.officer@test.com'];
const bearer = (role) => `Bearer ${jwt.sign({ id: ids[role === 'academic_officer' ? 'officer' : role].toString(), role }, process.env.JWT_ACCESS_SECRET)}`;
const made = {};

describe('Production protections', () => {
  beforeAll(async () => {
    await User.deleteMany({ email: { $in: emails } });
    await User.create([
      { _id: ids.admin, firstName: 'Sec', lastName: 'Admin', email: emails[0], password: 'password123', role: 'admin' },
      { _id: ids.parent, firstName: 'Sec', lastName: 'Parent', email: emails[1], password: 'password123', role: 'parent' },
      { _id: ids.officer, firstName: 'Sec', lastName: 'Officer', email: emails[2], password: 'password123', role: 'academic_officer' },
    ]);
    made.level = await Level.create({ lev_no: 'SEC-L', lev_name: 'Security level' });
  }, 60000);

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: emails } }),
      Level.deleteMany({ lev_no: 'SEC-L' }),
      Class.deleteMany({ cl_no: { $in: ['SEC-1', 'SEC-2'] } }),
      Section.deleteMany({ _id: made.section?._id }),
      Student.deleteMany({ admissionNumber: 'SEC-100' }),
      Period.deleteMany({ per_no: 'SEC-P' }),
      Year.deleteMany({ y_no: 'SEC-Y' }),
      User.deleteMany({ email: 'sec.student@test.com' }),
    ]);
  }, 60000);

  it('keeps parent accounts out of school-wide data', async () => {
    for (const path of ['/api/student-fees', '/api/student-invoices', '/api/parents', '/api/teachers', '/api/students', '/api/users']) {
      const res = await request(app).get(path).set('Authorization', bearer('parent'));
      expect([path, res.status]).toEqual([path, 403]);
    }
    // Their own portal and the school's name and logo still work.
    expect((await request(app).get('/api/v1/settings').set('Authorization', bearer('parent'))).status).toBe(200);
  });

  it('has no routes for screens that were taken out', async () => {
    for (const path of ['/api/ledger', '/api/journal-entries', '/api/financial-reports/income-statement', '/api/refunds', '/api/families/x']) {
      const res = await request(app).get(path).set('Authorization', bearer('admin'));
      expect([path, res.status]).toEqual([path, 404]);
      expect(res.body.success).toBe(false);
    }
  });

  it('ignores MongoDB operators in input and treats search text literally', async () => {
    const injected = await request(app).get('/api/users?role[$ne]=nobody').set('Authorization', bearer('admin'));
    expect(injected.status).toBe(200);
    const all = await request(app).get('/api/users').set('Authorization', bearer('admin'));
    expect(injected.body.data.total).toBe(all.body.data.total);

    const bracket = await request(app).get('/api/students?search=(').set('Authorization', bearer('admin'));
    expect(bracket.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'password123' });
    expect(login.status).toBe(400);
  });

  it('lets the academic officer set up classes, and refuses deleting one in use', async () => {
    const created = await request(app).post('/api/classes').set('Authorization', bearer('academic_officer'))
      .send({ cl_no: 'SEC-1', cl_name: 'Security class', lev_no: made.level._id });
    expect(created.status).toBe(201);
    const classId = created.body.data._id;

    made.section = await Section.create({ name: 'A', class: classId });
    const blocked = await request(app).delete(`/api/classes/${classId}`).set('Authorization', bearer('academic_officer'));
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toMatch(/section/);
  });

  it('refuses attendance for a future date', async () => {
    const period = await Period.create({ per_no: 'SEC-P', per_name: 'P1', time_in: '08:00', time_out: '09:00', termId: new mongoose.Types.ObjectId() });
    const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const res = await request(app).post('/api/attendance').set('Authorization', bearer('admin'))
      .send({ periodId: period._id, att_date: future, attendance: [{ studentId: new mongoose.Types.ObjectId(), status: 'Present' }] });
    expect(res.status).toBe(400);
  });

  it('lists a student who was never enrolled under the current year, and gives them a login', async () => {
    const year = await Year.create({ y_no: 'SEC-Y', y_name: 'Security year' });
    made.year = year;
    const cls = await Class.create({ cl_no: 'SEC-2', cl_name: 'Security class 2', lev_no: made.level._id });
    const student = await Student.create({
      firstName: 'Sagal', lastName: 'Nur', admissionNumber: 'SEC-100', gender: 'Female', birthDate: new Date('2015-03-01'),
      classId: cls._id, phoneNumber: '0615551234', address: 'Hodan', parentName: 'Parent Nur', parentPhoneNumber: '0615550001',
    });

    const list = await request(app).get(`/api/students?yearId=${year._id}&limit=1000`).set('Authorization', bearer('admin'));
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain(String(student._id));

    // An address with an "s" in it (a regression: the email check once dropped "s").
    const account = await request(app).post(`/api/students/${student._id}/account`).set('Authorization', bearer('admin'))
      .send({ email: 'sec.student@test.com', password: 'password123' });
    expect(account.status).toBe(201);
  });

  it('does not serve student documents as public files', async () => {
    expect((await request(app).get('/uploads/student-documents/anything.pdf')).status).toBe(404);
  });

  it('reports database health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });
});
