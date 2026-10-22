import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  staffNo: {
    type: String,
    required: true,
    unique: true
  },
  stf_no: { type: String, unique: true, sparse: true },
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  specializationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Specialization',
    required: true
  },
  degreeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Degree',
    required: true
  },
  p_no:    { type: mongoose.Schema.Types.ObjectId, ref: 'People' },
  job_no:  { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  dep_no:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  role_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  sp_no:   { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization' },
  dec_no:  { type: mongoose.Schema.Types.ObjectId, ref: 'Degree' }
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;