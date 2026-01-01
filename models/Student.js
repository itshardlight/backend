import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  // Personal Information
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
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ["male", "female", "other"]
  },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },

  // Address Information
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },

  // Academic Information
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
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  admissionDate: {
    type: Date,
    required: true
  },
  previousSchool: {
    type: String,
    trim: true
  },

  // Parent/Guardian Information
  parentName: {
    type: String,
    required: true,
    trim: true
  },
  parentPhone: {
    type: String,
    required: true,
    trim: true
  },
  parentEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  emergencyContact: {
    type: String,
    required: true,
    trim: true
  },

  // Medical Information
  medicalConditions: {
    type: String,
    trim: true
  },

  // System Information
  status: {
    type: String,
    enum: ["active", "inactive", "suspended", "graduated"],
    default: "active"
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // Reference to User account (if student has login access)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, {
  timestamps: true
});

// Create compound index for class and section
studentSchema.index({ class: 1, section: 1 });

// Additional indexes for faster searches (unique indexes are already created above)
// studentSchema.index({ rollNumber: 1 }); // Already unique
// studentSchema.index({ email: 1 }); // Already unique

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for class-section display
studentSchema.virtual('classSection').get(function() {
  return `${this.class}-${this.section}`;
});

// Update lastUpdated before saving
studentSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Ensure virtuals are included in JSON output
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

export default mongoose.model("Student", studentSchema);