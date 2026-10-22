import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  staffId: {
    type: String,
    required: true,
    unique: true,
  },
  department: {
    type: String,
  },
  qualifications: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
  },
  phone: {
    type: String,
  },
  experience: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Query middleware to hide soft-deleted records
teacherSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;
