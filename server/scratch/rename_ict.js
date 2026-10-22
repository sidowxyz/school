import connectDB from '../src/config/db.js';
import Subject from '../src/models/Subject.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  await Subject.updateMany(
    { $or: [{ sub_name: 'ICT' }, { sub_no: 'SUB11' }] },
    { $set: { sub_name: 'Technology' } }
  );
  console.log('SUBJECT_RENAMED_SUCCESSFULLY');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
