import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../src/config/db.js';
import { getTeachers } from '../src/controllers/teacherController.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const run = async () => {
  await connectDB();
  const req = { query: {} };
  const res = {
    status: (code) => {
      console.log('STATUS:', code);
      return res;
    },
    json: (data) => {
      console.log('JSON DATA RETRIEVED SUCCESSFULLY');
      console.log(data);
    }
  };
  const next = (err) => {
    console.error('CRITICAL CONTROLLER ERROR:', err);
  };
  try {
    await getTeachers(req, res, next);
  } catch (err) {
    console.error('UNCAUGHT CONTROLLER EXCEPTION:', err);
  }
  process.exit(0);
};

run().catch(console.error);
