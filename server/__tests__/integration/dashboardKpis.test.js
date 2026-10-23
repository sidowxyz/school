import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Level from '../../src/models/Level.js';
import Class from '../../src/models/Class.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

// The school-wide dashboard figures: who may read them, and what each role sees.
describe('School dashboard KPIs', () => {
  const tokens = {};
  const get = (as) => request(app).get('/api/v1/analytics/admin-kpis').set('Authorization', `Bearer ${tokens[as]}`);

  beforeAll(async () => {
    await Promise.all([User, Student, Level, Class].map((M) => M.deleteMany({})));
    for (const role of ['admin', 'principal', 'academic_officer', 'accountant', 'teacher']) {
      const u = await User.create({ firstName: 'KPI', lastName: role, email: `${role}@kpis.test`, password: 'password123', role });
      tokens[role] = generateAccessToken(u);
    }
    const level = await Level.create({ lev_no: 'KPI-L1', lev_name: 'Primary' });
    const grade = await Class.create({ cl_no: 'KPI-G1', cl_name: 'Grade 1', lev_no: level._id });
    await Student.create({
      classId: grade._id,
      firstName: 'Newest', lastName: 'Pupil', admissionNumber: 'KPI-1', gender: 'Female', birthDate: new Date('2015-01-01'),
      phoneNumber: '0610000000', address: 'Test', parentName: 'Parent Pupil', parentPhoneNumber: '0619999999',
    });
  }, 60000);

  it('gives the admin the newest students and this week\'s new arrivals', async () => {
    const res = await get('admin');
    expect(res.status).toBe(200);
    expect(res.body.data.recentStudents[0]).toMatchObject({ name: 'Newest Pupil', admissionNumber: 'KPI-1', status: 'Active' });
    expect(res.body.data.newThisWeek.students).toBe(1);
    expect(res.body.data.feeCollectionSummary).not.toBeNull();
  });

  it('lets the principal read them, fee totals included', async () => {
    const res = await get('principal');
    expect(res.status).toBe(200);
    expect(res.body.data.feeCollectionSummary).not.toBeNull();
  });

  it('lets the academic officer read them, without fee totals', async () => {
    const res = await get('academic_officer');
    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalStudents).toBe(1);
    expect(res.body.data.feeCollectionSummary).toBeNull();
  });

  it('refuses the teacher and the accountant', async () => {
    expect((await get('teacher')).status).toBe(403);
    expect((await get('accountant')).status).toBe(403);
  });
});
