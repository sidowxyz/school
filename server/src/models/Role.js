import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  role_no: { type: String, required: true, unique: true },
  role_name: { type: String, required: true }
}, { timestamps: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;
