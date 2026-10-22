import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  cl_no: { type: String, required: true, unique: true },
  cl_name: { type: String, required: true },
  lev_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },

  // Position in the school's class hierarchy — Class 1 = 1, Class 2 = 2, and so
  // on. Promotion walks this sequence to work out the next class, so it must be
  // set for promotion to behave. When it is absent, promotionService falls back
  // to the leading number in cl_name/cl_no ("Grade 10" -> 10), which covers
  // existing records without a migration.
  promotion_order: {
    type: Number,
    min: [0, 'Promotion order cannot be negative']
  },

  // Overrides the sequence when a school's progression isn't a simple +1
  // (e.g. the last primary class feeding a differently-named secondary one).
  next_class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },

  // Marks the top of the school: students here graduate rather than promote.
  is_final_class: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Class = mongoose.model('Class', classSchema);
export default Class;
