import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
  st_no: { type: String, required: true, unique: true },
  st_name: { type: String, required: true }
}, { timestamps: true });

const Status = mongoose.model('Status', statusSchema);
export default Status;
