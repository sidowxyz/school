import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/server.js';
import User from '../../src/models/User.js';

// SMS-T-102 — Auth API Unit & Integration Tests
describe('Auth API Integration Tests', () => {
  const validUser = {
    firstName: 'Amina',
    lastName: 'Yusuf',
    email: 'amina.auth@test.com',
    password: 'SecurePass123',
  };

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({ email: validUser.email });
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ email: validUser.email });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  // Accounts are created by staff; there is no public sign-up.
  const registerUser = () => User.create({ ...validUser, role: 'student' });

  it('has no public sign-up or email reset endpoints', async () => {
    expect((await request(app).post('/api/auth/register').send(validUser)).status).toBe(404);
    expect((await request(app).post('/api/auth/forgot-password').send({ email: validUser.email })).status).toBe(404);
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => { await registerUser(); });

    it('logs in with correct credentials and returns access + refresh tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.role).toBe('student');
    });

    it('rejects a wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'WrongPass123' });
      expect(res.status).toBe(401);
    });

    it('rejects an unknown email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: validUser.password });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a fresh access token from a valid refresh token', async () => {
      await registerUser();
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
      const { refreshToken } = login.body.data;

      const res = await request(app).post('/api/auth/refresh').send({ token: refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      // The used token is replaced by a new one and can't be used again.
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
      expect((await request(app).post('/api/auth/refresh').send({ token: refreshToken })).status).toBe(403);
      expect((await request(app).post('/api/auth/refresh').send({ token: res.body.data.refreshToken })).status).toBe(200);
    });

    it('keeps two devices signed in at once', async () => {
      await registerUser();
      const creds = { email: validUser.email, password: validUser.password };
      const phone = await request(app).post('/api/auth/login').send(creds);
      const laptop = await request(app).post('/api/auth/login').send(creds);
      expect((await request(app).post('/api/auth/refresh').send({ token: phone.body.data.refreshToken })).status).toBe(200);
      expect((await request(app).post('/api/auth/refresh').send({ token: laptop.body.data.refreshToken })).status).toBe(200);
    });

    it('rejects a missing refresh token with 401', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('Protected route GET /api/auth/me', () => {
    it('rejects access without a token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('grants access with a valid access token', async () => {
      await registerUser();
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
      const { accessToken } = login.body.data;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });
});
