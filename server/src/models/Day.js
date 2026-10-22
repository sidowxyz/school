import mongoose from 'mongoose';

const daySchema = new mongoose.Schema({
  dy_no: { type: String, required: true, unique: true },
  dy_name: { type: String, required: true }
}, { timestamps: true });

const Day = mongoose.model('Day', daySchema);
export default Day;
