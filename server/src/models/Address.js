import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  add_no: { type: String, required: true, unique: true },
  street: { type: String },
  city: { type: String, required: true },
  state: { type: String },
  country: { type: String, required: true }
}, { timestamps: true });

const Address = mongoose.model('Address', addressSchema);
export default Address;
