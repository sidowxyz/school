import connectDB from '../src/config/db.js';
import Exam from '../src/models/Exam.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  const exams = await Exam.find({ ex_name: /Monthly/i }).lean();
  console.log('MONTHLY_EXAMS_FOUND:', exams.length);
  for (const ex of exams) {
    console.log({
      _id: ex._id,
      ex_name: ex.ex_name,
      batch_id: ex.batch_id,
      class_id: ex.class_id
    });
  }
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
