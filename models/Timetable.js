import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
  // Class Information
  class: {
    type: String,
    required: true,
    enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  },
  section: {
    type: String,
    required: true,
    enum: ["A", "B", "C"]
  },
  
  // Schedule Information
  dayOfWeek: {
    type: String,
    required: true,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  },
  period: {
    type: String,
    required: true,
    enum: ["1", "2", "3", "4", "5", "6", "7", "8"]
  },
  
  // Subject Information
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  // Teacher Information
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Time Information
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  
  // Optional Information
  room: {
    type: String,
    trim: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
timetableSchema.index({ class: 1, section: 1, dayOfWeek: 1, period: 1 }, { unique: true });
timetableSchema.index({ teacherId: 1, dayOfWeek: 1, period: 1 });

const Timetable = mongoose.model("Timetable", timetableSchema);

export default Timetable;