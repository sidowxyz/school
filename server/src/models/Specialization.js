import mongoose from 'mongoose';

const specializationSchema = new mongoose.Schema({
  sp_no: { type: String, required: true, unique: true },
  sp_name: { type: String, required: true }
}, { timestamps: true });

const Specialization = mongoose.model('Specialization', specializationSchema);
export default Specialization;
