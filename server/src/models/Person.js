import mongoose from 'mongoose';

const personSchema = new mongoose.Schema({
  p_no: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String }
}, { timestamps: true });

const Person = mongoose.model('Person', personSchema);
export default Person;
