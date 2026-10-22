import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/server.js';
import User from '../../src/models/User.js';

// SMS-T-401 — User & role management + account deactivation enforcement.
const signToken = (id, role) =>
  jwt.sign({ id, role, name: `${role}-user` }, process.env.JWT_ACCESS_SECRET);

describe('User management & deactivation', () => {
  let adminId, targetId;
  const emails = ['um.admin@test.com', 'um.target@test.com'];

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.
    await User.deleteMany({ email: { $in: emails } });
    const [admin, target] = await User.create([
      { firstName: 'Um', lastName: 'Admin', email: emails[0], password: 'password123', role: 'admin' },
      { firstName: 'Um', lastName: 'Target', email: emails[1], password: 'password123', role: 'student' }
    ]);
    adminId = admin._id.toString();
    targetId = target._id.toString();
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({ email: { $in: emails } });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  const asAdmin = () => `Bearer ${signToken(adminId, 'admin')}`;

  describe('Authorization', () => {
    it('lists users for an admin, never exposing password hashes', async () => {
      const res = await request(app).get('/api/users').set('Authorization', asAdmin());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      for (const u of res.body.data.users) {
        expect(u).not.toHaveProperty('password');
        expect(u).not.toHaveProperty('refreshToken');
      }
    });

    it('rejects a non-admin with 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${signToken(targetId, 'student')}`);
      expect(res.status).toBe(403);
    });

    it('rejects an unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('Role management', () => {
    it('changes a user role', async () => {
      const res = await request(app)
        .patch(`/api/users/${targetId}/role`)
        .set('Authorization', asAdmin())
        .send({ role: 'teacher' });
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('teacher');
      const reloaded = await User.findById(targetId);
      expect(reloaded.role).toBe('teacher');
    });

    it('rejects an invalid role with 400', async () => {
      const res = await request(app)
        .patch(`/api/users/${targetId}/role`)
        .set('Authorization', asAdmin())
        .send({ role: 'superuser' });
      expect(res.status).toBe(400);
    });
  });

  describe('Deactivation enforcement', () => {
    it('a deactivated user is rejected by authenticate even with a valid token', async () => {
      // Token minted while active.
      const token = signToken(targetId, 'teacher');
      await request(app)
        .patch(`/api/users/${targetId}/status`)
        .set('Authorization', asAdmin())
        .send({ status: false })
        .expect(200);

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('a deactivated user cannot log in (403)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: emails[1], password: 'password123' });
      expect(res.status).toBe(403);
    });

    it('reactivating restores access', async () => {
      await request(app)
        .patch(`/api/users/${targetId}/status`)
        .set('Authorization', asAdmin())
        .send({ status: true })
        .expect(200);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: emails[1], password: 'password123' });
      expect(res.status).toBe(200);
    });

    it('an admin cannot deactivate their own account (400)', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminId}/status`)
        .set('Authorization', asAdmin())
        .send({ status: false });
      expect(res.status).toBe(400);
    });
  });
});
