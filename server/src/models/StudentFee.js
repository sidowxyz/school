import mongoose from 'mongoose';

const studentFeeSchema = new mongoose.Schema({
  student_fee_no: { type: String, required: true, unique: true },
  invoice_no: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentInvoice', required: true },
  payment_method_no: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
  paid_amount: { type: Number, required: true, min: 0 },
  acc_no: { type: String }, // Represents account number or reference
  // Absolute path to the generated PDF receipt (see generateFeeNumber /
  // the PDF step in studentFeeController.createStudentFee). Unset on
  // payments recorded before receipt generation existed.
  pdfPath: { type: String },
  registerBy: { type: String },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const StudentFee = mongoose.model('StudentFee', studentFeeSchema);
export default StudentFee;
