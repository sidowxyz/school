import mongoose from 'mongoose';

const residenceSchema = new mongoose.Schema({
  res_no: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  details: { type: String }
}, { timestamps: true });

const Residence = mongoose.model('Residence', residenceSchema);
export default Residence;
