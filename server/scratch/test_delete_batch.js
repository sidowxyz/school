import request from 'supertest';
import app from '../src/server.js';
import User from '../src/models/User.js';
import { generateAccessToken } from '../src/utils/tokenService.js';
import connectDB from '../src/config/db.js';

const run = async () => {
  await connectDB();
  const admin = await User.findOne({ role: 'admin' });
  const token = generateAccessToken(admin);

  console.log('Sending DELETE request for batch BATCH-1786724454898...');
  const res = await request(app)
    .delete('/api/exams/batch/BATCH-1786724454898')
    .set('Authorization', `Bearer ${token}`);

  console.log('STATUS:', res.status);
  console.log('BODY:', res.body);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
