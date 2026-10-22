import mongoose from 'mongoose';

const degreeSchema = new mongoose.Schema({
  dec_no: { type: String, required: true, unique: true },
  dec_name: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

const Degree = mongoose.model('Degree', degreeSchema);
export default Degree;
