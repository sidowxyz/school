import mongoose from 'mongoose';

const yearSchema = new mongoose.Schema({
  y_no: { type: String, required: true, unique: true },
  y_name: { type: String, required: true }
}, { timestamps: true });

const Year = mongoose.model('Year', yearSchema);
export default Year;
// Student management module - Gabaxey