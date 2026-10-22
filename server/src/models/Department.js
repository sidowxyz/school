import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  dep_no: { type: String, required: true, unique: true },
  dep_name: { type: String, required: true }
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
