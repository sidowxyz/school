import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      branch: { type: String },
    },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export default mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
