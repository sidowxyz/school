import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

// Role checks on /api/students. authorize() runs before any controller, so a
// rejected request never touches the database and a placeholder id is enough.
describe('Student routes RBAC', () => {
  const tokens = {};
  const fakeId = new mongoose.Types.ObjectId().toString();
  const roles = ['student', 'parent', 'teacher', 'accountant', 'principal'];

  beforeAll(async () => {
    // Connection is established by jest.setup.js against the isolated test DB.
    await User.deleteMany({ email: /@student-rbac\.test$/ });
    for (const role of roles) {
      const user = await User.create({
        firstName: 'Rbac',
        lastName: role,
        email: `${role}@student-rbac.test`,
        password: 'password123',
        role,
        status: true,
      });
      tokens[role] = generateAccessToken(user);
    }
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ email: /@student-rbac\.test$/ });
  }, 30000);

  const writes = [
    ['post', '/api/students'],
    ['post', '/api/students/bulk-import'],
    ['put', `/api/students/${fakeId}`],
    ['delete', `/api/students/${fakeId}`],
    ['post', `/api/students/${fakeId}/status`],
    ['post', `/api/students/${fakeId}/photo`],
  ];

  const reads = [
    ['get', '/api/students'],
    ['get', '/api/students/references/all'],
    ['get', `/api/students/${fakeId}`],
  ];

  describe.each(['student', 'parent'])('%s', (role) => {
    it.each([...reads, ...writes])('is rejected from %s %s with 403', async (method, url) => {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${tokens[role]}`);
      expect(res.statusCode).toBe(403);
    }, 15000);
  });

  describe.each(['teacher', 'accountant'])('%s', (role) => {
    it.each(writes)('is rejected from %s %s with 403', async (method, url) => {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${tokens[role]}`);
      expect(res.statusCode).toBe(403);
    }, 15000);

    it('can list students', async () => {
      const res = await request(app).get('/api/students').set('Authorization', `Bearer ${tokens[role]}`);
      expect(res.statusCode).toBe(200);
    }, 15000);
  });

  it('principal passes the role check on writes', async () => {
    // An empty body fails validation (400), which proves authorize() let it through.
    const res = await request(app).post('/api/students').set('Authorization', `Bearer ${tokens.principal}`).send({});
    expect(res.statusCode).not.toBe(403);
  }, 15000);

  it('still requires a token', async () => {
    const res = await request(app).get('/api/students');
    expect(res.statusCode).toBe(401);
  }, 15000);
});
