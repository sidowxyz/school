import request from 'supertest';
import connectDB from '../../../server/src/config/db.js';
import app from '../../../server/src/server.js';
import User from '../../../server/src/models/User.js';

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
  await connectDB();

  // Ensure a test admin user exists
  const email = 'test-admin@example.com';
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ firstName: 'Test', lastName: 'Admin', email, password: 'admin', role: 'admin', status: true });
  } else {
    user.password = 'admin';
    user.role = 'admin';
    user.status = true;
    await user.save();
  }
});

afterAll(async () => {
  // Do not drop database here — CI can manage test DB lifecycle.
});

describe('Finance endpoints (integration)', () => {
  let token;

  test('login and fetch finance endpoints', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'test-admin@example.com', password: 'admin' });
    expect(login.status).toBe(200);
    token = login.body.data.accessToken || login.body.data.token;
    expect(token).toBeDefined();

    const endpoints = [
      '/api/chart-of-accounts',
      '/api/ledger',
      '/api/ledger/summary',
      '/api/ledger/trial-balance',
      '/api/journal-entries',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep).set('Authorization', `Bearer ${token}`);
      expect([200,201]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
    }
  }, 20000);
});
