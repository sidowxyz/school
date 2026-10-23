import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  cl_no: { type: String, required: true, unique: true },
  cl_name: { type: String, required: true },
  lev_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
}, { timestamps: true });

const Class = mongoose.model('Class', classSchema);
export default Class;
