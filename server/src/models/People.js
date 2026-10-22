import mongoose from 'mongoose';

const peopleSchema = new mongoose.Schema({
  p_no: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  tell: { type: String, required: true },
  sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true }
}, { timestamps: true });

const People = mongoose.model('People', peopleSchema);
export default People;
