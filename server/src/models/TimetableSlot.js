import mongoose from 'mongoose';

const timetableSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    required: [true, 'Maalintu waa qasab'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  timePeriod: {
    type: String, 
    required: [true, 'Waqtiga xiisaddu waa qasab'],
    // Tusaale: "08:00 - 09:00", "09:00 - 10:00"
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Maadaama macallimiintu ay ku jiraan User model
    required: [true, 'Macallinku waa qasab']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class', // Fasalka loo dhigayo xiisadda
    required: [true, 'Fasalku waa qasab']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject', // Maaddada la dhigayo
    required: [true, 'Maaddadu waa qasab']
  },
  room: {
    type: String,
    required: [true, 'Qolka/Fasalka jidheed waa qasab'],
    trim: true
  }
}, {
  timestamps: true
});

const TimetableSlot = mongoose.model('TimetableSlot', timetableSlotSchema);
export default TimetableSlot;