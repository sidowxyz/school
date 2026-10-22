import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  job_no: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  salary: { type: Number, required: true }
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);
export default Job;
