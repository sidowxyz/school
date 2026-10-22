import connectDB from '../src/config/db.js';
import Exam from '../src/models/Exam.js';
import Subject from '../src/models/Subject.js';
import Class from '../src/models/Class.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  const exams = await Exam.find().populate('subject_id class_id').lean();
  console.log('EXAM_COUNT:', exams.length);
  for (const ex of exams) {
    console.log({
      id: ex._id,
      name: ex.ex_name,
      subject_id: ex.subject_id?._id || ex.subject_id,
      subject_name: ex.subject_id?.sub_name,
      class_name: ex.class_id?.cl_name
    });
  }
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
