import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.index({ year: 1 }, { unique: true });

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
