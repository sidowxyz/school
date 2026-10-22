import mongoose from 'mongoose';

const studentDocumentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  name: { type: String, required: true },
  fileType: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Verified'], default: 'Pending' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

const StudentDocument = mongoose.model('StudentDocument', studentDocumentSchema);
export default StudentDocument;
