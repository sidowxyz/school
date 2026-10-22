import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema({
  lev_no: { type: String, required: true, unique: true },
  lev_name: { type: String, required: true },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const Level = mongoose.model('Level', levelSchema);
export default Level;
