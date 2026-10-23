import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    admissionNumber: {
      type: String,
      required: true,
      unique: true
    },

    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: true
    },

    birthDate: {
      type: Date,
      required: true
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },

    // Optional: not every school streams its classes into sections, and a
    // student in a section-less class must still be a valid record.
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    parentName: {
      type: String,
      required: true,
      trim: true
    },

    parentPhoneNumber: {
      type: String,
      required: true,
      trim: true
    },

    photoUrl: {
      type: String,
      default: null
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'Graduated'],
      default: 'Active'
    },

    admissionType: {
      type: String,
      enum: ['Regular', 'Transfer'],
      default: 'Regular'
    },

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    },

    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      default: null
    },

    // Standing discount on this student's monthly fee, applied each time the
    // month is charged (on top of any sibling or scholarship discount).
    fee_discount: {
      kind: { type: String, enum: ['percent', 'amount'] },
      value: { type: Number, min: 0 },
      reason: { type: String, trim: true }
    },

    bloodGroup: {
      type: String,
      default: null
    },

    city: {
      type: String,
      default: null
    },

    country: {
      type: String,
      default: null
    },

    emergencyContactName: {
      type: String,
      default: null
    },

    emergencyContactPhone: {
      type: String,
      default: null
    },

    previousSchool: {
      type: String,
      default: null
    },

    house: {
      type: String,
      default: null
    },

    guardians: [
      {
        guardianId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Guardian',
          required: true
        },
        isPrimary: {
          type: Boolean,
          default: false
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// A student may be linked to at most one guardian — "one parent per student" is
// enforced here as a last line of defense, in addition to assignGuardianToStudent
// (familyService.js) always replacing rather than appending.
studentSchema.pre('validate', function (next) {
  if (this.guardians && this.guardians.length > 1) {
    return next(new Error('A student may only have one assigned guardian.'));
  }
  next();
});

studentSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

studentSchema.virtual('section', {
  ref: 'Section',
  localField: 'sectionId',
  foreignField: '_id',
  justOne: true
});

studentSchema.virtual('admission_no')
  .get(function() {
    return this.admissionNumber;
  })
  .set(function(val) {
    this.admissionNumber = val;
  });

// Text Search
studentSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  admissionNumber: 'text'
});

// Unique email (only for active students)
studentSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
      email: { $type: 'string' }
    }
  }
);

const Student = mongoose.model('Student', studentSchema);

export default Student;
