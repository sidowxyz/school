import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  description: { type: String, trim: true, default: '' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'Year' }
});

const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  description: { type: String, trim: true, default: '' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'Year' }
});

const systemSettingSchema = new mongoose.Schema({
  // Profile Settings
  schoolName: { type: String, required: true, default: "Horn of Africa Academy" },
  schoolCode: { type: String, default: "" },
  schoolEmail: { type: String, required: true, default: "info@school.edu" },
  schoolPhone: { type: String, default: "+25261XXXXXXX" },
  address: { type: String, default: "Mogadishu, Somalia" },
  website: { type: String, default: "" },
  principalName: { type: String, default: "" },
  timezone: { type: String, default: "Africa/Mogadishu" },
  language: { type: String, enum: ['English', 'Somali'], default: "English" },

  // Logo & Branding Storage (Kaydinta Linkiga ama Path-ka faylka)
  logoUrl: { type: String, default: "/uploads/branding/logo.png" },
  brandingColors: {
    primary: { type: String, default: "#1E3A8A" },
    secondary: { type: String, default: "#10B981" }
  },

  // Finance Policy (Discount Rules)
  discountRule: { 
    type: String, 
    required: true, 
    enum: ['highest_only', 'combined'], 
    default: 'highest_only' 
  },

  // Academic Calendar & Global Options
  academicYear: { type: String, required: true, default: "2026-2027" },
  activeSemester: { type: String, required: true, default: "Semester 1" },
  holidays: [holidaySchema],
  calendarEvents: [calendarEventSchema]
  
}, { timestamps: true });

export default mongoose.model('SystemSetting', systemSettingSchema);
